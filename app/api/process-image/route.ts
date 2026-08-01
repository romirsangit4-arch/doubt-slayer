import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini/client";

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
    const { imageBase64, customApiKey } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    let ai;
    let customKeyFailed = false;
    if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim() !== '') {
      const isValid = await isCustomKeyValid(customApiKey);
      if (isValid) {
        ai = getGeminiClient("ingest_flash", customApiKey);
      } else {
        customKeyFailed = true;
        ai = getGeminiClient("ingest_flash");
      }
    } else {
      ai = getGeminiClient("ingest_flash");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: "Extract the problem statement, identify the topic using the JEE syllabus, and list the physical quantities and diagrams present.",
          },
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg",
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problem_text: {
              type: Type.STRING,
              description: "The extracted problem statement.",
            },
            detected_topic: {
              type: Type.STRING,
              description: "The identified JEE topic.",
            },
            physical_quantities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of physical quantities given in the problem."
            },
            ocr_confidence: {
              type: Type.NUMBER,
              description: "Confidence score of the extraction from 0.0 to 1.0"
            }
          },
          required: ["problem_text", "detected_topic", "physical_quantities", "ocr_confidence"]
        }
      }
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText.trim());
    if (customKeyFailed) {
      parsed.customKeyFailed = true;
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Process Image Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
