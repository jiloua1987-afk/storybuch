import OpenAI from "openai";
import type { Character } from "./prompt-builder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Unified format constant ───────────────────────────────────────────────────
export const COMIC_PAGE_SIZE = "1024x1536" as const;

// ── Anti-realism note (used in all image prompts) ────────────────────────────
const COMIC_STYLE_NOTE = `CRITICAL STYLE: Bold ink outlines, flat color areas, stylized expressive faces — pure comic book illustration. NOT photorealistic, NOT a photo, NOT a painting. Think European graphic novels (Tintin, Asterix). Stylized characters, NOT photographic accuracy.`;

// ── Character Reference Sheet generation ─────────────────────────────────────
// Generates a neutral reference image showing all characters clearly
// Used for consistency across all comic pages when no user photo is uploaded
export async function generateCharacterSheet(
  characters: Character[],
  illustrationStyle: string,
  referenceImages: string[] = [],
): Promise<string> {
  if (characters.length === 0) return "";

  const charDesc = characters.map((c) => 
    `${c.name}: ${c.visual_anchor}`
  ).join(". ");

  const styleMap: Record<string, string> = {
    comic:       "bold ink outlines, flat vibrant colors, European comic illustration style — NOT photorealistic",
    aquarell:    "bold ink outlines with soft watercolor fills, comic illustration style — NOT photorealistic",
    bleistift:   "bold pencil sketch with ink outlines, hand-drawn comic style — NOT photorealistic",
    realistisch: "bold ink outlines, detailed flat colors, realistic comic art style — NOT photorealistic",
  };
  const style = styleMap[illustrationStyle] || styleMap.comic;

  const prompt = `Create a CHARACTER REFERENCE SHEET for comic illustration.
Show all characters standing together in neutral poses, facing forward.
Characters: ${charDesc}
${COMIC_STYLE_NOTE}
Style: ${style}, professional character design quality.
CRITICAL: Sharp, detailed facial features with clearly defined eyes, nose, mouth, and expressions.
Each character should be clearly visible, well-lit, and easy to identify.
Simple neutral background (white or light grey).
Characters should look friendly and approachable.
NO text, NO labels, NO letters anywhere in the image.
Portrait orientation (vertical), all characters visible from head to waist.`;

  try {
    // If user uploaded reference photo, use images.edit()
    if (referenceImages.length > 0 && referenceImages[0]) {
      try {
        // Convert base64 to Buffer
        let imageBuffer: Buffer;
        const refData = referenceImages[0];
        
        if (refData.startsWith("data:image")) {
          const base64Data = refData.split(",")[1] || refData;
          imageBuffer = Buffer.from(base64Data, "base64");
        } else if (refData.startsWith("http")) {
          const response = await fetch(refData);
          imageBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          imageBuffer = Buffer.from(refData, "base64");
        }
        
        const refFile = new File([new Uint8Array(imageBuffer)], "reference.png", { type: "image/png" });
        
        const editRes = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: `The people in this photo are the main characters. Draw them as comic book illustrations — bold ink outlines, flat colors, stylized faces. NOT photorealistic. ${prompt}`,
          size: COMIC_PAGE_SIZE,
          quality: "high",
        });
        const item = (editRes.data ?? [])[0];
        if (item?.url) return item.url;
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      } catch (e: any) {
        console.warn("Character sheet edit failed, falling back to generate:", e.message);
        console.error("Full error:", e);
      }
    }

    // Fallback or default: images.generate()
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: COMIC_PAGE_SIZE,
      quality: "high",
    });
    const item = (response.data ?? [])[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error("Character sheet generation error:", err.message);
    return "";
  }
}

// ── Cover image generation ───────────────────────────────────────────────────
// Uses images.generate() ONLY — no images.edit(), no responses API
// Title overlay is rendered in frontend via CSS
export async function generateCoverImage(
  title: string,
  characters: Character[],
  category: string,
  illustrationStyle: string,
  location: string,
  referenceImages: string[] = [],
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
    comic:       "bold ink outlines, flat vibrant colors, European comic illustration style — NOT photorealistic",
    aquarell:    "bold ink outlines with soft watercolor fills, comic illustration style — NOT photorealistic",
    bleistift:   "bold pencil sketch with ink outlines, hand-drawn comic style — NOT photorealistic",
    realistisch: "bold ink outlines, detailed flat colors, realistic comic art style — NOT photorealistic",
  };
  const style = styleMap[illustrationStyle] || styleMap.comic;

  const prompt = `Create a beautiful comic book COVER illustration.
${COMIC_STYLE_NOTE}
${charDesc ? `Main characters: ${charDesc}.` : ""}
Setting: ${location || "beautiful scenic location"}.
Mood: ${mood}.
Style: ${style}, professional comic book cover quality, cinematic composition.
The cover should feel epic and inviting — like a book you want to pick up immediately.
NO text, NO title, NO letters anywhere in the image.
Portrait orientation (vertical), characters prominently featured, stunning background.
Leave the bottom 30% of the image slightly darker/simpler for title overlay.`;

  try {
    // If user uploaded reference photo, use images.edit()
    if (referenceImages.length > 0 && referenceImages[0]) {
      try {
        // Convert base64 to Buffer
        let imageBuffer: Buffer;
        const refData = referenceImages[0];
        
        if (refData.startsWith("data:image")) {
          const base64Data = refData.split(",")[1] || refData;
          imageBuffer = Buffer.from(base64Data, "base64");
        } else if (refData.startsWith("http")) {
          const response = await fetch(refData);
          imageBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          imageBuffer = Buffer.from(refData, "base64");
        }
        
        const refFile = new File([new Uint8Array(imageBuffer)], "reference.png", { type: "image/png" });
        
        const editRes = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: `The people in this photo are the main characters. Draw them as comic book illustrations — bold ink outlines, flat colors, stylized faces. NOT photorealistic. ${prompt}`,
          size: COMIC_PAGE_SIZE,
          quality: "high",
        });
        const item = (editRes.data ?? [])[0];
        if (item?.url) return item.url;
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      } catch (e: any) {
        console.warn("Cover edit failed, falling back to generate:", e.message);
        console.error("Full error:", e);
      }
    }

    // Fallback or default: images.generate()
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: COMIC_PAGE_SIZE,
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
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: COMIC_PAGE_SIZE,
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
