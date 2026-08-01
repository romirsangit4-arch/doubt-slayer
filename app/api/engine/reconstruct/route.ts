import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildEnginePreamble } from "@/lib/exam-prompts";
import { parseTargetExam } from "@/lib/exams";

export async function POST(req: NextRequest) {
  try {
    const {
      solutionContext,
      assessmentLog,
      microExampleResults,
      customApiKey,
      sessionId,
      targetExam: rawExam,
    } = await req.json();
    const targetExam = parseTargetExam(rawExam);
    const examPreamble = buildEnginePreamble(targetExam);

    if (!solutionContext || !assessmentLog) {
      return NextResponse.json(
        { error: "Missing solutionContext or assessmentLog" },
        { status: 400 }
      );
    }

    const client = getGeminiClient("reconstruct_pro", customApiKey);

    // Summarize which concepts the student is still weak on vs repaired
    const weakConcepts = assessmentLog
      .filter((e: any) => !e.correct)
      .map((e: any) => e.concept_id);

    const repairedConcepts = (microExampleResults || [])
      .filter((r: any) => r.solved)
      .map((r: any) => r.concept_id);

    const stillWeakConcepts = weakConcepts.filter(
      (c: string) => !repairedConcepts.includes(c)
    );

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${examPreamble}

You are a tutoring engine in the RECONSTRUCTION phase. You must guide the student to reconstruct the original solution step by step using Socratic questioning.

ORIGINAL PROBLEM: ${solutionContext.problem_text}

ORIGINAL SOLUTION STEPS:
${JSON.stringify(solutionContext.steps, null, 2)}

STUDENT WEAKNESS PROFILE:
- Concepts still weak (failed repair): ${JSON.stringify([...new Set(stillWeakConcepts)])}
- Concepts repaired (passed micro-examples): ${JSON.stringify(repairedConcepts)}
- All concepts in problem: ${JSON.stringify(solutionContext.concepts_involved)}

For EACH step in the original solution, generate:
1. A Socratic question that guides the student to derive that step themselves (don't give away the answer)
2. The expected answer type (e.g., "equation", "numerical value", "concept explanation", "formula identification")
3. Three levels of hints:
   - hint_level_1: Conceptual nudge (which principle to think about)
   - hint_level_2: Specific guidance (which formula or method to apply)
   - hint_level_3: Almost complete answer (fill-in-the-blank style)
4. A retreat_concept_id: if the student fails all hints, which concept to retreat to for further repair
5. The solution_line: the actual answer for that step

Also include adaptive_rules with max_hints_per_step=3 and retreat_after_hints=true.

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
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step_number: { type: Type.INTEGER },
                  question_to_student: { type: Type.STRING },
                  expected_answer_type: { type: Type.STRING },
                  hint_level_1: { type: Type.STRING },
                  hint_level_2: { type: Type.STRING },
                  hint_level_3: { type: Type.STRING },
                  retreat_concept_id: { type: Type.STRING },
                  solution_line: { type: Type.STRING },
                },
                required: [
                  "step_number",
                  "question_to_student",
                  "expected_answer_type",
                  "hint_level_1",
                  "hint_level_2",
                  "hint_level_3",
                  "retreat_concept_id",
                  "solution_line",
                ],
              },
            },
            adaptive_rules: {
              type: Type.OBJECT,
              properties: {
                max_hints_per_step: { type: Type.INTEGER },
                retreat_after_hints: { type: Type.BOOLEAN },
              },
              required: ["max_hints_per_step", "retreat_after_hints"],
            },
          },
          required: ["steps", "adaptive_rules"],
        },
        temperature: 0.1,
      },
    });

    const reconstructionScaffold = JSON.parse(response.text || "{}");

    return NextResponse.json({
      phase: "RECONSTRUCTION",
      reconstructionScaffold,
    });
  } catch (error: any) {
    console.error("Reconstruction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
