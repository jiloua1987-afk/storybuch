import OpenAI from "openai";
import type { Character } from "./prompt-builder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Cover image generation ───────────────────────────────────────────────────
// Uses images.generate() ONLY — no images.edit(), no responses API
// Title overlay is rendered in frontend via CSS
export async function generateCoverImage(
  title: string,
  characters: Character[],
  category: string,
  illustrationStyle: string,
  location: string,
): Promise<string> {
  const charDesc = characters.length > 0
    ? characters.map((c) => `${c.name}: ${c.visual_anchor}`).join(", ")
    : "";

  const categoryMoods: Record<string, string> = {
    liebe:      "romantic sunset, soft golden light, couple in foreground, dreamy atmosphere",
    familie:    "warm sunny day, family together, joyful and colorful, children laughing",
    urlaub:     "beautiful vacation scenery, bright Mediterranean colors, adventure and freedom",
    feier:      "festive celebration atmosphere, colorful and joyful, party energy",
    biografie:  "timeless nostalgic atmosphere, warm sepia tones, life journey feeling",
    freunde:    "fun friendship moment, vibrant colors, laughter and adventure",
    sonstiges:  "warm inviting scene, personal and emotional",
  };
  const mood = categoryMoods[category] || categoryMoods.familie;

  const styleMap: Record<string, string> = {
    comic:       "watercolor comic illustration style, bold outlines, vibrant colors",
    aquarell:    "soft watercolor illustration, pastel colors, dreamy",
    bleistift:   "pencil sketch style, hand-drawn",
    realistisch: "realistic comic art, detailed digital painting",
  };
  const style = styleMap[illustrationStyle] || styleMap.comic;

  const prompt = `Create a beautiful comic book COVER illustration.
${charDesc ? `Main characters: ${charDesc}.` : ""}
Setting: ${location || "beautiful scenic location"}.
Mood: ${mood}.
Style: ${style}, professional comic book cover quality, cinematic composition.
The cover should feel epic and inviting — like a book you want to pick up immediately.
NO text, NO title, NO letters anywhere in the image.
Portrait orientation (vertical), characters prominently featured, stunning background.
Leave the bottom 30% of the image slightly darker/simpler for title overlay.`;

  try {
    // Always use images.generate() — A4 portrait
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    });
    const item = (response.data ?? [])[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error("Cover generation error:", err.message);
    // Single retry
    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
      });
      const item = (response.data ?? [])[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch {
      // ignore
    }
    return "";
  }
}
