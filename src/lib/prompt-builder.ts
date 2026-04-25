// Prompt Builder v7 — Quality-First Architecture
// Priority order: Quality → Style → Layout → Characters → Scene → Negatives
// Based on GPT analysis: model allocates attention top-down

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

// ══════════════════════════════════════════════════════════════════════════════
// STYLE MATRIX: category × comicStyle → style lock string
// No "warm", "cozy", "soft", "storybook", "children's book" — these cause blur
// ══════════════════════════════════════════════════════════════════════════════
const STYLE_MATRIX: Record<string, Record<string, string>> = {
  liebe: {
    action:    "Romantic graphic novel. Rich reds, golds, sunset oranges. Dramatic poses, cinematic close-ups. High contrast lighting. Polished European BD finish.",
    emotional: "Elegant romantic illustration. Golden and rose palette, precise shading. Intimate compositions. Clean rendering, graphic novel quality.",
    humor:     "Romantic comedy comic. Bright cheerful colors, exaggerated lovesick expressions. Bold outlines, expressive body language. Manga-inspired energy.",
  },
  familie: {
    action:    "Energetic family adventure comic. Vibrant saturated colors, dynamic compositions. Exaggerated excited expressions. Motion lines, dramatic angles. Asterix/Tintin quality.",
    emotional: "Premium family illustration. Rich golden yellows, greens, browns. Rounded character designs. Detailed domestic settings. Pixar concept art quality.",
    humor:     "Family comedy comic. Bold outlines, bright pop colors. Wildly exaggerated expressions, slapstick body language. European comic strip quality.",
  },
  urlaub: {
    action:    "Adventure travel comic. Vivid tropical colors — turquoise, coral, golden sand. Dynamic wide-angle compositions. Dramatic landscapes. Movie poster quality.",
    emotional: "Travel illustration. Luminous Mediterranean colors — turquoise seas, golden sunsets, terracotta. Panoramic compositions. Rich atmospheric detail.",
    humor:     "Vacation comedy comic. Bright saturated holiday colors, exaggerated tourist situations. Bold outlines, cartoon energy. Funny postcard quality.",
  },
  feier: {
    action:    "Celebration comic. Bold dynamic outlines, confetti in motion. Vibrant party colors — gold, magenta, electric blue. Dramatic surprise poses. High energy.",
    emotional: "Celebration illustration. Golden lighting, rich tones. Intimate moments — tearful speeches, group hugs. Detailed emotional rendering.",
    humor:     "Party comedy comic. Bright festive colors, exaggerated chaos. Comically surprised faces, cake disasters. Bold cartoon outlines, maximum fun.",
  },
  biografie: {
    action:    "Epic biographical graphic novel. Dramatic cinematic lighting, deep colors with sepia undertones. Bold compositions. Prestige graphic novel quality.",
    emotional: "Memoir illustration. Muted earth tones with selective color highlights. Editorial linework, intimate portraits. New Yorker illustration quality.",
    humor:     "Biographical comic with wit. Retro color palette, expressive linework. Characters at different life stages with gentle humor.",
  },
  freunde: {
    action:    "Friendship adventure comic. Vibrant saturated colors. Dynamic group poses, high-fiving. Motion lines, dramatic angles. Superhero team-up energy.",
    emotional: "Friendship illustration. Natural colors, precise linework. Shared laughter, supportive moments. Ambient lighting, detailed settings.",
    humor:     "Buddy comedy comic. Bright pop colors, exaggerated funny expressions. Ridiculous situations. Bold outlines, maximum comedic timing.",
  },
  sonstiges: {
    action:    "Dynamic storytelling comic. Bold outlines, rich cinematic colors. Dramatic compositions, varied camera angles. High contrast, sharp details.",
    emotional: "Narrative illustration. Atmospheric colors, precise linework. Intimate character moments. Cinematic lighting, rich detail.",
    humor:     "Entertaining comic. Bold outlines, bright cheerful colors. Exaggerated characters, playful compositions. Professional cartoon quality.",
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 1 (TOP PRIORITY): RENDER QUALITY — model reads this first
// ══════════════════════════════════════════════════════════════════════════════
function buildQualityBlock(): string {
  return `PREMIUM EUROPEAN COMIC PAGE.
Professional graphic novel illustration. Crisp black ink outlines. Clean contour linework. Sharp facial rendering. High detail. Strong color separation. Print-quality comic rendering. Clear forms.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 2: STYLE LOCK — hard visual style definition
// ══════════════════════════════════════════════════════════════════════════════
function buildStyleBlock(category: string, comicStyle: string): string {
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const styleDirection = catStyles[comicStyle] || catStyles.emotional;

  return `STYLE: ${styleDirection}
Polished graphic novel finish. Clean inked outlines. Expressive faces. Vivid controlled colors. Cinematic lighting. Detailed but clean backgrounds. Professional print-quality rendering.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 3: LAYOUT — panel structure
// ══════════════════════════════════════════════════════════════════════════════
function buildLayoutBlock(panelCount: number, location?: string, timeOfDay?: string): string {
  // Simpler layout instructions — less confusion for the model
  const layoutDesc = panelCount <= 3
    ? "3 panels: 1 large panel on top half, 2 equal panels on bottom half"
    : panelCount === 5
    ? "5 panels: 2 small on top row, 1 wide in middle row, 2 small on bottom row"
    : "4 panels in a 2×2 grid, all panels equal size";

  return `LAYOUT: Single comic page with exactly ${panelCount} distinct panels. ${layoutDesc}. Each panel shows a DIFFERENT scene — no repeated content. Bold black borders separating every panel. Every panel must be fully visible, not cropped or cut off.
${location ? `Setting: ${location}.` : ""}${timeOfDay ? ` Lighting: ${timeOfDay}.` : ""}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 4: CHARACTER CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════════
function buildCharacterBlock(characters: Character[]): string {
  if (characters.length === 0) return "";

  const charDescs = characters
    .map((c) => `${c.name}: ${c.visual_anchor}`)
    .join("\n");

  return `CHARACTERS (visually identical in every panel — same face, hair, clothes, proportions):
${charDescs}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 5: SCENE CONTENT — short, visual only
// ══════════════════════════════════════════════════════════════════════════════
function buildSceneBlock(panels: Panel[]): string {
  const panelDescs = panels
    .map((p) => `[Panel ${p.nummer}]: ${p.szene}`)
    .join("\n");

  return `SCENE:\n${panelDescs}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 6: HARD NEGATIVES — at the end
// ══════════════════════════════════════════════════════════════════════════════
function buildNegativeBlock(): string {
  return `NEGATIVE: No watercolor. No painterly blur. No soft wash. No muddy beige cast. No blurry faces. No generic faces. No distorted anatomy. No text. No captions. No speech bubbles.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: buildComicPagePrompt
// Priority: Quality → Style → Layout → Characters → Scene → Negatives
// ══════════════════════════════════════════════════════════════════════════════
export function buildComicPagePrompt(input: PagePromptInput): string {
  const { panels, characters, comicStyle, category, location, timeOfDay } = input;

  return [
    buildQualityBlock(),
    buildStyleBlock(category || "familie", comicStyle),
    buildLayoutBlock(panels.length, location, timeOfDay),
    buildCharacterBlock(characters),
    buildSceneBlock(panels),
    buildNegativeBlock(),
  ].filter(Boolean).join("\n\n");
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
  return [
    buildQualityBlock(),
    buildStyleBlock(category, comicStyle),
    buildCharacterBlock(characters),
    `SCENE: ${scene}${location ? ` Setting: ${location}.` : ""}${timeOfDay ? ` Lighting: ${timeOfDay}.` : ""}`,
    buildNegativeBlock(),
  ].filter(Boolean).join("\n\n");
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
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const artDirection = catStyles[comicStyle] || catStyles.emotional;

  const storyModules: Record<string, string> = {
    liebe:     "Romantic personal story. Key moments: first spark, intimate detail, emotional development, meaningful conclusion.",
    familie:   "Family story. Key moments: children's unique personalities, chaotic situations, humor mixed with tenderness, emotional closeness.",
    urlaub:    "Travel story. Key moments: arrival excitement, discoveries, spontaneous adventures, funny mishaps, emotional farewell.",
    feier:     "Celebration story. Key moments: secret preparation, the big surprise, emotional reactions, memorable conclusion.",
    biografie: "Life journey. Key moments: vivid childhood memory, turning point, important relationship, proud achievement, reflection.",
    freunde:   "Friendship story. Key moments: how it started, shared adventure, insider moment, loyalty, emotional bond.",
    sonstiges: "Personal memory with clear emotional core. Concrete moments, personal dynamics, strong conclusion.",
  };

  const styleModules: Record<string, string> = {
    action:    "DYNAMIC style: active verbs, quick scene changes, physical movement, dramatic angles. Dialogs: short, direct.",
    emotional: "INTIMATE style: glances, gestures, atmosphere, quiet meaningful moments. Dialogs: fewer but personal.",
    humor:     "HUMOROUS style: mishaps, witty observations, sympathetic chaos, comedic timing. Dialogs: casual, witty.",
  };

  return `You are a comic book author. Create a ${numPages}-page comic in ${lang}.

${storyModules[category] || storyModules.sonstiges}
${styleModules[comicStyle] || styleModules.emotional}
${mustHaveSentences ? `MUST INCLUDE: "${mustHaveSentences}"` : ""}

CRITICAL — SCENE DESCRIPTIONS ("szene"):
Each "szene" is a SHORT visual description for an image AI. Keep it concise and visual:
- WHO (by name + key visual feature), WHAT (action), WHERE, EXPRESSION, LIGHTING
- Max 2 sentences per scene. Visual only — no narrative, no emotions in words.
- BAD: "Helga feels overwhelmed with joy as she sees her family gathered in the garden"
- GOOD: "Wide shot: Helga (80, white curly hair, glasses) at garden gate, hands over mouth, tears on cheeks. Behind her: decorated table with lanterns, 20 family members cheering. Golden afternoon light."

RULES:
- ${numPages} pages, 3-5 panels each. Vary panel count.
- Dialogs: max 8 words, natural ${lang}. Not every panel needs dialog.
- Page titles: 3-5 words, ${lang}.

JSON only:
{"pages":[{"id":"page1","pageNumber":1,"title":"...","location":"English location","timeOfDay":"morning|afternoon|golden hour|sunset|night","panels":[{"nummer":1,"szene":"Short visual scene description","dialog":"Short ${lang} dialog or null","speaker":"Name or null","bubble_type":"speech|caption|shout|thought"}]}]}`;
}
