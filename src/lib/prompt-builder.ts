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
    emotional: "Tender romantic illustration with clean linework. Warm golden and rose color palette, gentle shading. Intimate close-ups of hands touching, eyes meeting. Soft-focus backgrounds with golden hour lighting. Professional illustrated novel quality, like a high-end graphic novel.",
    humor:     "Playful romantic comedy comic style. Bright cheerful colors, exaggerated lovesick expressions, cartoon hearts and sparkles. Bold clean outlines, expressive body language. Characters with oversized eyes and comedic reactions. Fun and lighthearted, like a romantic manga.",
  },
  familie: {
    action:    "Energetic family adventure comic. Bold black outlines, vibrant saturated colors, dynamic compositions. Children with exaggerated excited expressions, parents in heroic poses. Motion lines, dramatic angles. Professional comic book quality like Asterix or Tintin.",
    emotional: "Warm family storybook illustration with clean linework. Rich warm colors (golden yellows, soft greens, cozy browns). Soft rounded character designs. Tender moments between parents and children. Warm natural lighting, cozy domestic settings. Professional children's book quality like Pixar concept art.",
    humor:     "Fun family comedy comic. Bold clean outlines, bright pop colors. Kids with wildly exaggerated expressions, parents with comedic reactions. Slapstick body language, playful chaos. Cartoon-style with professional quality. Like a European family comic strip.",
  },
  urlaub: {
    action:    "Adventure travel comic with cinematic energy. Bold outlines, vivid tropical and Mediterranean colors (turquoise, coral, golden sand). Dynamic wide-angle compositions, dramatic landscapes. Characters in action — running, jumping, exploring. Movie poster quality.",
    emotional: "Beautiful travel illustration with warm luminous colors. Mediterranean light — turquoise seas, golden sunsets, terracotta villages. Clean linework, panoramic compositions. Nostalgic and dreamy atmosphere. Rich atmospheric detail, like a high-quality illustrated travel book.",
    humor:     "Hilarious vacation comic. Bright saturated holiday colors, exaggerated tourist situations. Characters with oversized sunglasses, comically overloaded luggage, funny tan lines. Bold outlines, cartoon energy. Like a funny postcard come to life.",
  },
  feier: {
    action:    "Explosive celebration comic. Bold dynamic outlines, confetti and streamers in motion. Vibrant party colors (gold, magenta, electric blue). Characters in dramatic surprise poses, champagne splashing. High energy, like a party captured in comic book form.",
    emotional: "Heartwarming celebration illustration with warm golden lighting. Rich warm tones, gentle shading. Intimate moments — tearful speeches, group hugs, candle-lit faces. Clean linework with rich emotional detail. Like a beautifully illustrated greeting card.",
    humor:     "Hilarious party comic. Bright festive colors, exaggerated celebration chaos. Characters with comically surprised faces, cake disasters, dance floor fails. Bold cartoon outlines, maximum fun energy. Like a funny birthday card illustration.",
  },
  biografie: {
    action:    "Epic life story graphic novel. Dramatic cinematic lighting, rich deep colors with sepia undertones. Bold compositions showing key life moments. Strong black outlines, detailed backgrounds. Movie-quality biographical illustration, like a prestige graphic novel.",
    emotional: "Nostalgic memoir illustration with warm muted earth tones mixed with selective color highlights. Clean editorial linework, intimate portrait compositions. Timeless settings, emotional depth in every face. Like a New Yorker illustration or illustrated autobiography.",
    humor:     "Charming biographical comic with wit. Warm retro color palette, clean expressive linework. Characters shown at different life stages with gentle humor. Exaggerated period details, playful anachronisms. Like an illustrated memoir with a smile.",
  },
  freunde: {
    action:    "High-energy friendship adventure comic. Bold outlines, vibrant saturated colors. Friends in dynamic group poses, high-fiving, running together. Motion lines, dramatic angles, comic book energy. Like a superhero team-up but with real friends.",
    emotional: "Warm friendship illustration with soft natural colors and clean linework. Intimate moments — shared laughter, supportive hugs, quiet conversations. Warm ambient lighting, cozy settings. Like a beautifully illustrated friendship story.",
    humor:     "Hilarious buddy comedy comic. Bright pop colors, exaggerated funny expressions. Friends in ridiculous situations, inside jokes visualized. Bold cartoon outlines, maximum comedic timing. Like a funny webcomic with professional quality.",
  },
  sonstiges: {
    action:    "Dynamic storytelling comic. Bold black outlines, rich cinematic colors. Dramatic compositions with varied camera angles. Professional comic book quality with high contrast and sharp details. Expressive characters, detailed backgrounds.",
    emotional: "Beautiful narrative illustration with warm atmospheric colors and clean linework. Intimate character moments with emotional depth. Cinematic lighting, rich environmental detail. Professional illustrated novel quality.",
    humor:     "Entertaining comic with personality. Clean bold outlines, bright cheerful colors. Expressive exaggerated characters, playful compositions. Fun visual storytelling with comedic timing. Professional cartoon quality.",
  },
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
The image must be a pure illustration only.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK 3: SCENE — the flexible part that changes per page
// ══════════════════════════════════════════════════════════════════════════════
function buildSceneBlock(input: PagePromptInput): string {
  const { panels, location, timeOfDay } = input;
  const panelCount = panels.length;

  const layoutDesc = panelCount <= 3
    ? "3 panels: one wide panel on top, two panels side by side on bottom"
    : panelCount === 5
    ? "5 panels: two on top, one wide in middle, two on bottom"
    : "4 panels in a 2×2 grid";

  const panelDescs = panels
    .map((p) => `[Panel ${p.nummer}]: ${p.szene}`)
    .join("\n");

  return `COMIC PAGE:
Create a single comic book page with ${panelCount} panels arranged as: ${layoutDesc}.
Clean black panel borders. White/light background between panels.
${location ? `Setting: ${location}.` : ""}
${timeOfDay ? `Lighting: ${timeOfDay}.` : ""}

SCENES:
${panelDescs}

Professional comic book quality. Sharp details. Expressive faces. Rich backgrounds.
Vary camera angles between panels: close-up, medium shot, wide shot.
NO text, NO speech bubbles, NO captions anywhere in the image.`;
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

  // ── STORY MODULE (from GPT suggestion — dramaturgy per category) ────────────
  const storyModules: Record<string, string> = {
    liebe: `STORY TYPE: Romantic personal story about two people.
Key dramatic elements:
- The first meeting or a special early moment — capture the spark
- Small intimate details: hands touching, a shared glance, a whispered word
- Closeness, tension, eye contact — show the chemistry
- Emotional development — how feelings deepen
- A meaningful conclusion that feels like a promise
The story should feel real, intimate, and grown-up. Not cheesy — warm, elegant, emotional.`,

    familie: `STORY TYPE: Warm family story about shared moments, closeness, and everyday adventures.
Key dramatic elements:
- The dynamic between parents and children — who is the brave one, the shy one, the funny one?
- Different personalities visible in behavior and reactions
- Small chaotic situations that every family knows
- Humorous family moments mixed with tender ones
- Emotional closeness — a hug, a look, holding hands
The story should feel warm, lively, and authentic.`,

    urlaub: `STORY TYPE: Personal travel story full of shared experiences, impressions, and small adventures.
Key dramatic elements:
- Arrival and first impressions — the excitement of somewhere new
- Discovering together — an excursion, a local market, trying new food
- Spontaneous moments that weren't planned
- Small mishaps or funny situations (lost luggage, wrong turn, sunburn)
- An emotional look back — the moment you realize this was special
The story should transport wanderlust, warmth, and the feeling of a treasured memory.`,

    feier: `STORY TYPE: A special story around an event or a memorable day.
Key dramatic elements:
- Anticipation and secret preparation — who is planning what?
- Special encounters and arrivals
- Small surprises and unexpected moments
- Emotional highlights — a speech, tears of joy, a toast
- A memorable conclusion that everyone will remember
The story should feel lively, festive, and deeply emotional.`,

    biografie: `STORY TYPE: Important life stations as a personal visual memory journey.
Key dramatic elements:
- A vivid childhood memory with sensory details
- A key turning point or challenge that shaped the person
- An important relationship moment
- A proud achievement or milestone
- A reflective present-day scene showing growth
The story should feel appreciative, personal, and meaningful. Show how the person evolved.`,

    freunde: `STORY TYPE: Personal story about connection, shared memories, and real closeness.
Key dramatic elements:
- How the friendship started — the first connection
- A shared adventure or misadventure
- An insider moment that only they understand
- Loyalty and support through a difficult time
- An emotional conclusion celebrating the bond
The story should feel honest, warm, and relatable.`,

    sonstiges: `STORY TYPE: A personal memory with a clear emotional core.
Key dramatic elements:
- The specific situation that makes this story unique
- Personal dynamics between the people involved
- Concrete small moments — not abstract feelings
- Clear emotional development from beginning to end
- A strong, memorable conclusion`,
  };
  const storyModule = storyModules[category] || storyModules.sonstiges;

  // ── STYLE MODULE (from GPT suggestion — narrative rhythm per comic style) ──
  const styleModules: Record<string, string> = {
    action: `NARRATIVE STYLE: Dynamic, lively, full of movement.
- Use active verbs, quick scene changes, physical movement
- Characters should be DOING things, not just standing
- Dialogs: short, direct, lively — like movie one-liners
- Illustrations should emphasize: movement, perspective, dynamic energy, dramatic angles
- Pacing: fast, punchy, each panel drives the story forward`,

    emotional: `NARRATIVE STYLE: Warm, atmospheric, emotionally deep.
- Focus on closeness: glances, gestures, mood, atmosphere
- Quiet meaningful moments matter more than action
- Dialogs: fewer but more personal — each word counts
- Illustrations should emphasize: light, intimacy, atmosphere, facial expressions
- Pacing: slow, contemplative, let moments breathe`,

    humor: `NARRATIVE STYLE: Charming, playful, and humorous.
- Include small mishaps, charming observations, sympathetic chaos
- Characters react with exaggerated expressions and funny body language
- Dialogs: casual, witty, natural — like real people joking
- Illustrations should emphasize: facial expressions, situational comedy, lively details
- Pacing: comedic timing — setup, beat, punchline`,
  };
  const styleModule = styleModules[comicStyle] || styleModules.emotional;

  return `You are a professional comic book author, visual storyteller, and dramaturg.
Your job: Transform a personal story into a vivid, emotional, and visually stunning ${numPages}-page comic book in ${lang}.

QUALITY RULES — NON-NEGOTIABLE:
- The story must feel like a PERSONAL MEMORY — warm, authentic, specific
- Use natural, warm language — no generic phrases, no Disney clichés
- Emotionally rich but not kitschig — real moments that make people laugh and cry
- Each person must have a recognizable personality visible in their behavior and speech
- Build in concrete small details: glances, gestures, small mishaps, real emotions
- Every scene must be clearly and vividly illustratable

VISUAL STYLE: ${artDirection}

${storyModule}

${styleModule}
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
