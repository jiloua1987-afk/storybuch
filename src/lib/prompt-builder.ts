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
  liebe:     { action: "bold ink outlines, flat primary colors, dynamic superhero comic style, Marvel/DC energy — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, warm flat colors, elegant European comic linework, romantic atmosphere — NOT photorealistic", humor: "bold ink outlines, bright flat colors, exaggerated lovesick expressions, manga-inspired comic style — NOT photorealistic" },
  familie:   { action: "bold ink outlines, rich flat colors, classic adventure comic style, Tintin meets Spider-Man — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, warm flat colors, rounded expressive characters, European graphic novel style — NOT photorealistic", humor: "bold ink outlines, bright pop colors, exaggerated expressions, European comic strip style — NOT photorealistic" },
  urlaub:    { action: "bold ink outlines, saturated flat colors, epic adventure comic style, Indiana Jones energy — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, luminous flat Mediterranean colors, European travel comic style — NOT photorealistic", humor: "bold ink outlines, bright flat holiday colors, exaggerated tourist situations, funny comic postcard style — NOT photorealistic" },
  feier:     { action: "bold ink outlines, vibrant flat colors, explosive celebration comic style, dynamic motion lines — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, golden flat colors, intimate European comic style — NOT photorealistic", humor: "bold ink outlines, bright festive flat colors, exaggerated celebration chaos, maximum comic fun — NOT photorealistic" },
  biografie: { action: "bold ink outlines, dramatic flat colors, graphic novel action style, prestige comic energy — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, muted earth flat tones, editorial comic linework, graphic memoir style — NOT photorealistic", humor: "bold ink outlines, retro flat color palette, expressive comic linework, illustrated memoir style — NOT photorealistic" },
  freunde:   { action: "bold ink outlines, vibrant flat colors, team-up comic style, dynamic group compositions — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, natural flat colors, intimate European comic style, warm atmosphere — NOT photorealistic", humor: "bold ink outlines, bright pop flat colors, exaggerated expressions, webcomic style — NOT photorealistic" },
  sonstiges: { action: "bold ink outlines, flat colors, classic comic book style, dynamic poses, professional graphic novel quality — NOT photorealistic, NOT a painting", emotional: "bold ink outlines, atmospheric flat colors, precise comic linework, cinematic lighting — NOT photorealistic", humor: "bold ink outlines, bright flat colors, professional cartoon quality — NOT photorealistic" },
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
  return `Create a premium European comic book page with ${panelCount} panels in a ${layoutDesc}. 

CRITICAL STYLE: This MUST look like a comic book illustration — bold ink outlines, flat color areas, stylized faces. NOT a photo, NOT photorealistic, NOT a painting. Think Tintin, Asterix, European graphic novels. Stylized expressive faces, NOT photographic accuracy.

CRITICAL: Sharp, detailed facial features with clearly defined eyes, nose, mouth, and expressions. Maximum 2-4 people per panel with visible faces. Each panel shows a COMPLETELY DIFFERENT scene, angle, and moment — no duplicates, no similar compositions. Each character appears ONLY ONCE per panel — no duplicates of the same person. Do NOT invent or add any people not listed in the characters below.

ABSOLUTELY NO TEXT IN IMAGE: No panel titles, no page titles, no captions, no labels, no letters, no words, no speech bubbles anywhere in the generated image. Text is added separately.

${charBlock ? `Characters (keep identical in every panel with recognizable faces): ${charBlock}\n` : ""}${panelDescs}
${location ? `\nSetting: ${location}.` : ""}${timeOfDay ? ` ${timeOfDay} lighting.` : ""}

Style: varied camera angles (close-ups, wide shots, over-shoulder views), ${style}, expressive stylized faces with clear features, bold ink outlines, flat colors, soft panel borders, professional graphic novel quality. Mix perspectives: not all close-ups, include establishing shots. For crowd scenes: background people as silhouettes or slightly out of focus. For beach/outdoor scenes: bright natural light, vivid colors, characters in appropriate clothing. No watercolor. No soft blur. No photorealism.`;
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

CRITICAL: Generate MINIMUM ${numPages} pages. Long stories are good — use all the details provided!

${storyModules[category] || storyModules.sonstiges}
${styleModules[comicStyle] || styleModules.emotional}
${mustHaveSentences ? `MUST INCLUDE: "${mustHaveSentences}"` : ""}

SCENE DESCRIPTIONS ("szene") — CRITICAL:
Write SHORT visual descriptions for an image AI. Max 2 sentences. Visual only.
- BAD: "Helga feels overwhelmed with joy as she sees her family"
- GOOD: "Wide shot: Helga (80, white curly hair, glasses) at garden gate, hands over mouth. Behind her: family around decorated table with lanterns, cheering. Golden afternoon light."

Include: WHO (name + key visual), WHAT (action), WHERE, LIGHTING. No narrative. No emotions in words — show them through expressions and body language.

DIALOGS — CRITICAL FOR STORYTELLING:
- EVERY panel MUST have dialog or a narrator caption — NO silent panels
- Create CONVERSATIONS, not monologues — characters talk TO EACH OTHER
- Each dialog: 10-18 words, natural ${lang}, vivid and personal
- Vary speakers: not all from one person, create back-and-forth exchanges
- Example: Panel 1: Mama asks question → Panel 2: Papa answers → Panel 3: Child reacts
- Be CREATIVE and SPECIFIC — reference actual details from the story
- ONLY assign dialog to characters who are VISIBLE in that panel's "szene" description

DIALOG EXAMPLES (GOOD vs BAD):
❌ BAD (boring, too short):
  Panel 1: "Wir sind da." / Panel 2: "Ja, endlich."
✅ GOOD (vivid, engaging):
  Panel 1: "Mama, schau! Das Meer ist ja riesig wie in meinem Traum!" 
  Panel 2: "Und es riecht nach Salz und Abenteuer — genau wie ich es dir versprochen habe!"
❌ BAD (generic):
  "Schön hier."
✅ GOOD (specific, character voice):
  "Opa, dein Garten ist noch schöner als auf den Fotos!"

CRITICAL — CHARACTER VISIBILITY:
- Prefer showing characters facing the camera or from the side to see expressions
- Back views are OK when it serves the story (e.g., looking at something, walking away)
- Most panels should show faces clearly so readers can connect with characters
- Mix of angles is good: front view, 3/4 view, profile view, occasional back view

CRITICAL — VARIETY:
- Every panel on a page must show a COMPLETELY DIFFERENT scene, angle, and moment
- NEVER repeat the same activity in two panels (e.g. not 2× looking at album, not 2× hanging decorations)
- NEVER show the same location/angle twice (e.g. not 2× "Familie am Gate")
- Vary: close-up face, wide group shot, action moment, quiet detail, over-shoulder view
- Think cinematically: establishing shot → close-up → reaction → wide shot
- Each panel must advance the story — no redundant moments

CRITICAL — NO INVENTED CHARACTERS:
- ONLY include characters explicitly mentioned in the story input
- Do NOT invent new people, children, strangers, or background figures with faces
- Background crowd (airport, beach) = faceless silhouettes or blurred, NO distinct faces
- If a scene needs a minor role (waiter, steward) — they can speak but must be generic/faceless
- NEVER add a child, boy, girl, or person that is not in the story

CRITICAL — DIALOG SPEAKERS:
- A character can only be "speaker" if they are VISIBLE in that panel's "szene" description
- If Mama is not mentioned in the szene, she cannot be the speaker
- Only assign dialog to characters explicitly present in the scene
- CRITICAL: Each character appears ONLY ONCE per panel — no duplicates of the same person
- AVOID large crowd scenes — prefer intimate moments with 2-4 people per panel

RULES:
- ${numPages} pages minimum, 3-4 panels each (prefer 4)
- Dialogs: 10-18 words, natural ${lang}. EVERY panel must have dialog or caption.
- Page titles: 3-5 words, ${lang}.

JSON only:
{"pages":[{"id":"page1","pageNumber":1,"title":"...","location":"English location","timeOfDay":"morning|afternoon|golden hour|sunset|night","panels":[{"nummer":1,"szene":"Short visual description, max 2 sentences","dialog":"Short ${lang} dialog — REQUIRED, never null","speaker":"Name or null","bubble_type":"speech|caption|shout|thought"}]}]}`;
}
