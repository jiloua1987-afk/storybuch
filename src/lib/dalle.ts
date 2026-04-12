import { openai } from "./gpt";
import type { Chapter, Character } from "./gpt";

const STYLE_MAP: Record<string, string> = {
  comic:       "watercolor comic illustration, bold outlines, vibrant colors, cinematic lighting",
  aquarell:    "soft watercolor illustration, pastel colors, dreamy atmosphere",
  bleistift:   "pencil sketch illustration, hand-drawn, detailed linework",
  realistisch: "realistic digital painting, detailed, warm lighting",
};

// ── Build Fix+Flex Prompt ─────────────────────────────────────────────────────
export function buildImagePrompt(
  chapter: Chapter,
  characters: Character[],
  illustrationStyle: string,
  dialogPositions: string[]
): string {
  const style = STYLE_MAP[illustrationStyle] || STYLE_MAP.comic;

  // Fixed part
  const characterAnchors = characters
    .map((c) => `${c.name}: ${c.visual_anchor}`)
    .join(". ");

  const emptySpaces = dialogPositions.length > 0
    ? `Leave empty space at ${dialogPositions.join(" and ")} for text overlays.`
    : "";

  const fixedPart = `IMPORTANT: keep all characters visually consistent — same faces, same hair, same body proportions, same outfits always. Characters: ${characterAnchors}. Style: ${style}, NO text, NO letters, NO speech bubbles, NO captions anywhere in image. ${emptySpaces}`;

  // Flexible part (from chapter)
  const flexPart = `${chapter.illustration_prompt}. Scene: ${chapter.szene_beschreibung}`;

  return `${fixedPart} ${flexPart}`.trim();
}

// ── Generate Panel Image ──────────────────────────────────────────────────────
export async function generatePanelImage(
  chapter: Chapter,
  characters: Character[],
  illustrationStyle: string = "comic",
  dialogPositions: string[] = ["top-left", "top-right"]
): Promise<string> {
  const prompt = buildImagePrompt(chapter, characters, illustrationStyle, dialogPositions);

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });
    return response.data[0].url || response.data[0].b64_json
      ? `data:image/png;base64,${response.data[0].b64_json}`
      : "";
  } catch (err: any) {
    console.error("DALL-E error:", err.message);
    // Fallback to placeholder
    return `https://picsum.photos/seed/${chapter.id}/1792/1024`;
  }
}
