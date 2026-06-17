import { GoogleGenAI } from '@google/genai';

// Models tried in order when one is unavailable or rate-limited
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

const RETRIABLE_MESSAGES = ['429', '503', 'quota', 'rate', 'unavailable', 'overloaded'];

const isRetriable = (error) => {
  const msg = (error?.message || '').toLowerCase();
  return RETRIABLE_MESSAGES.some((keyword) => msg.includes(keyword));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try a single model with up to 2 retries (exponential backoff: 1s, 2s)
const tryModel = async (ai, model, prompt) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const rawText = response.text;
      if (!rawText) throw new Error('AI returned an empty response.');
      return rawText;
    } catch (err) {
      const isLast = attempt === 2;
      if (!isRetriable(err) || isLast) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
};

// Walk the fallback chain until one model succeeds
const generateWithFallback = async (prompt) => {
  const ai = new GoogleGenAI({});
  let lastErr;
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await tryModel(ai, model, prompt);
    } catch (err) {
      lastErr = err;
      if (!isRetriable(err)) throw err; // non-retriable (e.g. auth) — stop immediately
    }
  }
  throw lastErr;
};

export const improveQuestionService = async ({ title, description, tags }) => {
  const prompt = `You are helping a developer improve their question on a Q&A platform called DevAnswers.

Given the following question details:
Title: ${title}
Description: ${description}
Tags: ${tags}

Improve each field to make the question clearer, more specific, and more likely to receive helpful answers. Follow these rules:
- Title: must remain phrased as a question (start with "How", "Why", "What", "When", "Can", etc. and end with "?"). Do NOT turn it into a statement or article-style heading.
- Description: keep it as a first-person problem description, not a solution or answer.
- Tags: comma-separated relevant keywords only.

IMPORTANT: Do not use any markdown formatting, asterisks, bold, italics, bullet points, or special characters in the text values. Plain text only.

Return ONLY a valid JSON object with no markdown or code blocks, using this exact structure:
{
  "title": "improved title here",
  "description": "improved description here",
  "tags": "improved, tags, here"
}`;

  const rawText = await generateWithFallback(prompt);
  const text = rawText
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  const parsed = JSON.parse(text);
  parsed.title = parsed.title?.replace(/\*+/g, '');
  parsed.description = parsed.description?.replace(/\*+/g, '');
  parsed.tags = parsed.tags?.replace(/\*+/g, '');
  return parsed;
};

export const summarizeAnswersService = async ({ questionText, answers }) => {
  const answerTexts = answers.map((a, i) => `Answer ${i + 1}: ${a}`).join('\n\n');

  const prompt = `You are a helpful assistant on a developer Q&A platform.

Question: ${questionText}

Answers:
${answerTexts}

Write a concise plain-text summary of these answers in 3-5 sentences. Focus on the key solutions and points. Use plain text only — no markdown, no asterisks, no bullet points, no bold, no italics, no special characters.`;

  const rawText = await generateWithFallback(prompt);
  return rawText.trim().replace(/\*+/g, '');
};
