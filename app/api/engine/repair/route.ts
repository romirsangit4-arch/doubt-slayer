import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildEnginePreamble } from "@/lib/exam-prompts";
import { parseTargetExam } from "@/lib/exams";

export async function POST(req: NextRequest) {
  try {
    const { assessmentLog, customApiKey, sessionId, targetExam: rawExam } = await req.json();
    const targetExam = parseTargetExam(rawExam);
    const examPreamble = buildEnginePreamble(targetExam);

    if (!assessmentLog || !Array.isArray(assessmentLog)) {
      return NextResponse.json(
        { error: "No assessmentLog provided" },
        { status: 400 }
      );
    }

    // Extract unique weak concept_ids where correct === false
    const weakConceptIds = [
      ...new Set(
        assessmentLog
          .filter((entry: any) => entry.correct === false)
          .map((entry: any) => entry.concept_id as string)
      ),
    ];

    if (weakConceptIds.length === 0) {
      return NextResponse.json({
        phase: "REPAIR",
        microExampleSet: { examples: [] },
      });
    }

    const client = getGeminiClient("repair_flash", customApiKey);

    // Build a summary of what the student got wrong for context
    const weakSummary = weakConceptIds
      .map((id) => {
        const entries = assessmentLog.filter(
          (e: any) => e.concept_id === id && !e.correct
        );
        return `- Concept "${id}": missed ${entries.length} question(s). Example wrong answer: "${entries[0]?.student_answer}"`;
      })
      .join("\n");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${examPreamble}

You are a tutoring engine in the REPAIR phase. The student has demonstrated weakness in the following concepts:

${weakSummary}

Weak concept IDs: ${JSON.stringify(weakConceptIds)}

For EACH weak concept, generate exactly ONE micro-example that:
1. Presents a simple, focused practice problem targeting that specific concept (appropriate difficulty for the target exam)
2. Includes a complete hidden solution
3. Provides exactly 3 progressive hints:
   - Hint 1: A gentle nudge (e.g., "Think about what formula relates...")
   - Hint 2: A more specific pointer (e.g., "Apply Newton's second law here...")
   - Hint 3: Nearly gives away the answer (e.g., "Substitute F=ma where m=5kg...")

Output EXACTLY matching the required JSON schema.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  concept_id: { type: Type.STRING },
                  problem_text: { type: Type.STRING },
                  hidden_solution: { type: Type.STRING },
                  hints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  "concept_id",
                  "problem_text",
                  "hidden_solution",
                  "hints",
                ],
              },
            },
          },
          required: ["examples"],
        },
        temperature: 0.1,
      },
    });

    const microExampleSet = JSON.parse(response.text || "{}");

    return NextResponse.json({
      phase: "REPAIR",
      microExampleSet,
    });
  } catch (error: any) {
    console.error("Repair Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
