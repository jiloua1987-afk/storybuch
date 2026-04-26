import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors } from "@/lib/comic-page-generator";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzePhoto(base64: string, name: string): Promise<string> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } },
          { type: "text", text: `Describe the person named "${name}" for a comic artist. Include: exact hair color/style, eye color, skin tone, age, face shape, distinctive features (beard, glasses, etc.), clothing style. English, max 50 words, precise visual description.` },
        ],
      }],
      max_tokens: 100,
    });
    return res.choices[0].message.content || "";
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [] } = await req.json();

    const [pages, rawCharacters] = await Promise.all([
      buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
        comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category || "familie"),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    // Analyze reference photos → enhance character descriptions
    let characters = rawCharacters;
    if (referenceImages.length > 0) {
      characters = await Promise.all(rawCharacters.map(async (char: any, i: number) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        const photoDesc = await analyzePhoto(ref, char.name);
        return { ...char, visual_anchor: photoDesc || char.visual_anchor, refBase64: ref };
      }));
    }

    return NextResponse.json({ pages, characters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
