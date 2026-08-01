import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildEnginePreamble } from "@/lib/exam-prompts";
import { parseTargetExam } from "@/lib/exams";
import * as fs from 'fs';
import * as path from 'path';

const taxonomyPath = path.join(process.cwd(), 'data', 'jee_taxonomy.json');
const taxonomyJson = fs.readFileSync(taxonomyPath, 'utf-8');

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, customApiKey, sessionId, targetExam: rawExam } = await req.json();
    const targetExam = parseTargetExam(rawExam);
    const examPreamble = buildEnginePreamble(targetExam);

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const proClient = getGeminiClient("ingest_pro", customApiKey);
    const flashClient = getGeminiClient("ingest_flash", customApiKey);

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    };

    // Parallel Call A: Gemini Pro - The Architect
    const architectPromise = proClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${examPreamble}

You are the Architect. Parse the following physics/math problem image. 
Generate a complete, step-by-step solution. Tag each step with concept_ids from the standard JEE taxonomy.
Identify the primary subject, topic, and all concepts involved.
Output EXACTLY matching the required JSON schema.`,
            },
            imagePart,
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problem_text: { type: Type.STRING },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step_number: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  concept_id: { type: Type.STRING },
                  solution_line: { type: Type.STRING },
                },
                required: ["step_number", "description", "concept_id", "solution_line"],
              },
            },
            concepts_involved: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            difficulty_estimate: { type: Type.NUMBER },
          },
          required: ["problem_text", "subject", "topic", "steps", "concepts_involved", "difficulty_estimate"],
        },
        temperature: 0.1,
      },
    });

    // Parallel Call B: Gemini Flash - The Interrogator
    const interrogatorPromise = flashClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${examPreamble}

You are the Interrogator. Analyze the physics/math problem image against this taxonomy subset:
${taxonomyJson}

Identify the critical concepts required to solve it (max top 5). 
For each concept, generate exactly 2 fundamental diagnostic questions.
For each concept, identify its most critical prerequisite.
Generate a recommended_order for questioning.
Output EXACTLY matching the required JSON schema.`,
            },
            imagePart,
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  concept_id: { type: Type.STRING },
                  relevance: { type: Type.NUMBER },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question_text: { type: Type.STRING },
                        expected_answer: { type: Type.STRING },
                        evaluation_type: { type: Type.STRING },
                        follow_up_if_wrong: { type: Type.STRING },
                      },
                      required: ["question_text", "expected_answer", "evaluation_type"],
                    },
                  },
                },
                required: ["concept_id", "relevance", "questions"],
              },
            },
            prerequisites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  concept_id: { type: Type.STRING },
                  parent_concept_id: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question_text: { type: Type.STRING },
                        expected_answer: { type: Type.STRING },
                        evaluation_type: { type: Type.STRING },
                        follow_up_if_wrong: { type: Type.STRING },
                      },
                      required: ["question_text", "expected_answer", "evaluation_type"],
                    },
                  },
                },
                required: ["concept_id", "parent_concept_id", "questions"],
              },
            },
            recommended_order: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["concepts", "prerequisites", "recommended_order"],
        },
        temperature: 0.1,
      },
    });

    // Wait for both to complete
    const [architectRes, interrogatorRes] = await Promise.all([architectPromise, interrogatorPromise]);

    const solutionContext = JSON.parse(architectRes.text || "{}");
    const diagnosticBattery = JSON.parse(interrogatorRes.text || "{}");

    // In a real app, we'd write this to Firestore here
    // e.g. await db.collection("sessions").doc(sessionId).set({ phase: 'DIAGNOSIS', solutionContext, diagnosticBattery })

    return NextResponse.json({
      phase: "DIAGNOSIS",
      solutionContext,
      diagnosticBattery,
    });

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
