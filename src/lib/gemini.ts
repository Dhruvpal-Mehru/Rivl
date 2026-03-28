import { GoogleGenerativeAI } from '@google/generative-ai';

// Singleton Gemini client
let genAIInstance: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey'
      );
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

export function getModel(modelName: string = 'gemini-2.5-flash') {
  return getGeminiClient().getGenerativeModel({ model: modelName });
}

// Parse JSON from Gemini response, handling markdown code blocks
export function parseGeminiJson<T>(responseText: string): T {
  let cleaned = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Try to extract JSON object if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned) as T;
}

// Parse HTML from Gemini response
export function parseGeminiHtml(responseText: string): string {
  let html = responseText
    .replace(/```html\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Ensure it starts with DOCTYPE or html tag
  if (
    !html.toLowerCase().startsWith('<!doctype') &&
    !html.toLowerCase().startsWith('<html')
  ) {
    const htmlMatch =
      html.match(/<!DOCTYPE[\s\S]*<\/html>/i) ||
      html.match(/<html[\s\S]*<\/html>/i);
    if (htmlMatch) {
      html = htmlMatch[0];
    }
  }

  return html;
}
