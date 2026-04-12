// Fix + Flex Prompt Builder
// Baut den optimalen gpt-image-1 Prompt für eine Comic-Seite

export interface Character {
  name: string;
  age: number;
  visual_anchor: string;
  bubble_color?: string;
}

export interface Panel {
  nummer: number;
  szene: string;       // Englische Szenen-Beschreibung
  dialog?: string;     // Deutscher Dialog/Caption-Text
  speaker?: string;    // Wer spricht
  bubble_type?: "speech" | "caption" | "shout" | "thought";
}

export interface PagePromptInput {
  title: string;
  panels: Panel[];
  characters: Character[];
  illustrationStyle: string;
  comicStyle: string;
  location?: string;
  timeOfDay?: string;
}

// ── FIXER ANTEIL (immer gleich) ───────────────────────────────────────────────
function buildFixedPart(characters: Character[], illustrationStyle: string): string {
  const styleMap: Record<string, string> = {
    comic:       "warm watercolor comic illustration, bold outlines, vibrant colors, cinematic lighting, hand-drawn feel",
    aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes, dreamy atmosphere",
    bleistift:   "pencil sketch comic style, detailed hand-drawn linework, crosshatching",
    realistisch: "realistic comic art, detailed digital painting, warm cinematic lighting",
  };
  const style = styleMap[illustrationStyle] || styleMap.comic;

  // Character anchors
  const charAnchors = characters.length > 0
    ? characters.map((c) => `${c.name}: ${c.visual_anchor}`).join("; ")
    : "";

  const consistency = characters.length > 0
    ? `CRITICAL: Keep ALL characters visually consistent across every panel — same faces, same hair color and style, same clothing, same body proportions throughout the entire image. Characters: ${charAnchors}.`
    : "CRITICAL: Keep all characters visually consistent across every panel.";

  return `${consistency} Style: ${style}. NO random text anywhere in the image except inside the white caption boxes as specified.`;
}

// ── FLEXIBLER ANTEIL (pro Seite) ──────────────────────────────────────────────
function buildFlexiblePart(input: PagePromptInput): string {
  const { title, panels, location, timeOfDay } = input;

  const panelCount = panels.length;

  // Layout instruction based on panel count
  const layoutMap: Record<number, string> = {
    3: "3-panel layout: one wide panel on top spanning full width, two equal panels side by side on bottom",
    4: "4-panel layout: 2x2 grid, equal sized panels",
    5: "5-panel layout: one wide panel on top, three panels in a row below, or 2 on top and 3 on bottom",
    6: "6-panel layout: 3x2 grid",
  };
  const layout = layoutMap[panelCount] || layoutMap[4];

  // Panel descriptions
  const panelDescs = panels.map((p) => {
    const dialogPart = p.dialog
      ? p.speaker
        ? `White caption box in corner: "${p.speaker}: ${p.dialog}"`
        : `White caption box in corner: "${p.dialog}"`
      : "";
    return `Panel ${p.nummer}: ${p.szene}. ${dialogPart}`;
  }).join("\n");

  const locationHint = location ? `Setting: ${location}.` : "";
  const timeHint = timeOfDay ? `Time of day: ${timeOfDay}.` : "";

  return `
Create a single comic book page with ${panelCount} panels.
${layout}.
Thick black borders between panels (4-6px).
Cream/beige background (#F5EDE0) outside panels.
Bold black page title at top: "${title.toUpperCase()}" in comic font.
${locationHint} ${timeHint}

${panelDescs}

Each caption box: white rectangle with thin black border, positioned in upper-left or upper-right corner of panel, black text, readable font size.
Warm Mediterranean colors, golden sunlight, joyful atmosphere.`.trim();
}

// ── HAUPT-FUNKTION ────────────────────────────────────────────────────────────
export function buildComicPagePrompt(input: PagePromptInput): string {
  const fixed = buildFixedPart(input.characters, input.illustrationStyle);
  const flexible = buildFlexiblePart(input);
  return `${fixed}\n\n${flexible}`;
}

// ── GPT-4o generiert Panel-Beschreibungen ────────────────────────────────────
// Wird in comic-page-generator.ts aufgerufen
export function buildGPTStructurePrompt(
  lang: string,
  tone: string,
  comicStyle: string,
  mustHaveSentences: string,
  numPages: number
): string {
  const styleDesc: Record<string, string> = {
    action:    "dynamic, energetic, exaggerated expressions",
    emotional: "warm, tender, storytelling focus",
    humor:     "funny, playful, exaggerated reactions",
  };
  const style = styleDesc[comicStyle] || styleDesc.emotional;

  return `You are a comic book author. Create a ${numPages}-page comic structure in ${lang}.
Tone: ${tone}. Visual style: ${style}.
${mustHaveSentences ? `These moments/sentences MUST appear: ${mustHaveSentences}` : ""}

For each page create 4-5 panels that tell a coherent mini-story.
Panel scenes must be VERY specific and visual: who does what, where, facial expressions, body language.
Dialogs must be SHORT (max 8 words), natural, in ${lang}.
Vary panel layouts: not always 2x2 — sometimes wide panorama + small panels.

Respond ONLY with JSON:
{
  "pages": [
    {
      "id": "page1",
      "pageNumber": 1,
      "title": "Page title in ${lang} (3-5 words, dramatic/funny)",
      "location": "specific location description in English",
      "timeOfDay": "morning/afternoon/sunset/night",
      "panels": [
        {
          "nummer": 1,
          "szene": "Very specific English scene description for image generation (who, what, where, emotion, lighting)",
          "dialog": "Short dialog or caption in ${lang} (max 8 words)",
          "speaker": "Character name or null for narrator caption",
          "bubble_type": "speech or caption"
        }
      ]
    }
  ]
}`;
}
