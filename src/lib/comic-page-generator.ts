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

// ── Step 3: Generate comic page via images.generate() ────────────────────────
// Pure prompt-based generation — no images.edit(), no style reference image
// Quality comes from the detailed Style Matrix prompts
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
    console.error(`Page ${page.pageNumber} error:`, err.message);
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
