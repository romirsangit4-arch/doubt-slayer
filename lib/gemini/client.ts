import { GoogleGenAI } from "@google/genai";

export type ApiTask = "ingest_pro" | "ingest_flash" | "repair_flash" | "reconstruct_pro" | "resolve_flash";

// Map tasks to specific keys based on the user's requirement.
// We allocate one key for each major model run.
const TASK_KEY_MAP: Record<ApiTask, string | undefined> = {
  ingest_pro: process.env.GEMINI_API_KEY_1 ?? process.env.GEMINI_API_KEY,
  ingest_flash: process.env.GEMINI_API_KEY_2 ?? process.env.GEMINI_API_KEY,
  repair_flash: process.env.GEMINI_API_KEY_3 ?? process.env.GEMINI_API_KEY,
  reconstruct_pro: process.env.GEMINI_API_KEY_4 ?? process.env.GEMINI_API_KEY,
  resolve_flash: process.env.GEMINI_API_KEY_1 ?? process.env.GEMINI_API_KEY,
};

const ALL_KEYS = [
  process.env.GEMINI_API_KEY_1 ?? process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2 ?? process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_3 ?? process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_4 ?? process.env.GEMINI_API_KEY,
].filter(Boolean) as string[];

/**
 * Checks if an error is eligible for key switching/rotation.
 * Retries on: Rate limits (429), quota errors, temporary server errors (500/503), or auth issues with a specific key.
 */
function isSwitchableError(error: any): boolean {
  const errMsg = error?.message || String(error);
  const status = error?.status || error?.statusCode;
  
  if (status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
    return true;
  }
  
  if (status === 403 || status === 401 || errMsg.includes("API_KEY_INVALID") || errMsg.toLowerCase().includes("api key")) {
    return true;
  }
  
  if (status === 500 || status === 503 || errMsg.includes("503") || errMsg.includes("500")) {
    return true;
  }
  
  const lowerMsg = errMsg.toLowerCase();
  if (lowerMsg.includes("quota") || lowerMsg.includes("rate limit") || lowerMsg.includes("exhausted") || lowerMsg.includes("limit exceeded")) {
    return true;
  }
  
  return false;
}

/**
 * Wraps a GoogleGenAI client in a proxy that intercepts calls to `.models.*` and automatically
 * falls back to other available keys in the pool if a switchable error is encountered.
 */
function wrapWithFallback(initialClient: GoogleGenAI, task: ApiTask, customApiKey?: string): GoogleGenAI {
  // If a custom API key is supplied by the user/student, we do not rotate onto developer keys.
  if (customApiKey) {
    return initialClient;
  }

  const primaryKey = TASK_KEY_MAP[task];
  const otherKeys = ALL_KEYS.filter(k => k !== primaryKey);
  const keyPool = primaryKey ? [primaryKey, ...otherKeys] : ALL_KEYS;

  if (keyPool.length <= 1) {
    return initialClient;
  }

  const modelsProxy = new Proxy(initialClient.models, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function(...args: any[]) {
        let lastError: any;
        
        for (let i = 0; i < keyPool.length; i++) {
          const currentKey = keyPool[i];
          try {
            const tempClient = new GoogleGenAI({ apiKey: currentKey });
            const methodToCall = Reflect.get(tempClient.models, prop);
            const result = await methodToCall.apply(tempClient.models, args);
            
            if (i > 0) {
              console.warn(`[Gemini Client] Primary key for task "${task}" failed. Successfully fell back to key index ${i + 1}.`);
            }
            return result;
          } catch (error: any) {
            lastError = error;
            const errMsg = error?.message || String(error);
            
            if (isSwitchableError(error) && i < keyPool.length - 1) {
              console.warn(`[Gemini Client] Key index ${i + 1} for task "${task}" failed. Error: ${errMsg}. Rotating to next key...`);
              continue;
            } else {
              break;
            }
          }
        }
        
        throw lastError;
      };
    }
  });

  return new Proxy(initialClient, {
    get(target, prop, receiver) {
      if (prop === 'models') {
        return modelsProxy;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

export function getGeminiClient(task: ApiTask, customApiKey?: string): GoogleGenAI {
  if (customApiKey) {
    return new GoogleGenAI({ apiKey: customApiKey });
  }

  const key = TASK_KEY_MAP[task];
  if (!key) {
    throw new Error(`No API key configured for task: ${task}`);
  }

  const client = new GoogleGenAI({ apiKey: key });
  return wrapWithFallback(client, task, customApiKey);
}
