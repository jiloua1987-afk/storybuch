// Prompt Builder v3 — Based on Spec Section 8 + 12
// Block order matters: Consistency → Characters → Style → Scene
// Model reads top-down, most important instructions first

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

// ── Style-Lock Strings per Tonalität (Spec Section 8.2) ─────────────────────
const TONE_STYLE_LOCKS: Record<string, string> = {
  kindgerecht: "warm watercolor children's book illustration, soft rounded lines, bright cheerful colors, gentle lighting, storybook quality, professional illustration",
  humorvoll:   "vibrant European comic BD style, bold clean outlines, saturated colors, expressive exaggerated poses, dynamic energy, Asterix/Tintin quality",
  romantisch:  "romantic illustrated novel style, golden hour warm lighting, soft watercolor washes, cinematic composition, intimate atmosphere, painterly",
  episch:      "epic graphic novel illustration, dramatic cinematic lighting, highly detailed backgrounds, rich deep colors, wide angle panoramic, movie poster quality",
  biografisch: "illustrated memoir style, warm muted earth tones, editorial linework, nostalgic atmosphere, New Yorker illustration quality",
};

const ILLUSTRATION_STYLE_LOCKS: Record<string, string> = {
  comic:       "professional comic book illustration, bold clean black outlines, vibrant saturated colors, cel-shaded coloring, dynamic compositions, high contrast, sharp details, European BD quality (Asterix/Tintin level)",
  aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes, dreamy romantic atmosphere, painterly texture, no harsh outlines",
  bleistift:   "detailed pencil sketch comic, crosshatching for shadows, hand-drawn linework, black and white with subtle warm tones",
  realistisch: "realistic comic art style, detailed digital painting, warm cinematic lighting, photorealistic faces with comic proportions",
};

const COMIC_MOOD: Record<string, string> = {
  action:    "dynamic poses, motion lines, exaggerated expressions, high energy, dramatic angles, bold compositions",
  emotional: "tender moments, soft lighting, close-up facial expressions showing emotion, warm intimate atmosphere",
  humor:     "exaggerated funny expressions, comedic timing, playful body language, bright cheerful colors, cartoon-like reactions",
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

const PANEL_LAYOUTS: Record<number, string> = {
  3: "3-panel comic page: ONE wide cinematic panel spanning full width on top (60% height), TWO equal square panels side by side on bottom row (40% height). Clear 4px black borders between all panels.",
  4: "4-panel comic page: 2×2 grid of equal panels. Clear 4px black borders between all panels. Each panel roughly 50% width × 50% height.",
  5: "5-panel comic page: TWO panels on top row, ONE wide cinematic panel spanning full width in middle, TWO panels on bottom row. Clear 4px black borders between all panels.",
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 1: CONSISTENCY — always first, model reads top-down
// Replicates the ChatGPT internal system prompt for character consistency
// ══════════════════════════════════════════════════════════════════════════════
function buildConsistencyBlock(characters: Character[]): string {
  if (characters.length === 0) return "";

  const charDescs = characters
    .map((c) => {
      return `CHARACTER "${c.name}": ${c.visual_anchor}`;
    })
    .join("\n\n");

  return `CRITICAL INSTRUCTION — VISUAL CONSISTENCY:
All characters must appear IDENTICAL across every single image in this series.
Maintain with absolute precision:
- Same face: identical facial structure, eyes, nose, mouth, skin tone
- Same hair: exact color, length, texture, style — no variations whatsoever
- Same body: proportions and height ratios between all characters
- Same clothing: identical colors and style throughout
Treat every image as a frame from the same animated film.
Any deviation from these character descriptions is an error.

${charDescs}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 2: STYLE LOCK — art direction that stays constant across all pages
// ══════════════════════════════════════════════════════════════════════════════
function buildStyleBlock(
  illustrationStyle: string,
  comicStyle: string,
  category: string,
  tone?: string
): string {
  // Tone overrides illustration style if set (Spec Section 8.2)
  const artStyle = (tone && TONE_STYLE_LOCKS[tone])
    || ILLUSTRATION_STYLE_LOCKS[illustrationStyle]
    || ILLUSTRATION_STYLE_LOCKS.comic;
  const mood = COMIC_MOOD[comicStyle] || COMIC_MOOD.emotional;
  const atmosphere = CATEGORY_ATMOSPHERE[category] || CATEGORY_ATMOSPHERE.familie;

  return `ART STYLE: ${artStyle}
Mood/tone: ${mood}
Atmosphere: ${atmosphere}
IMPORTANT: High resolution, sharp details, professional print quality.
Every face must be clearly rendered with distinct features — no blurry or generic faces.

ABSOLUTE RULE: NO text, NO letters, NO words, NO speech bubbles,
NO captions, NO UI elements anywhere in the image.
The image must be a pure illustration only.
Leave approximately 20% empty or visually simple space at the top-left
corner of each panel for text overlay that will be added separately.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 3: SCENE — the flexible part that changes per page
// ══════════════════════════════════════════════════════════════════════════════
function buildMultiPanelSceneBlock(input: PagePromptInput): string {
  const { panels, location, timeOfDay } = input;
  const panelCount = panels.length;
  const layout = PANEL_LAYOUTS[panelCount] || PANEL_LAYOUTS[4];

  // Each panel gets a rich scene description
  const panelDescs = panels
    .map((p) => {
      return `[Panel ${p.nummer}]: ${p.szene}`;
    })
    .join("\n");

  return `COMIC PAGE COMPOSITION:
Create ONE single A4 portrait comic book page with exactly ${panelCount} panels.

LAYOUT: ${layout}
Page border: 12px cream/warm beige (#F5EDE0) visible around all edges.
Panel borders: solid black, 4px width, clean and precise.
Leave an 80px cream-colored header strip at the very top for title overlay (draw NOTHING there).

${location ? `LOCATION: ${location}` : ""}
${timeOfDay ? `LIGHTING: ${timeOfDay} — adjust all panel lighting accordingly.` : ""}

PANEL SCENES (illustrate each with maximum detail and emotion):
${panelDescs}

QUALITY: Professional comic book page, print-ready A4 quality.
Rich detailed backgrounds in every panel. Expressive character faces.
Cinematic camera angles that vary between panels (close-up, medium shot, wide establishing shot).
NEGATIVE: No text, no speech bubbles, no watermarks, no distorted faces, no extra fingers, no inconsistent characters between panels.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: buildComicPagePrompt
// Assembles all blocks in the correct order for gpt-image-1
// ══════════════════════════════════════════════════════════════════════════════
export function buildComicPagePrompt(input: PagePromptInput): string {
  const { characters, illustrationStyle, comicStyle, category, tone } = input;

  const block1 = buildConsistencyBlock(characters);
  const block2 = buildStyleBlock(illustrationStyle, comicStyle, category || "familie", tone);
  const block3 = buildMultiPanelSceneBlock(input);

  return [block1, block2, block3].filter(Boolean).join("\n\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE SCENE PROMPT (prepared for future single-image-per-panel mode)
// ══════════════════════════════════════════════════════════════════════════════
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
  const block1 = buildConsistencyBlock(characters);
  const block2 = buildStyleBlock(illustrationStyle, comicStyle, category, tone);

  const composition = layout === "wide"
    ? "cinematic wide shot, 16:9 landscape ratio"
    : layout === "tall"
    ? "portrait vertical composition"
    : "full page hero shot";

  const block3 = `SCENE TO ILLUSTRATE:
${scene}
${location ? `Location: ${location}.` : ""}
${timeOfDay ? `Lighting: ${timeOfDay} light.` : ""}
Composition: ${composition}
Leave 25% empty/lighter space at top-left for caption overlay.`;

  return [block1, block2, block3].filter(Boolean).join("\n\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// GPT-4o STORY STRUCTURE PROMPT
// Generates the page/panel structure from user's story input
// ══════════════════════════════════════════════════════════════════════════════
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
    liebe:      "Focus on romantic moments: first meeting, tender looks, meaningful gestures, relationship milestones",
    familie:    "Focus on family bonding: children's reactions, parental love, shared adventures, cozy moments",
    urlaub:     "Focus on travel: arrival excitement, discoveries, local culture, memorable moments, departure",
    feier:      "Focus on celebration: preparation, emotional speeches, fun moments, group joy, surprise",
    biografie:  "Focus on life journey: childhood memory, key milestone, relationship, achievement, reflection",
    freunde:    "Focus on friendship: shared adventure, inside joke, support moment, celebration, loyalty",
    sonstiges:  "Focus on the most emotionally resonant and visually interesting moments",
  };
  const catHint = categoryHints[category] || categoryHints.familie;

  return `You are a professional comic book author and visual storyteller.
Create a ${numPages}-page comic book structure in ${lang}.

STORY TONE: ${tone}
VISUAL STYLE: ${style}
NARRATIVE FOCUS: ${catHint}
${mustHaveSentences ? `\nMUST INCLUDE these key moments or sentences: "${mustHaveSentences}"` : ""}

CRITICAL RULES FOR PANEL SCENES:
- Each panel "szene" must be a COMPLETE, SELF-CONTAINED image description in English
- Include: WHO is in the scene, WHAT they are doing, WHERE they are, their FACIAL EXPRESSION, BODY LANGUAGE, and the LIGHTING/MOOD
- Be cinematically specific: "Leon (6) running toward turquoise water with arms spread wide, laughing, golden afternoon light, Sophie watching from beach blanket smiling" — NOT "Leon goes to the beach"
- Think like a film director: vary camera angles (close-up, medium shot, wide establishing shot, over-shoulder)
- Each scene must be visually distinct from the others

STRUCTURE RULES:
- ${numPages} pages, each with 3-5 panels
- Page 1: establish characters and setting (4 panels)
- Middle pages: develop the story with emotional peaks (3-5 panels, vary!)
- Last page: emotional conclusion, memorable final image (3-4 panels)
- Dialogs: max 8 words, natural ${lang}, emotionally fitting
- Page titles: 3-5 words, dramatic or funny, in ${lang}

Respond ONLY with valid JSON:
{
  "pages": [
    {
      "id": "page1",
      "pageNumber": 1,
      "title": "Page title in ${lang}",
      "location": "Specific English location description for the artist",
      "timeOfDay": "morning|afternoon|golden hour|sunset|night",
      "panels": [
        {
          "nummer": 1,
          "szene": "Complete English scene description with characters, action, setting, expressions, lighting — ready for image AI",
          "dialog": "Short ${lang} dialog max 8 words",
          "speaker": "Character name or null for no dialog",
          "bubble_type": "speech|caption|shout|thought"
        }
      ]
    }
  ]
}`;
}
