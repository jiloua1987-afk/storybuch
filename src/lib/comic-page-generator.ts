import OpenAI from "openai";
import { buildComicPagePrompt, buildGPTStructurePrompt, type Character, type Panel } from "./prompt-builder";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Load style reference image once at startup ───────────────────────────────
let STYLE_REF_B64: string | null = null;
try {
  const refPath = path.join(process.cwd(), "public", "Comic.png");
  if (fs.existsSync(refPath)) {
    STYLE_REF_B64 = fs.readFileSync(refPath).toString("base64");
    console.log("✓ Style reference image loaded (Comic.png)");
  }
} catch { /* ignore */ }

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

// ── Step 3: Generate comic page with style reference ─────────────────────────
// Primary: responses API with Comic.png as style reference
// Fallback: images.generate() without reference
export async function generateComicPage(
  page: StoryPage,
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string = "familie",
): Promise<string> {
  const prompt = buildComicPagePrompt({
    title: page.title,
    panels: page.panels,
    characters,
    illustrationStyle,
    comicStyle,
    category,
    location: page.location,
    timeOfDay: page.timeOfDay,
  });

  // Try with style reference first
  if (STYLE_REF_B64) {
    try {
      const result = await generateWithStyleReference(prompt, STYLE_REF_B64);
      if (result) return result;
    } catch (err: any) {
      console.warn(`Style reference failed for page ${page.pageNumber}, falling back:`, err.message);
    }
  }

  // Fallback: standard generate without reference
  return generateStandard(prompt, page.pageNumber);
}

// ── Generate with style reference via responses API ──────────────────────────
async function generateWithStyleReference(prompt: string, styleRefB64: string): Promise<string> {
  const response = await (openai as any).responses.create({
    model: "gpt-image-1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:image/png;base64,${styleRefB64}`,
          },
          {
            type: "input_text",
            text: `Use the EXACT art style, line quality, coloring technique, and panel composition from this reference image. Match the same level of professional comic book quality. Then create:\n\n${prompt}`,
          },
        ],
      },
    ],
    tools: [{ type: "image_generation", quality: "high", size: "1024x1536" }],
  });

  const output = response.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      // With tools API, result is in image_generation_call
      if (item.type === "image_generation_call" && item.result) {
        return `data:image/png;base64,${item.result}`;
      }
    }
  }
  return "";
}

// ── Standard generate without reference ──────────────────────────────────────
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
    console.error(`Page ${pageNumber} generation error:`, err.message);
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
