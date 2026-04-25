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
        content: `Extract all main characters from the story. For each character create a precise visual description for image generation.
Respond ONLY with JSON:
{
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "visual_anchor": "Precise English description: age, hair color and style, eye color, skin tone, clothing colors, distinctive features, body type. Max 30 words."
    }
  ]
}
Be very specific: 'Emma: 6-year-old girl, shoulder-length red-brown hair, yellow t-shirt, blue shorts, freckles, big brown eyes, caucasian'`,
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

// ── Step 2.5: Prompt Rewriter — GPT-4o condenses scenes for image AI ─────────
// Like ChatGPT's internal prompt-rewriting: simplify, prioritize, stabilize
async function rewriteForImageAI(page: StoryPage, characters: Character[], category: string, comicStyle: string): Promise<string> {
  try {
    const charList = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ");
    const panelList = page.panels.map(p => `Panel ${p.nummer}: ${p.szene}`).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You rewrite comic scene descriptions into optimized image generation prompts.
Your output will go directly to an image AI model (gpt-image-1).

RULES:
- Output a SINGLE prompt for a multi-panel comic page
- Keep it SHORT — max 150 words total
- Start with quality/style instruction, then layout, then scenes
- Each panel description: max 1 sentence, purely visual
- No narrative, no emotions in words — only what is VISIBLE
- Include character names with ONE key visual feature each
- End with style instruction`,
      }, {
        role: "user",
        content: `Rewrite this into a short, optimized image prompt:

Characters: ${charList}
Location: ${page.location || "not specified"}
Time: ${page.timeOfDay || "daytime"}
Panels:\n${panelList}

Output format: A single prompt starting with "Create a premium European comic book page..."`,
      }],
      max_tokens: 250,
      temperature: 0.3,
    });

    const rewritten = response.choices[0].message.content || "";
    if (rewritten.length > 50) return rewritten;
  } catch (err: any) {
    console.warn("Prompt rewrite failed, using original:", err.message);
  }
  return ""; // fallback to original prompt
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
        model: "gpt-image-1",
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
      model: "gpt-image-1",
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
        model: "gpt-image-1",
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
