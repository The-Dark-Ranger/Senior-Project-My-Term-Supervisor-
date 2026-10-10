/**
 * Minimal, dependency-free client for the Gemini API (Google AI Studio).
 * Server-only: the API key is read from the environment and never sent to the browser.
 */
import { GEMINI_MODEL } from './config';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 20_000;

type SchemaType = 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN';
export interface ResponseSchema {
  type: SchemaType;
  description?: string;
  properties?: Record<string, ResponseSchema>;
  items?: ResponseSchema;
  required?: string[];
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  return key;
}

/** Sends a prompt and parses the model's JSON answer, constrained by `schema`. */
export async function generateJson(prompt: string, schema: ResponseSchema): Promise<unknown> {
  const model = encodeURIComponent(GEMINI_MODEL);
  const response = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });

  if (!response.ok) {
    // Do not include the response body: it can echo request details.
    throw new Error(`Gemini API request failed with HTTP ${response.status}.`);
  }

  const data = (await response.json()) as GenerateContentResponse;
  if (data.promptFeedback?.blockReason) throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned an empty response.');
  return JSON.parse(text);
}
