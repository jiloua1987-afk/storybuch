import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, language, dedication } = await req.json();
    const langMap: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const storyContext = [
      storyInput || "",
      ...Object.entries(guidedAnswers || {})
        .filter(([k, v]) => v && k !== "category")
        .map(([k, v]) => `${k}: ${v}`),
      dedication ? `Dedication: ${dedication}` : "",
    ].filter(Boolean).join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You write the final page of a personal comic book in ${lang}.
This is NOT a generic book — it's about REAL people and THEIR specific story.

RULES:
- Reference the ACTUAL characters by name from the story
- Mention 1-2 SPECIFIC moments from their story
- Write as if you are the narrator who witnessed everything
- 3-4 short, emotional sentences
- Tone: ${tone || "warm, nostalgic, loving"}
- End with a sentence that feels like a warm hug
- NEVER use generic phrases like "Liebe Leserinnen und Leser" or "[Dein Name]"
- NEVER break the fourth wall — don't mention "this book" or "this story"
- Write as if speaking directly to the family`,
      }, {
        role: "user",
        content: storyContext,
      }],
      max_tokens: 150,
      temperature: 0.8,
    });

    const endingText = res.choices[0].message.content || "";

    return NextResponse.json({
      endingText,
      dedication: dedication || "",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
