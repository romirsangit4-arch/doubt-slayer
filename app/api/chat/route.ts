import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini/client";
import { buildChatSystemInstruction } from "@/lib/exam-prompts";
import { parseTargetExam } from "@/lib/exams";

async function isCustomKeyValid(apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionData, customApiKey, targetExam: rawExam } = await req.json();
    const targetExam = parseTargetExam(rawExam);

    let ai;
    let customKeyFailed = false;

    if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim() !== '') {
      const isValid = await isCustomKeyValid(customApiKey);
      if (isValid) {
        ai = getGeminiClient("resolve_flash", customApiKey);
      } else {
        customKeyFailed = true;
        ai = getGeminiClient("resolve_flash");
      }
    } else {
      ai = getGeminiClient("resolve_flash");
    }

    const systemInstruction = buildChatSystemInstruction(targetExam, sessionData);

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
      model: "gemini-2.5-flash",
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

    const headers = new Headers({
      "Content-Type": "text/plain",
    });
    if (customKeyFailed) {
      headers.set("X-Custom-Key-Failed", "true");
    }

    return new Response(stream, { headers });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

