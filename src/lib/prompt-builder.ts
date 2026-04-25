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
  const catStyles = STYLE_MATRIX[category] || STYLE_MATRIX.sonstiges;
  const artDirection = catStyles[comicStyle] || catStyles.emotional;

  const categoryHints: Record<string, string> = {
    liebe:      "Focus on romantic moments: first meeting, tender looks, meaningful gestures, the moment they knew, relationship milestones. Include small intimate details (hands touching, a shared glance, a whispered word).",
    familie:    "Focus on family bonding: children's unique reactions and personalities, parental love, shared adventures, cozy chaotic moments. Each child should have their own little personality quirk visible in their behavior.",
    urlaub:     "Focus on travel: arrival excitement and first impressions, discoveries and adventures, local culture (food, places), funny or chaotic travel situations, emotional moments between travelers, departure with nostalgia.",
    feier:      "Focus on celebration: secret preparation and anticipation, the big surprise moment, emotional speeches and reactions, fun party chaos, intimate moments between guests, the toast or final group moment.",
    biografie:  "Focus on life journey: a vivid childhood memory, a key turning point, an important relationship moment, a proud achievement, a reflective present-day scene. Show how the person changed over time.",
    freunde:    "Focus on friendship: a shared adventure or misadventure, an inside joke moment, supporting each other through difficulty, celebrating together, a quiet moment of loyalty and connection.",
    sonstiges:  "Focus on the most emotionally resonant and visually interesting moments. Find the humor, the tenderness, and the drama in the story.",
  };
  const catHint = categoryHints[category] || categoryHints.familie;

  const comicStyleHints: Record<string, string> = {
    action:    "Make scenes DYNAMIC: characters in motion, dramatic angles, high energy moments, exaggerated reactions, things happening fast.",
    emotional: "Make scenes INTIMATE: close-ups of faces showing emotion, tender gestures, quiet meaningful moments, warm lighting, characters connecting.",
    humor:     "Make scenes FUNNY: exaggerated expressions, comedic timing, small disasters, playful chaos, characters in ridiculous situations, visual gags.",
  };
  const styleHint = comicStyleHints[comicStyle] || comicStyleHints.emotional;

  return `You are a professional comic book author, visual storyteller, and dramaturg.
Your job: Transform a personal story into a vivid, emotional, and visually stunning ${numPages}-page comic book in ${lang}.

THE STORY SHOULD FEEL LIKE A PERSONAL MEMORY — warm, authentic, specific.
Not generic. Not kitschig. Real moments that make people laugh and cry.

VISUAL STYLE: ${artDirection}
NARRATIVE FOCUS: ${catHint}
COMIC STYLE DIRECTION: ${styleHint}
${mustHaveSentences ? `\nMUST INCLUDE these key moments or sentences: "${mustHaveSentences}"` : ""}

CRITICAL RULES FOR PANEL SCENE DESCRIPTIONS ("szene"):
Each "szene" is a COMPLETE illustration brief for an artist. It must contain ALL of these:
1. WHO: Which characters are in the scene, by name, with their appearance details
2. WHAT: Exact action — not "they arrive" but "Leon (6) runs ahead dragging his suitcase, stumbling over the cobblestones"
3. WHERE: Specific environment details — "sunlit garden with old apple tree, wooden fence with peeling paint, string lights between branches"
4. EXPRESSION: Facial expression and body language — "eyes wide with wonder, mouth open in a delighted O, arms spread wide"
5. MOOD/LIGHT: Time of day and atmosphere — "warm golden afternoon light filtering through leaves, long shadows on grass"
6. CAMERA: Vary angles across panels — close-up face, medium two-shot, wide establishing shot, over-shoulder, bird's eye view

BAD example: "The family arrives at the beach"
GOOD example: "Wide establishing shot: Family of four walking toward a stunning turquoise Sardinian beach, viewed from behind. Leon (6, messy brown hair, blue striped shirt) and Mia (4, blonde pigtails, pink dress) hold hands and run slightly ahead. Papa and Mama follow with beach bags, smiling at each other. Rocky Mediterranean cliffs frame the scene, colorful beach umbrellas visible in the distance. Bright afternoon sunlight, warm golden tones."

DIALOG RULES:
- Max 8 words per speech bubble, natural ${lang}
- Dialogs should reveal CHARACTER — each person speaks differently
- Include small loving exchanges, funny remarks, emotional outbursts
- Not every panel needs dialog — some moments are better silent

STRUCTURE:
- ${numPages} pages, each with 3-5 panels
- Page 1: establish characters, setting, and mood (4 panels)
- Middle pages: develop story with emotional peaks AND funny/chaotic moments (vary 3-5 panels!)
- Last page: emotional conclusion with a memorable final image (3-4 panels)
- Page titles: 3-5 words, dramatic or funny, in ${lang}
- Each page should feel like a mini-chapter with its own arc

GIVE EACH CHARACTER A PERSONALITY:
- Children should have distinct behaviors (the brave one, the shy one, the funny one)
- Adults should show real emotions (not just smiling — also worried, surprised, moved to tears)
- Show relationships through body language (who holds whose hand, who looks at whom)

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
          "szene": "Complete English illustration brief with ALL 6 elements above",
          "dialog": "Short ${lang} dialog max 8 words or null",
          "speaker": "Character name or null",
          "bubble_type": "speech|caption|shout|thought"
        }
      ]
    }
  ]
}`;
}
