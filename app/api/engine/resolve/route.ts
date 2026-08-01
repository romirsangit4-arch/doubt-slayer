import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildEnginePreamble } from "@/lib/exam-prompts";
import { parseTargetExam } from "@/lib/exams";

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      solutionContext,
      assessmentLog,
      reconstructionResults,
      customApiKey,
      targetExam: rawExam,
    } = await req.json();
    const targetExam = parseTargetExam(rawExam);
    const examPreamble = buildEnginePreamble(targetExam);

    if (!sessionId || !solutionContext || !assessmentLog) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, solutionContext, or assessmentLog" },
        { status: 400 }
      );
    }

    const client = getGeminiClient("resolve_flash", customApiKey);

    // Build a comprehensive session summary for the LLM
    const totalDiagnosticQuestions = assessmentLog.length;
    const correctAnswers = assessmentLog.filter((e: any) => e.correct).length;
    const incorrectAnswers = totalDiagnosticQuestions - correctAnswers;

    const totalReconstructionSteps = (reconstructionResults || []).length;
    const completedSteps = (reconstructionResults || []).filter(
      (r: any) => r.completed
    ).length;
    const totalHintsUsed = (reconstructionResults || []).reduce(
      (sum: number, r: any) => sum + (r.hints_used || 0),
      0
    );

    // Detect if student abandoned mid-session
    const lastReconstructionStep = reconstructionResults?.[reconstructionResults.length - 1];
    const possibleAbandonment =
      totalReconstructionSteps > 0 &&
      totalReconstructionSteps < (solutionContext.steps?.length || 0) &&
      !lastReconstructionStep?.completed
        ? `step_${lastReconstructionStep?.step_number}`
        : null;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${examPreamble}

You are a tutoring engine in the RESOLUTION phase. Analyze the complete tutoring session and generate a comprehensive coverage report.

SESSION ID: ${sessionId}

ORIGINAL PROBLEM CONTEXT:
- Subject: ${solutionContext.subject}
- Topic: ${solutionContext.topic}
- Concepts involved: ${JSON.stringify(solutionContext.concepts_involved)}
- Difficulty: ${solutionContext.difficulty_estimate}
- Total solution steps: ${solutionContext.steps?.length || 0}

DIAGNOSIS PHASE RESULTS:
- Total diagnostic questions: ${totalDiagnosticQuestions}
- Correct answers: ${correctAnswers}
- Incorrect answers: ${incorrectAnswers}
- Detailed log: ${JSON.stringify(assessmentLog)}

RECONSTRUCTION PHASE RESULTS:
- Steps attempted: ${totalReconstructionSteps}
- Steps completed: ${completedSteps}
- Total hints used: ${totalHintsUsed}
- Detailed results: ${JSON.stringify(reconstructionResults || [])}
- Possible abandonment point: ${possibleAbandonment || "none"}

Generate a SessionCoverage object:
1. session_id: Use "${sessionId}"
2. subjects_covered: List of subjects engaged in this session
3. topics_covered: For each topic, calculate coverage_pct (0-100) and list concepts_engaged with their status:
   - "mastered": Student answered diagnostic correctly AND completed reconstruction step without hints
   - "repaired": Student initially failed diagnostic but successfully completed reconstruction (with or without hints)
   - "weak": Student failed diagnostic and either didn't complete reconstruction or needed all 3 hints
   - mastery_delta: Estimated change in mastery (-1.0 to +1.0) based on performance
4. session_quality: Overall score 0-100 considering diagnostic accuracy, reconstruction success, hint usage
5. abandonment_point: null if completed, or the step identifier where student stopped

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
            session_id: { type: Type.STRING },
            subjects_covered: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            topics_covered: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic_id: { type: Type.STRING },
                  coverage_pct: { type: Type.NUMBER },
                  concepts_engaged: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        concept_id: { type: Type.STRING },
                        status: {
                          type: Type.STRING,
                          enum: ["repaired", "weak", "mastered"],
                        },
                        mastery_delta: { type: Type.NUMBER },
                      },
                      required: ["concept_id", "status", "mastery_delta"],
                    },
                  },
                },
                required: ["topic_id", "coverage_pct", "concepts_engaged"],
              },
            },
            session_quality: { type: Type.NUMBER },
            abandonment_point: { type: Type.STRING, nullable: true },
          },
          required: [
            "session_id",
            "subjects_covered",
            "topics_covered",
            "session_quality",
            "abandonment_point",
          ],
        },
        temperature: 0.1,
      },
    });

    const sessionCoverage = JSON.parse(response.text || "{}");

    return NextResponse.json({
      phase: "RESOLUTION",
      sessionCoverage,
    });
  } catch (error: any) {
    console.error("Resolution Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
