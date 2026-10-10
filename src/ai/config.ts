/** Server-only AI configuration. Kept free of network code so pages can check it cheaply. */

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
}
