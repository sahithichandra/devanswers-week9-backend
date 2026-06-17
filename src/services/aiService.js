import { GoogleGenAI } from '@google/genai';

export const improveQuestionService = async ({ title, description, tags }) => {
  const ai = new GoogleGenAI({});
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

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });

  const text = response.text
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
  const ai = new GoogleGenAI({});
  const answerTexts = answers.map((a, i) => `Answer ${i + 1}: ${a}`).join('\n\n');

  const prompt = `You are a helpful assistant on a developer Q&A platform.

Question: ${questionText}

Answers:
${answerTexts}

Write a concise plain-text summary of these answers in 3-5 sentences. Focus on the key solutions and points. Use plain text only — no markdown, no asterisks, no bullet points, no bold, no italics, no special characters.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });

  return response.text.trim().replace(/\*+/g, '');
};
