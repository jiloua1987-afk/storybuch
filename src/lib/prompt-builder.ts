// Prompt Builder v4 — Dedizierte Prompts pro Kategorie × Comic-Stil
// 7 Kategorien × 3 Comic-Stile = 21 Kombinationen
// Kein separater Tonalitäts-Layer mehr — alles in einer Matrix

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
  tone?: string; // legacy, ignored — category determines tone
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLE MATRIX: category × comicStyle → full art direction string
// Each combination gets a unique, detailed prompt optimized for gpt-image-1
// ══════════════════════════════════════════════════════════════════════════════
const STYLE_MATRIX: Record<string, Record<string, string>> = {
  liebe: {
    action:    "Romantic comic art with dynamic energy. Bold black outlines, rich warm colors (deep reds, golds, sunset oranges). Dramatic romantic poses — wind in hair, passionate gestures, cinematic close-ups. High contrast lighting with lens flares and bokeh effects. Professional European BD quality.",
    emotional: "Tender romantic illustration. Soft watercolor washes in warm golden and rose tones. Gentle linework, intimate close-ups of hands touching, eyes meeting. Dreamy soft-focus backgrounds. Golden hour lighting throughout. Painterly, like a romantic illustrated novel.",
    humor:     "Playful romantic comedy comic style. Bright cheerful colors, exaggerated lovesick expressions, cartoon hearts and sparkles. Bold clean outlines, expressive body language. Characters with oversized eyes and comedic reactions. Fun and lighthearted, like a romantic manga.",
  },
  familie: {
    action:    "Energetic family adventure comic. Bold black outlines, vibrant saturated colors, dynamic compositions. Children with exaggerated excited expressions, parents in heroic poses. Motion lines, dramatic angles. Professional comic book quality like Asterix or Tintin.",
    emotional: "Warm family storybook illustration. Soft rounded linework, gentle watercolor colors (warm yellows, soft greens, cozy browns). Tender moments between parents and children. Soft natural lighting, cozy domestic settings. Professional children's book quality like a Pixar concept art.",
    humor:     "Fun family comedy comic. Bold clean outlines, bright pop colors. Kids with wildly exaggerated expressions, parents with comedic reactions. Slapstick body language, playful chaos. Cartoon-style with professional quality. Like a European family comic strip.",
  },
  urlaub: {
    action:    "Adventure travel comic with cinematic energy. Bold outlines, vivid tropical and Mediterranean colors (turquoise, coral, golden sand). Dynamic wide-angle compositions, dramatic landscapes. Characters in action — running, jumping, exploring. Movie poster quality.",
    emotional: "Beautiful travel memoir illustration. Luminous watercolor style with Mediterranean light — turquoise seas, golden sunsets, terracotta villages. Soft linework, panoramic compositions. Nostalgic and dreamy, like a painted travel journal. Rich atmospheric detail.",
    humor:     "Hilarious vacation comic. Bright saturated holiday colors, exaggerated tourist situations. Characters with oversized sunglasses, comically overloaded luggage, funny tan lines. Bold outlines, cartoon energy. Like a funny postcard come to life.",
  },
  feier: {
    action:    "Explosive celebration comic. Bold dynamic outlines, confetti and streamers in motion. Vibrant party colors (gold, magenta, electric blue). Characters in dramatic surprise poses, champagne splashing. High energy, like a party captured in comic book form.",
    emotional: "Heartwarming celebration illustration. Warm golden lighting, soft watercolor tones. Intimate moments — tearful speeches, group hugs, candle-lit faces. Gentle linework with rich emotional detail. Like a beautifully illustrated greeting card.",
    humor:     "Hilarious party comic. Bright festive colors, exaggerated celebration chaos. Characters with comically surprised faces, cake disasters, dance floor fails. Bold cartoon outlines, maximum fun energy. Like a funny birthday card illustration.",
  },
  biografie: {
    action:    "Epic life story graphic novel. Dramatic cinematic lighting, rich deep colors with sepia undertones. Bold compositions showing key life moments. Strong black outlines, detailed backgrounds. Movie-quality biographical illustration, like a prestige graphic novel.",
    emotional: "Nostalgic memoir illustration. Warm muted earth tones mixed with selective color highlights. Soft editorial linework, intimate portrait compositions. Timeless settings, emotional depth in every face. Like a New Yorker illustration or illustrated autobiography.",
    humor:     "Charming biographical comic with wit. Warm retro color palette, clean expressive linework. Characters shown at different life stages with gentle humor. Exaggerated period details, playful anachronisms. Like an illustrated memoir with a smile.",
  },
  freunde: {
    action:    "High-energy friendship adventure comic. Bold outlines, vibrant saturated colors. Friends in dynamic group poses, high-fiving, running together. Motion lines, dramatic angles, comic book energy. Like a superhero team-up but with real friends.",
    emotional: "Warm friendship illustration. Soft natural colors, gentle linework. Intimate moments — shared laughter, supportive hugs, quiet conversations. Warm ambient lighting, cozy settings. Like a beautifully illustrated friendship story.",
    humor:     "Hilarious buddy comedy comic. Bright pop colors, exaggerated funny expressions. Friends in ridiculous situations, inside jokes visualized. Bold cartoon outlines, maximum comedic timing. Like a funny webcomic with professional quality.",
  },
  sonstiges: {
    action:    "Dynamic storytelling comic. Bold black outlines, rich cinematic colors. Dramatic compositions with varied camera angles. Professional comic book quality with high contrast and sharp details. Expressive characters, detailed backgrounds.",
    emotional: "Beautiful narrative illustration. Warm atmospheric colors, soft painterly linework. Intimate character moments with emotional depth. Cinematic lighting, rich environmental detail. Professional illustrated novel quality.",
    humor:     "Entertaining comic with personality. Clean bold outlines, bright cheerful colors. Expressive exaggerated characters, playful compositions. Fun visual storytelling with comedic timing. Professional cartoon quality.",
  },
};

const PANEL_LAYOUTS: Record<number, string> = {
  3: "3-panel comic page: ONE wide cinematic panel spanning full width on top (60% height), TWO equal panels side by side on bottom row (40% height). Clear 4px black borders.",
  4: "4-panel comic page: 2×2 grid of equal panels. Clear 4px black borders. Each panel roughly 50% width × 50% height.",
  5: "5-panel comic page: TWO panels on top row, ONE wide cinematic panel spanning full width in middle, TWO panels on bottom row. Clear 4px black borders.",
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 1: CONSISTENCY — always first, model reads top-down
// ══════════════════════════════════════════════════════════════════════════════
function buildConsistencyBlock(characters: Character[]): string {
  if (characters.length === 0) return "";

  const charDescs = characters
    .map((c) => `CHARACTER "${c.name}": ${c.visual_anchor}`)
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
// BLOCK 2: ART DIRECTION — from the style matrix
// ══════════════════════════════════════════════════════════════════════════════
function buildArtDirectionBlock(category: string, comicStyle: string): string {
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const artDirection = catStyles[comicStyle] || catStyles.emotional;

  return `ART DIRECTION: ${artDirection}

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
function buildSceneBlock(input: PagePromptInput): string {
  const { panels, location, timeOfDay } = input;
  const panelCount = panels.length;
  const layout = PANEL_LAYOUTS[panelCount] || PANEL_LAYOUTS[4];

  const panelDescs = panels
    .map((p) => `[Panel ${p.nummer}]: ${p.szene}`)
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
// ══════════════════════════════════════════════════════════════════════════════
export function buildComicPagePrompt(input: PagePromptInput): string {
  const { characters, comicStyle, category } = input;

  const block1 = buildConsistencyBlock(characters);
  const block2 = buildArtDirectionBlock(category || "familie", comicStyle);
  const block3 = buildSceneBlock(input);

  return [block1, block2, block3].filter(Boolean).join("\n\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE SCENE PROMPT (for future single-image-per-panel mode)
// ══════════════════════════════════════════════════════════════════════════════
export function buildScenePrompt(
  scene: string,
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string,
  location?: string,
  timeOfDay?: string,
): string {
  const block1 = buildConsistencyBlock(characters);
  const block2 = buildArtDirectionBlock(category, comicStyle);
  const block3 = `SCENE TO ILLUSTRATE:
${scene}
${location ? `Location: ${location}.` : ""}
${timeOfDay ? `Lighting: ${timeOfDay} light.` : ""}
Composition: cinematic wide shot.
Leave 25% empty/lighter space at top-left for caption overlay.`;

  return [block1, block2, block3].filter(Boolean).join("\n\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// GPT-4o STORY STRUCTURE PROMPT
// ══════════════════════════════════════════════════════════════════════════════
export function buildGPTStructurePrompt(
  lang: string,
  tone: string,
  comicStyle: string,
  mustHaveSentences: string,
  numPages: number,
  category: string = "familie"
): string {
  // Use the style matrix for consistent art direction in scene descriptions
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const artDirection = catStyles[comicStyle] || catStyles.emotional;

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

VISUAL STYLE FOR THIS BOOK: ${artDirection}
NARRATIVE FOCUS: ${catHint}
${mustHaveSentences ? `\nMUST INCLUDE these key moments or sentences: "${mustHaveSentences}"` : ""}

CRITICAL RULES FOR PANEL SCENES:
- Each panel "szene" must be a COMPLETE, SELF-CONTAINED image description in English
- Include: WHO is in the scene, WHAT they are doing, WHERE they are, their FACIAL EXPRESSION, BODY LANGUAGE, and the LIGHTING/MOOD
- Be cinematically specific: "Helga (80) opening garden gate, hands flying to her face in shock, tears of joy, 20 family members behind decorated table with lanterns, warm golden afternoon light" — NOT "Helga sees the surprise"
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
