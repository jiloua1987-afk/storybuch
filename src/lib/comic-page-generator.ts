import OpenAI from "openai";
import { buildComicPagePrompt, buildGPTStructurePrompt, type Character, type Panel } from "./prompt-builder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface StoryPage {
  id: string;
  pageNumber: number;
  title: string;
  location?: string;
  timeOfDay?: string;
  panels: Panel[];
  imageUrl?: string;
}

// ── Step 1: GPT-4o builds story structure ────────────────────────────────────
export async function buildComicStructure(
  storyInput: string,
  guidedAnswers: Record<string, string>,
  tone: string,
  comicStyle: string,
  mustHaveSentences: string,
  language: string,
  numPages: number = 4,
  category: string = "familie"
): Promise<StoryPage[]> {
  const langMap: Record<string, string> = {
    de: "German", en: "English", fr: "French", es: "Spanish"
  };
  const lang = langMap[language] || "German";
  const context = buildContext(storyInput, guidedAnswers);
  const systemPrompt = buildGPTStructurePrompt(lang, tone, comicStyle, mustHaveSentences, numPages, category);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000, // Increased for longer stories
    temperature: 0.85,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  return (raw.pages || []).map((p: any, i: number) => ({
    ...p,
    id: p.id || `page${i + 1}`,
    pageNumber: p.pageNumber || i + 1,
  }));
}

// ── Step 2: Character Builder ────────────────────────────────────────────────
export async function buildCharacterAnchors(
  storyInput: string,
  guidedAnswers: Record<string, string>
): Promise<Character[]> {
  const context = buildContext(storyInput, guidedAnswers);
  const BUBBLE_COLORS = ["#E8F4FF", "#FFF0F5", "#F0FFF0", "#FFFDE8", "#F5F0FF"];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Extract all main characters from the story. For each character create a DETAILED visual description for sharp, high-quality face generation.

CRITICAL: Descriptions must be detailed enough for gpt-image-1.5 to generate sharp, recognizable faces.

ACCESSORIES & CONSISTENT FEATURES:
- If a character wears glasses, hijab, hat, jewelry, or other accessories: ALWAYS mention "always wears [accessory]"
- If a character has facial hair (beard, mustache): specify exact style and ALWAYS include it
- These features must appear in EVERY panel across ALL pages

Respond ONLY with JSON:
{
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "visual_anchor": "DETAILED English description for sharp face generation: exact age, precise hair color/length/style, eye color and shape, skin tone, facial features (jawline, cheekbones, nose shape, smile type), distinctive marks, body type, typical clothing colors, ALWAYS wears [consistent accessories like glasses/hijab/beard]. 40-50 words."
    }
  ]
}

Example: "Emma: 6-year-old girl with shoulder-length wavy auburn hair, bright hazel eyes, round face with rosy cheeks, small freckles across nose, warm smile showing front teeth gap, fair skin, petite build, always wears yellow t-shirt and denim shorts"`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  return (raw.characters || []).map((c: any, i: number) => ({
    ...c,
    bubble_color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
  }));
}

// ── Step 2.5: Prompt Rewriter — writes like an Art Director, not a Prompt Engineer
async function rewriteForImageAI(page: StoryPage, characters: Character[], category: string, comicStyle: string): Promise<string> {
  try {
    const charList = characters.map(c => `${c.name} (${c.age || ""}, ${c.visual_anchor})`).join(", ");
    const panelList = page.panels.map(p => `${p.nummer}. ${p.szene}`).join("\n");
    const panelCount = page.panels.length;
    const layoutDesc = panelCount <= 3 ? "1 wide panel on top, 2 panels on bottom"
      : panelCount === 5 ? "2 on top, 1 wide middle, 2 on bottom" : "2×2 grid";

    // Context-aware outfit detection
    const location = (page.location || "").toLowerCase();
    const beachKeywords = ["strand", "beach", "meer", "sea", "pool", "planschbecken", "schwimmbad", "wasser"];
    const homeKeywords = ["haus", "home", "wohnzimmer", "küche", "hof", "garten", "zimmer"];
    const formalKeywords = ["restaurant", "theater", "hochzeit", "feier", "party", "celebration"];
    
    let outfitContext = "";
    if (beachKeywords.some(kw => location.includes(kw))) {
      outfitContext = "Characters wear appropriate beach/swim clothing (swimwear, shorts, light summer clothes). ";
    } else if (formalKeywords.some(kw => location.includes(kw))) {
      outfitContext = "Characters wear formal/festive clothing appropriate for the occasion. ";
    } else if (homeKeywords.some(kw => location.includes(kw))) {
      outfitContext = "Characters wear casual home clothing. ";
    } else {
      outfitContext = "Characters wear context-appropriate clothing for the setting. ";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You rewrite comic scene descriptions into short, natural image prompts for gpt-image-1.5.

Write like an art director briefing an illustrator — NOT like a prompt engineer.

OUTPUT STRUCTURE (exactly this, nothing else):
1. One master sentence: style + layout + motif + story context
2. One character anchor sentence (if reference photo exists)
3. Panel breakdown: one short visual sentence per panel
4. One style tail: short style keywords + negatives

CRITICAL RULES FOR SHARP FACES:
- ALWAYS include: "Sharp, detailed facial features with clearly defined eyes, nose, mouth, and expressions"
- ALWAYS include: "Each panel shows a COMPLETELY DIFFERENT scene, angle, and moment"
- ALWAYS include: "Maximum 2-4 people per panel with visible faces — avoid large crowds"
- CRITICAL: "Each character appears ONLY ONCE per panel — no duplicates of the same person"
- CRITICAL: "Prefer showing characters facing camera or from side to see expressions — back views OK when story needs it"
- For characters: mention "recognizable face" or "distinct facial features"
- For crowd scenes: "Background people as silhouettes or out of focus"
- Total output: max 130 words

ABSOLUTELY NO TEXT IN IMAGE:
- NO text, NO speech bubbles, NO letters, NO words anywhere in the generated image
- NO panel titles, NO captions, NO labels
- Text will be added separately by the frontend
- This is CRITICAL — any text in the image will ruin the comic

CLOTHING CONTEXT:
- ${outfitContext}
- Characters can change clothes between pages based on location/activity
- Keep character faces/hair/features identical, but adapt clothing to scene

STYLE RULES:
- No block headers (no "QUALITY:", "STYLE:", "LAYOUT:" etc.)
- No redundant synonyms (don't say "crisp" AND "clean" AND "sharp" — pick one)
- No meta-language, no prompt engineering jargon
- Write naturally, like describing a scene to an artist
- Each panel: max 1 sentence, purely what is VISIBLE
- Convert emotions into expressions and body language
- CRITICAL: End with "NO text, NO speech bubbles, NO letters in image"
- Emphasize variety: close-ups, wide shots, different actions, different angles`,
      }, {
        role: "user",
        content: `${panelCount} panels in a ${layoutDesc}. Category: ${category}, style: ${comicStyle}.
Characters: ${charList}
Location: ${page.location || "not specified"}, Time: ${page.timeOfDay || "daytime"}

Panels:
${panelList}`,
      }],
      max_tokens: 250,
      temperature: 0.2,
    });

    const rewritten = response.choices[0].message.content || "";
    if (rewritten.length > 80) return rewritten;
  } catch (err: any) {
    console.warn("Prompt rewrite failed:", err.message);
  }
  return "";
}

// ── Step 3: Generate comic page ──────────────────────────────────────────────
export async function generateComicPage(
  page: StoryPage,
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string = "familie",
  referenceImages: string[] = [],
): Promise<string> {
  // Step 3a: Rewrite prompt via GPT-4o (like ChatGPT's internal rewriting)
  let prompt = await rewriteForImageAI(page, characters, category, comicStyle);

  // Fallback to our built prompt if rewriter fails
  if (!prompt) {
    // Context-aware outfit detection for fallback
    const location = (page.location || "").toLowerCase();
    const beachKeywords = ["strand", "beach", "meer", "sea", "pool", "planschbecken", "schwimmbad", "wasser"];
    const homeKeywords = ["haus", "home", "wohnzimmer", "küche", "hof", "garten", "zimmer"];
    const formalKeywords = ["restaurant", "theater", "hochzeit", "feier", "party", "celebration"];
    
    let outfitNote = "";
    if (beachKeywords.some(kw => location.includes(kw))) {
      outfitNote = " Characters wear appropriate beach/swim clothing (swimwear, shorts, light summer clothes).";
    } else if (formalKeywords.some(kw => location.includes(kw))) {
      outfitNote = " Characters wear formal/festive clothing appropriate for the occasion.";
    } else if (homeKeywords.some(kw => location.includes(kw))) {
      outfitNote = " Characters wear casual home clothing.";
    } else {
      outfitNote = " Characters wear context-appropriate clothing for the setting.";
    }

    prompt = buildComicPagePrompt({
      title: page.title,
      panels: page.panels,
      characters,
      illustrationStyle,
      comicStyle,
      category,
      location: page.location,
      timeOfDay: page.timeOfDay,
    }) + outfitNote;
  }

  // Step 3b: Generate image — with user photo if available
  const primaryRef = referenceImages[0] || (characters.find((c) => (c as any).refBase64) as any)?.refBase64;
  if (primaryRef) {
    try {
      const refBuf = Buffer.from(primaryRef, "base64");
      const blob = new Blob([refBuf], { type: "image/jpeg" });
      const file = new File([blob], "reference.jpg", { type: "image/jpeg" });

      // Enhanced prompt with character consistency emphasis
      const charAnchors = characters.map(c => `${c.name} (${c.visual_anchor})`).join(", ");
      const consistencyNote = referenceImages.length === 0 
        ? "This is the cover image showing the main characters. Keep their faces, hair, and features EXACTLY as shown in this reference."
        : "The people in this photo are the main characters. Keep their exact faces, hair, and features recognizable.";

      const response = await openai.images.edit({
        model: "gpt-image-1.5",
        image: file,
        prompt: `${consistencyNote} Draw them as premium European comic illustrations — crisp comic style with bold ink outlines.

Character consistency is CRITICAL: ${charAnchors}

${prompt}`,
        size: "1024x1536",
        quality: "high",
      } as any);

      const item = (response.data ?? [])[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch (err: any) {
      console.warn(`Reference photo failed for page ${page.pageNumber}:`, err.message);
    }
  }

  // Fallback: standard generate
  return generateStandard(prompt, page.pageNumber);
}

async function generateStandard(prompt: string, pageNumber: number): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    });
    const item = (response.data ?? [])[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error(`Page ${pageNumber} error:`, err.message);
    // Single retry
    try {
      const response = await openai.images.generate({
        model: "gpt-image-1.5",
        prompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
      });
      const item = (response.data ?? [])[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch { /* ignore */ }
    return "";
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────
function buildContext(storyInput: string, guidedAnswers: Record<string, string>): string {
  let ctx = storyInput || "";
  const fields = [
    "personen", "characters", "ort", "location",
    "zeitraum", "timeframe", "specialMoments",
    "kennengelernt", "zusammen", "anlass",
  ];
  for (const f of fields) {
    if (guidedAnswers[f]) ctx += `\n${f}: ${guidedAnswers[f]}`;
  }
  return ctx;
}
