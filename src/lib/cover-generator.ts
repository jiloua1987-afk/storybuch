import OpenAI from "openai";
import type { Character } from "./prompt-builder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Cover-Bild generieren ─────────────────────────────────────────────────────
export async function generateCoverImage(
  title: string,
  characters: Character[],
  category: string,
  illustrationStyle: string,
  location: string,
  styleReferenceBase64?: string
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
Portrait orientation (vertical), characters prominently featured, stunning background.`;

  try {
    // Mit Stil-Referenz
    if (styleReferenceBase64) {
      const response = await (openai as any).responses.create({
        model: "gpt-image-1",
        input: [
          {
            role: "user",
            content: [
              { type: "input_image", image_url: `data:image/png;base64,${styleReferenceBase64}` },
              { type: "input_text", text: `Use the art style from this reference. Then create a comic book cover: ${prompt}` },
            ],
          },
        ],
        output: [{ type: "image_generation_call", quality: "high", size: "1024x1536" }],
      });
      const output = response.output?.[0];
      if (output?.result) return `data:image/png;base64,${output.result}`;
    }

    // Standard
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
    return `https://picsum.photos/seed/cover-${Date.now()}/1024/1536`;
  }
}

// ── Cover SVG Overlay (Titel auf Cover legen) ─────────────────────────────────
export function buildCoverSVG(
  title: string,
  subtitle: string,
  width: number,
  height: number
): string {
  const lines = wrapTitle(title, 18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <!-- Gradient overlay at bottom -->
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="60%" stop-color="rgba(26,20,16,0.7)"/>
        <stop offset="100%" stop-color="rgba(26,20,16,0.92)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${height * 0.55}" width="${width}" height="${height * 0.45}" fill="url(#grad)"/>

    <!-- Title lines -->
    ${lines.map((line, i) => `
    <text x="${width / 2}" y="${height * 0.72 + i * 58}"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="52" font-weight="900"
      fill="white"
      stroke="rgba(0,0,0,0.5)" stroke-width="2"
      letter-spacing="1">${escXml(line.toUpperCase())}</text>`).join("")}

    <!-- Subtitle -->
    <text x="${width / 2}" y="${height * 0.72 + lines.length * 58 + 20}"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="22" fill="rgba(255,255,255,0.75)"
      letter-spacing="2">${escXml(subtitle.toUpperCase())}</text>

    <!-- Decorative line -->
    <rect x="${width / 2 - 40}" y="${height * 0.72 + lines.length * 58 - 10}"
      width="80" height="3" fill="#C9963A" rx="2"/>
  </svg>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapTitle(title: string, maxChars: number): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}
