// Prompt Builder v8 — Short & focused (like ChatGPT)
// Key insight: shorter prompts = better images from gpt-image-1

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
// STYLE per category × comicStyle — short, punchy, no filler words
// ══════════════════════════════════════════════════════════════════════════════
const STYLE_MATRIX: Record<string, Record<string, string>> = {
  liebe:     { action: "dynamic superhero comic style, bold primary colors, wide action shots, Marvel/DC energy", emotional: "intimate golden light, elegant linework, romantic atmosphere", humor: "bright cheerful colors, exaggerated lovesick expressions, manga energy" },
  familie:   { action: "classic adventure comic style, rich colors, varied camera angles, Tintin meets Spider-Man", emotional: "rich warm colors, rounded characters, Pixar concept art quality", humor: "bright pop colors, exaggerated expressions, European comic strip style" },
  urlaub:    { action: "epic adventure comic style, saturated colors, cinematic wide shots, Indiana Jones energy", emotional: "luminous Mediterranean colors, panoramic compositions, travel book quality", humor: "bright holiday colors, exaggerated tourist situations, funny postcard style" },
  feier:     { action: "explosive celebration comic style, dynamic angles, motion lines, superhero party energy", emotional: "golden lighting, intimate moments, greeting card quality", humor: "bright festive colors, exaggerated celebration chaos, maximum fun" },
  biografie: { action: "graphic novel action style, dramatic shadows, varied perspectives, prestige comic energy", emotional: "muted earth tones, editorial linework, New Yorker illustration quality", humor: "retro color palette, expressive linework, illustrated memoir style" },
  freunde:   { action: "team-up comic style, dynamic group compositions, X-Men energy, varied shot types", emotional: "natural colors, intimate moments, warm ambient lighting", humor: "bright pop colors, exaggerated expressions, webcomic quality" },
  sonstiges: { action: "classic comic book style, varied camera angles, dynamic poses, professional superhero quality", emotional: "atmospheric colors, precise linework, cinematic lighting", humor: "bold outlines, bright colors, professional cartoon quality" },
};

// ══════════════════════════════════════════════════════════════════════════════
// BUILD SHORT IMAGE PROMPT — like the ChatGPT test prompt that worked
// ══════════════════════════════════════════════════════════════════════════════
export function buildComicPagePrompt(input: PagePromptInput): string {
  const { panels, characters, comicStyle, category, location, timeOfDay } = input;
  const panelCount = panels.length;

  const catStyles = STYLE_MATRIX[category || "familie"] || STYLE_MATRIX.sonstiges;
  const style = catStyles[comicStyle] || catStyles.emotional;

  const layoutDesc = panelCount <= 3
    ? "1 large panel on top, 2 panels on bottom"
    : panelCount === 5
    ? "2 on top, 1 wide middle, 2 on bottom"
    : "2×2 grid";

  const charBlock = characters.length > 0
    ? characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ")
    : "";

  const panelDescs = panels
    .map(p => `Panel ${p.nummer}: ${p.szene}`)
    .join("\n");

  // Short, focused prompt — quality instruction FIRST, then content
  return `Create a premium European comic book page with ${panelCount} panels in a ${layoutDesc}. CRITICAL: Each panel shows a COMPLETELY DIFFERENT scene, angle, and moment — no duplicates, no similar compositions.

${charBlock ? `Characters (keep identical in every panel): ${charBlock}\n` : ""}${panelDescs}
${location ? `\nSetting: ${location}.` : ""}${timeOfDay ? ` ${timeOfDay} lighting.` : ""}

Style: varied camera angles (close-ups, wide shots, over-shoulder views), ${style}, expressive faces, soft panel borders, professional graphic novel quality. Mix perspectives: not all close-ups, include establishing shots. No watercolor. No soft blur. No text in image.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE SCENE PROMPT (for future use)
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
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const style = catStyles[comicStyle] || catStyles.emotional;
  const charBlock = characters.length > 0
    ? characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ")
    : "";

  return `Create a premium European comic illustration. ${scene}${location ? ` Setting: ${location}.` : ""}${timeOfDay ? ` ${timeOfDay} lighting.` : ""}
${charBlock ? `Characters: ${charBlock}\n` : ""}
Style: varied camera angles (close-ups, wide shots, medium shots), ${style}, expressive faces, soft panel borders, professional graphic novel quality. No watercolor. No soft blur. No text.`;
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
    action:    "DYNAMIC: active verbs, quick scene changes, dramatic angles. Dialogs: short, direct.",
    emotional: "INTIMATE: glances, gestures, atmosphere, quiet moments. Dialogs: fewer but personal.",
    humor:     "HUMOROUS: mishaps, witty observations, comedic timing. Dialogs: casual, witty.",
  };

  return `You are a comic book author. Create a ${numPages}-page comic in ${lang}.

${storyModules[category] || storyModules.sonstiges}
${styleModules[comicStyle] || styleModules.emotional}
${mustHaveSentences ? `MUST INCLUDE: "${mustHaveSentences}"` : ""}

SCENE DESCRIPTIONS ("szene") — CRITICAL:
Write SHORT visual descriptions for an image AI. Max 2 sentences. Visual only.
- BAD: "Helga feels overwhelmed with joy as she sees her family"
- GOOD: "Wide shot: Helga (80, white curly hair, glasses) at garden gate, hands over mouth. Behind her: family around decorated table with lanterns, cheering. Golden afternoon light."

Include: WHO (name + key visual), WHAT (action), WHERE, LIGHTING. No narrative. No emotions in words — show them through expressions and body language.

CRITICAL — VARIETY:
- Every panel on a page must show a COMPLETELY DIFFERENT scene, angle, and moment
- NEVER repeat the same activity in two panels (e.g. not 2× looking at album, not 2× hanging decorations)
- Vary: close-up face, wide group shot, action moment, quiet detail, over-shoulder view
- Only include characters that are mentioned in the story — do NOT invent extra people
- Background people (strangers on street, crowd) are OK, but NO new named characters

RULES:
- ${numPages} pages, 3-4 panels each (prefer 4)
- Dialogs: max 15 words, natural ${lang}. Not every panel needs dialog.
- Page titles: 3-5 words, ${lang}.

JSON only:
{"pages":[{"id":"page1","pageNumber":1,"title":"...","location":"English location","timeOfDay":"morning|afternoon|golden hour|sunset|night","panels":[{"nummer":1,"szene":"Short visual description, max 2 sentences","dialog":"Short ${lang} dialog or null","speaker":"Name or null","bubble_type":"speech|caption|shout|thought"}]}]}`;
}
