import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory store for session states (for preview purposes)
// In production, this would be a database like Firestore

interface SessionData {
  phase: string;
  solutionContext?: string;
  assessmentLog: Record<string, string>[];
  questionCount: number;
  weakConcepts: string[];
  microExamples: string[];
  microIndex: number;
  reconstruction: string | null;
  reconstructionHints: string[];
  microSolutions?: string[];
}

const sessions: Record<string, SessionData> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, imageBase64, content } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "No session ID" }, { status: 400 });
    }

    if (action === 'start_session') {
      let solutionContext = "No image provided. Determine the problem from the student's message.";
      if (imageBase64) {
        // 1. Pro Model: Parse problem and generate Solution Context
        const solutionRes = await ai.models.generateContent({
          model: 'gemini-1.5-pro',
          contents: [
            {
              role: 'user',
              parts: [
                { text: "Solve this physics/math problem step-by-step. Identify the core concepts needed for each step. Output LaTeX using $ and $$ strictly. DO NOT escape dollar signs (e.g., use $M$, not \\$M\\$)." },
                { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
              ]
            }
          ],
          config: {
              temperature: 0.2
          }
        });
        solutionContext = solutionRes.text || "Solution unavailable.";
      } else if (content) {
        const solutionRes = await ai.models.generateContent({
          model: 'gemini-1.5-pro',
          contents: `Solve this physics/math problem step-by-step. Identify the core concepts needed for each step.\n\nProblem: ${content}\n\nIMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs.`
        });
        solutionContext = solutionRes.text || "Solution unavailable.";
      }

      // 2. Flash Model: First diagnostic question
      const diagRes = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are a diagnostic tutor. 
        SOLUTION CONTEXT: ${solutionContext}
        
        Ask ONE short question (max 15 words) to test the very first concept needed to solve this problem. Do not explain. IMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs (e.g. use $x$, not \\$x\\$).`
      });

      // Save to in-memory store
      sessions[sessionId] = {
        phase: 'diagnosing',
        solutionContext,
        assessmentLog: [],
        questionCount: 0,
        weakConcepts: [],
        microExamples: [],
        microIndex: 0,
        reconstruction: null,
        reconstructionHints: []
      };

      return NextResponse.json({ question: diagRes.text || "Cannot generate diagnostics.", phase: 'diagnosing' });
    }

    if (action === 'send_message') {
      const session = sessions[sessionId];
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      if (session.phase === 'diagnosing') {
        session.assessmentLog.push({ studentAnswer: content });
        session.questionCount++;

        if (session.questionCount < 3) {
           const diagRes = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
             contents: `You are a diagnostic tutor.
             SOLUTION CONTEXT: ${session.solutionContext}
             ASSESSMENT LOG: ${JSON.stringify(session.assessmentLog)}
             
             Evaluate the student's last answer. Then ask ONE short question testing the next concept. (Max 15 words). IMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs.`
           });
           
           return NextResponse.json({ response: diagRes.text || "Cannot parse answer.", phase: 'diagnosing' });
        } else {
           // Transition to Micro Examples
           session.phase = 'micro_examples';
           session.weakConcepts = ["applying Newton's second law", "resolving vectors"]; // hardcoded for demo or derived

           const exRes = await ai.models.generateContent({
             model: 'gemini-1.5-flash',
             contents: `Generate a very short, simple 1-step physics micro-example problem testing: ${session.weakConcepts[0]}. 
             Return ONLY the problem text. IMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs.`
           });
           
           session.microExamples.push(exRes.text || "Example generation failed.");
           session.microSolutions = ["This is the hidden solution for the micro example."];

           return NextResponse.json({ 
             response: `I see you might need practice on some core concepts. Let's do a quick micro-example:\n\n${exRes.text}`, 
             phase: 'micro_examples' 
           });
        }
      }

      if (session.phase === 'micro_examples') {
        // Transition to Reconstruction
        session.phase = 'reconstruction';
        
        const reconRes = await ai.models.generateContent({
          model: 'gemini-1.5-pro',
          contents: `Create a new problem isomorphic to the original physics problem based on the context: ${session.solutionContext}.
          Make it slightly different but testing the same concepts.
          Output ONLY the problem statement. IMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs.`
        });

        session.reconstruction = reconRes.text || "Problem generation failed.";
        session.reconstructionHints = ["Step 1: Draw the FBD", "Step 2: Resolve forces along the plane"];

        return NextResponse.json({ 
           response: `Great! Now let's try a full problem similar to your original one to see if you mastered it:\n\n${reconRes.text}\n\nWhat is your first step?`,
           phase: 'reconstruction'
        });
      }

      if (session.phase === 'reconstruction') {
        const evalRes = await ai.models.generateContent({
           model: 'gemini-1.5-flash',
           contents: `Reconstruction Problem: ${session.reconstruction}
           Student says: ${content}
           Evaluate this step. If correct, ask for the next step. If wrong, give a tiny hint. IMPORTANT: Use $ and $$ for LaTeX math formatting, and never escape dollar signs.`
        });
        return NextResponse.json({ response: evalRes.text || "I'm not sure.", phase: 'reconstruction' });
      }
    }

    if (action === 'get_hint') {
      const session = sessions[sessionId];
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      
      let hint = "No hint available.";
      if (session.phase === 'micro_examples') {
         hint = session.microSolutions?.[0] || "Just apply the basic formula!";
      } else if (session.phase === 'reconstruction') {
         hint = session.reconstructionHints?.shift() || "You've got this, just try writing the equation.";
      }
      return NextResponse.json({ hint });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    let errorMsg = error instanceof Error ? error.message : "Unknown error";
    try {
      if (error instanceof Error) {
        const parsed = JSON.parse(error.message);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      }
    } catch {
       // Ignore JSON parse errors
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
