// Prompt Builder v2 — Einzelbilder pro Szene
// Jedes Panel = 1 eigenständiges Bild in maximaler Qualität
// Text-Overlays werden im Frontend per CSS gerendert

export interface Character {
  name: string;
  age: number;
  visual_anchor: string;
  bubble_color?: string;
}

export interface Panel {
  nummer: number;
  szene: string;
  dialog?: string;
  speaker?: string;
  bubble_type?: "speech" | "caption" | "shout" | "thought";
}

export interface PagePromptInput {
  title: string;
  panels: Panel[];
  characters: Character[];
  illustrationStyle: string;
  comicStyle: string;
  category?: string;
  location?: string;
  timeOfDay?: string;
  tone?: string;
}

// ── Style-Lock Strings (from Spec Section 8.2) ──────────────────────────────
const STYLE_LOCKS: Record<string, string> = {
  comic:       "warm watercolor children's book illustration, soft rounded lines, bright cheerful colors, gentle lighting, storybook quality, professional illustration",
  aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes, dreamy romantic atmosphere, painterly texture",
  bleistift:   "detailed pencil sketch comic, crosshatching for shadows, hand-drawn linework, black and white with subtle warm tones",
  realistisch: "realistic comic art style, detailed digital painting, warm cinematic lighting, photorealistic faces with comic proportions",
};

const TONE_STYLES: Record<string, string> = {
  kindgerecht: "warm watercolor children's book illustration, soft rounded lines, bright cheerful colors, gentle lighting, storybook quality",
  humorvoll:   "vibrant European comic BD style, bold clean outlines, saturated colors, expressive exaggerated poses, dynamic energy",
  romantisch:  "romantic illustrated novel style, golden hour warm lighting, soft watercolor washes, cinematic composition, intimate atmosphere, painterly",
  episch:      "epic graphic novel illustration, dramatic cinematic lighting, highly detailed backgrounds, rich deep colors, wide angle panoramic",
  biografisch: "illustrated memoir style, warm muted earth tones, editorial linework, nostalgic atmosphere",
};

const COMIC_STYLE_MODIFIERS: Record<string, string> = {
  action:    "dynamic poses, motion lines, exaggerated expressions, high energy, dramatic angles",
  emotional: "tender moments, soft lighting, close-up facial expressions showing emotion, warm intimate atmosphere",
  humor:     "exaggerated funny expressions, comedic timing, playful body language, bright cheerful colors",
};

const CATEGORY_ATMOSPHERE: Record<string, string> = {
  liebe:      "romantic warm lighting, soft golden tones, intimate close-ups, tender gestures between characters",
  familie:    "warm family atmosphere, joyful interactions, cozy settings, children's playful energy",
  urlaub:     "bright sunny Mediterranean colors, turquoise water, golden sand, vacation joy and freedom",
  feier:      "festive colorful atmosphere, balloons or decorations, happy celebrations, party energy",
  biografie:  "nostalgic warm sepia tones mixed with color, timeless settings, emotional depth",
  freunde:    "casual fun atmosphere, laughter, shared adventures, vibrant social energy",
  sonstiges:  "warm inviting atmosphere, personal and intimate storytelling",
};

// ── BLOCK 1: Consistency (always first — model reads top-down) ───────────────
function buildConsistencyBlock(characters: Character[]): string {
  if (characters.length === 0) return "";

  const charAnchors = characters
    .map((c) => `CHARACTER "${c.name}": ${c.visual_anchor}`)
    .join("\n");

  return `CRITICAL INSTRUCTION — VISUAL CONSISTENCY:
All characters must appear IDENTICAL across every single image in this series.
Maintain with absolute precision:
- Same face: identical facial structure, eyes, nose, mouth, skin tone
- Same hair: exact color, length, texture, style — no variations
- Same body: proportions, height ratios between characters
- Same clothing: identical colors, patterns, style
Treat every image as a frame from the same animated film.

${charAnchors}`;
}

// ── BLOCK 2: Style Lock ──────────────────────────────────────────────────────
function buildStyleBlock(
  illustrationStyle: string,
  comicStyle: string,
  category: string,
  tone?: string
): string {
  const style = (tone && TONE_STYLES[tone]) || STYLE_LOCKS[illustrationStyle] || STYLE_LOCKS.comic;
  const comicMod = COMIC_STYLE_MODIFIERS[comicStyle] || COMIC_STYLE_MODIFIERS.emotional;
  const atmosphere = CATEGORY_ATMOSPHERE[category] || CATEGORY_ATMOSPHERE.familie;

  return `ART STYLE: ${style}
Mood: ${comicMod}
Atmosphere: ${atmosphere}
ABSOLUTE RULE: NO text, NO letters, NO words, NO speech bubbles, NO captions, NO UI elements anywhere in the image. The image must be a pure illustration only.
Leave approximately 25% empty/lighter space at top-left corner for caption text overlay that will be added separately.`;
}

// ── Single Scene Prompt (1 image per panel) ──────────────────────────────────
export function buildScenePrompt(
  scene: string,
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string,
  location?: string,
  timeOfDay?: string,
  tone?: string,
  layout: "wide" | "tall" | "hero" = "wide"
): string {
  const consistency = buildConsistencyBlock(characters);
  const style = buildStyleBlock(illustrationStyle, comicStyle, category, tone);

  const composition = layout === "wide"
    ? "cinematic wide shot, 16:9 landscape ratio"
    : layout === "tall"
    ? "portrait vertical composition"
    : "full page hero shot";

  const sceneBlock = `SCENE TO ILLUSTRATE:
${scene}
${location ? `Location: ${location}.` : ""}
${timeOfDay ? `Lighting: ${timeOfDay} light.` : ""}
Composition: ${composition}`;

  return [consistency, "", style, "", sceneBlock].filter(Boolean).join("\n");
}

// ── Legacy: Multi-panel page prompt (backward compat during migration) ───────
export function buildComicPagePrompt(input: PagePromptInput): string {
  const { panels, characters, illustrationStyle, comicStyle, category, location, timeOfDay, tone } = input;

  // During migration: if only 1 panel, use single-scene prompt
  if (panels.length === 1) {
    return buildScenePrompt(
      panels[0].szene, characters, illustrationStyle, comicStyle,
      category || "familie", location, timeOfDay, tone
    );
  }

  // Multi-panel: use consistency block + scene descriptions
  const consistency = buildConsistencyBlock(characters);
  const style = buildStyleBlock(illustrationStyle, comicStyle, category || "familie", tone);

  const panelDescs = panels
    .map((p) => `[Panel ${p.nummer}]: ${p.szene}`)
    .join("\n");

  const sceneBlock = `Create ONE single comic book page image with ${panels.length} panels.
Layout: ${panels.length <= 3 ? "1 wide panel top, 2 panels bottom" : panels.length === 4 ? "2x2 grid" : "2 top, 1 wide middle, 2 bottom"}.
Thick black panel borders between all panels.
Cream/warm beige background (#F5EDE0) visible as page border.
${location ? `Location: ${location}.` : ""} ${timeOfDay ? `Lighting: ${timeOfDay} light.` : ""}

Panel scenes:
${panelDescs}

Professional comic book page, warm and inviting, A4 print-ready quality.`;

  return [consistency, "", style, "", sceneBlock].filter(Boolean).join("\n");
}

// ── GPT-4o Story Structure Prompt ────────────────────────────────────────────
export function buildGPTStructurePrompt(
  lang: string,
  tone: string,
  comicStyle: string,
  mustHaveSentences: string,
  numPages: number,
  category: string = "familie"
): string {
  const styleDesc: Record<string, string> = {
    action:    "dynamic, high-energy, dramatic moments, action-focused",
    emotional: "warm, tender, character-driven, emotional depth",
    humor:     "funny, playful, comedic situations, exaggerated reactions",
  };
  const style = styleDesc[comicStyle] || styleDesc.emotional;

  const categoryHints: Record<string, string> = {
    liebe:      "Focus on romantic moments, tender looks, meaningful gestures, relationship milestones",
    familie:    "Focus on family bonding, children's reactions, parental love, shared adventures",
    urlaub:     "Focus on travel discoveries, vacation fun, local culture, memorable moments",
    feier:      "Focus on celebration highlights, emotional speeches, fun moments, group joy",
    biografie:  "Focus on life milestones, character growth, meaningful relationships, key moments",
    freunde:    "Focus on friendship moments, shared laughs, adventures together, loyalty",
    sonstiges:  "Focus on the most emotionally resonant moments of the story",
  };
  const catHint = categoryHints[category] || categoryHints.familie;

  return `You are a professional comic book author. Create a ${numPages}-page comic structure in ${lang}.
Tone: ${tone}. Visual style: ${style}. Category focus: ${catHint}.
${mustHaveSentences ? `MUST include these moments/sentences: ${mustHaveSentences}` : ""}

Rules:
- Each page has 3-5 panels telling a coherent mini-story
- Panel scenes: VERY specific and visual (who, what, where, facial expression, body language, lighting)
- Dialogs: SHORT (max 8 words), natural, in ${lang}, emotionally fitting
- Vary panel layouts across pages
- Each page title: 3-5 words, dramatic or funny, in ${lang}
- Each panel scene description must work as a STANDALONE image prompt

Respond ONLY with JSON:
{
  "pages": [
    {
      "id": "page1",
      "pageNumber": 1,
      "title": "Page title in ${lang}",
      "location": "Specific English location description",
      "timeOfDay": "morning|afternoon|golden hour|sunset|night",
      "panels": [
        {
          "nummer": 1,
          "szene": "Very specific English scene for SINGLE IMAGE generation — describe the complete scene including characters, setting, action, mood",
          "dialog": "Short ${lang} dialog max 8 words",
          "speaker": "Character name or null",
          "bubble_type": "speech|caption|shout|thought"
        }
      ]
    }
  ]
}`;
}
