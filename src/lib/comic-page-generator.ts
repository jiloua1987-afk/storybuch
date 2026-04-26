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

Respond ONLY with JSON:
{
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "visual_anchor": "DETAILED English description for sharp face generation: exact age, precise hair color/length/style, eye color and shape, skin tone, facial features (jawline, cheekbones, nose shape, smile type), distinctive marks, body type, typical clothing colors. 40-50 words."
    }
  ]
}

Example: "Emma: 6-year-old girl with shoulder-length wavy auburn hair, bright hazel eyes, round face with rosy cheeks, small freckles across nose, warm smile showing front teeth gap, fair skin, petite build, usually wears yellow t-shirt and denim shorts"`,
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
- For characters: mention "recognizable face" or "distinct facial features"
- For crowd scenes: "Background people as silhouettes or out of focus"
- Total output: max 130 words

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
    prompt = buildComicPagePrompt({
      title: page.title,
      panels: page.panels,
      characters,
      illustrationStyle,
      comicStyle,
      category,
      location: page.location,
      timeOfDay: page.timeOfDay,
    });
  }

  // Step 3b: Generate image — with user photo if available
  const primaryRef = referenceImages[0] || (characters.find((c) => (c as any).refBase64) as any)?.refBase64;
  if (primaryRef) {
    try {
      const refBuf = Buffer.from(primaryRef, "base64");
      const blob = new Blob([refBuf], { type: "image/jpeg" });
      const file = new File([blob], "reference.jpg", { type: "image/jpeg" });

      const response = await openai.images.edit({
        model: "gpt-image-1.5",
        image: file,
        prompt: `The people in this photo are the main characters. Draw them as premium European comic illustrations — keep their exact faces, hair, and features recognizable but rendered in crisp comic style with bold ink outlines.\n\n${prompt}`,
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
