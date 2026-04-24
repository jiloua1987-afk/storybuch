import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, language, dedication } = await req.json();
    const langMap: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    // GPT-4o writes closing text — returned as JSON, rendered in frontend via CSS
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `Write a warm, emotional closing paragraph for a personal comic book in ${lang}. Tone: ${tone || "warm"}. Max 70 words. Make it feel like the last page of a beloved book – personal, touching, memorable. No title.`,
      }, {
        role: "user",
        content: storyInput || Object.values(guidedAnswers || {}).filter(Boolean).join(", "),
      }],
      max_tokens: 120,
      temperature: 0.9,
    });

    const endingText = res.choices[0].message.content || "";

    // Return text + dedication as JSON — NO sharp, NO SVG image rendering
    // Frontend renders this as a styled HTML page
    return NextResponse.json({
      endingText,
      dedication: dedication || "",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
