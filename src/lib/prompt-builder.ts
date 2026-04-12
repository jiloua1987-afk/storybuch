// Fix + Flex Prompt Builder
// Baut den optimalen gpt-image-1 Prompt abhängig von Kategorie, Stil und Kontext

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

// ── Stil-Definitionen ─────────────────────────────────────────────────────────
const ILLUSTRATION_STYLES: Record<string, string> = {
  comic:       "warm watercolor comic illustration, bold black outlines, vibrant saturated colors, cinematic lighting, hand-drawn feel, professional comic book art",
  aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes, dreamy romantic atmosphere, no harsh outlines",
  bleistift:   "detailed pencil sketch comic, crosshatching for shadows, hand-drawn linework, black and white with subtle warm tones",
  realistisch: "realistic comic art style, detailed digital painting, warm cinematic lighting, photorealistic faces with comic proportions",
};

const COMIC_STYLE_MODIFIERS: Record<string, string> = {
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

// ── FIXER ANTEIL ──────────────────────────────────────────────────────────────
function buildFixed(
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string
): string {
  const style = ILLUSTRATION_STYLES[illustrationStyle] || ILLUSTRATION_STYLES.comic;
  const comicMod = COMIC_STYLE_MODIFIERS[comicStyle] || COMIC_STYLE_MODIFIERS.emotional;
  const atmosphere = CATEGORY_ATMOSPHERE[category] || CATEGORY_ATMOSPHERE.familie;

  const charAnchors = characters.length > 0
    ? `CHARACTERS (keep 100% consistent in every panel — same face, hair, clothes, proportions): ${
        characters.map((c) => `[${c.name}: ${c.visual_anchor}]`).join(" ")
      }.`
    : "";

  return `${charAnchors} Art style: ${style}. Mood: ${comicMod}. Atmosphere: ${atmosphere}. NEVER add random text, logos, or watermarks anywhere in the image.`;
}

// ── FLEXIBLER ANTEIL ──────────────────────────────────────────────────────────
function buildFlex(input: PagePromptInput): string {
  const { title, panels, location, timeOfDay } = input;
  const panelCount = panels.length;

  const layoutMap: Record<number, string> = {
    3: "3-panel layout: ONE wide panoramic panel on top (full width), TWO equal panels side by side on bottom row",
    4: "4-panel layout: 2x2 grid of equal panels",
    5: "5-panel layout: TWO panels on top row, ONE wide panel in middle (full width), TWO panels on bottom row",
    6: "6-panel layout: 3 columns x 2 rows grid",
  };
  const layout = layoutMap[panelCount] || layoutMap[4];

  const panelDescs = panels.map((p) => {
    const captionText = p.dialog
      ? p.speaker ? `"${p.speaker}: ${p.dialog}"` : `"${p.dialog}"`
      : null;
    const captionInstruction = captionText
      ? `White rectangle caption box with thin black border in upper-left corner containing text: ${captionText}`
      : "No caption box needed";
    return `[Panel ${p.nummer}]: ${p.szene}. ${captionInstruction}.`;
  }).join("\n");

  return `Create ONE single comic book page image with ${panelCount} panels.
Layout: ${layout}.
Thick black panel borders (5px) between all panels.
Cream/warm beige background (#F5EDE0) visible outside panels and as page border.
BOLD BLACK page title at very top center: "${title.toUpperCase()}" — large comic font, black text on cream background.
${location ? `Location: ${location}.` : ""} ${timeOfDay ? `Lighting: ${timeOfDay} light.` : ""}

Panel descriptions:
${panelDescs}

Caption box style: white fill, 1px black border, rounded corners, black readable text, positioned in corner of panel.
Overall: professional comic book page, print-ready quality, warm and inviting.`;
}

// ── HAUPT-FUNKTION ────────────────────────────────────────────────────────────
export function buildComicPagePrompt(input: PagePromptInput): string {
  const fixed = buildFixed(
    input.characters,
    input.illustrationStyle,
    input.comicStyle,
    input.category || "familie"
  );
  const flex = buildFlex(input);
  return `${fixed}\n\n${flex}`;
}

// ── GPT-4o Story-Struktur Prompt ──────────────────────────────────────────────
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
- Each page has 4-5 panels telling a coherent mini-story
- Panel scenes: VERY specific and visual (who, what, where, facial expression, body language, lighting)
- Dialogs: SHORT (max 8 words), natural, in ${lang}, emotionally fitting
- Vary panel layouts across pages (not always 2x2)
- Each page title: 3-5 words, dramatic or funny, in ${lang}

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
          "szene": "Very specific English scene for image generation",
          "dialog": "Short ${lang} dialog max 8 words",
          "speaker": "Character name or null",
          "bubble_type": "speech|caption|shout|thought"
        }
      ]
    }
  ]
}`;
}
