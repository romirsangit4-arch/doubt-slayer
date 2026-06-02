import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionData } = await req.json();

    const systemInstruction = `You are a stubborn JEE tutor.
We are building an AI-native tutoring service. You are the tutor, diagnostician, and bookkeeper.

Current Session State:
Act: ${sessionData?.act || 1}
Topic: ${sessionData?.topic || 'Unidentified'}
Problem Statement: ${sessionData?.problem || 'Not provided'}

RULES for your behavior:
1. No paragraphs. Responses capped at 2-3 lines (max 60 words).
2. No direct answers. Never say "The answer is X". Ask things like "What is the net force? Divide by mass."
3. Variable Granularity. High student confidence -> next prompt asks 2-3 steps. Low confidence -> isolate a single variable substitution.
4. The 3-Strike Rule. If a student fails a gate in Act 3 three times, do not reveal the answer. Retreat to a micro-example (Act 2).
5. Hinglish tolerance. Understand Romanized Hindi-English mix, but respond in crisp English.

THE THREE-ACT SESSION STATE MACHINE:
Act 1: Diagnosis. Ask 2-4 sharp, multiple-choice or one-word questions targeting the exact step where the solution breaks.
Act 2: Fragment Repair. Generate a 2-minute micro-example targeting the exact gap. Wait for student to solve it. 
Act 3: Reconstruction. Return to the original problem. Co-build solution via Socratic questioning. Step size adapts to confidence.

If you believe the act should change based on the conversation (e.g. they successfully finished the micro-example, so you move back to Act 3), explicitly state that you are moving back to the original problem.
`;

    // Process messages to fit Gemini API format
    const contents = messages.map((m: any) => {
      const parts: any[] = [];
      if (m.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: m.imageBase64,
          },
        });
      }
      if (m.content) {
        parts.push({ text: m.content });
      }
      return {
        role: m.role === 'model' ? 'model' : 'user',
        parts,
      };
    });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Be precise and stubborn
      }
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
      },
    });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
