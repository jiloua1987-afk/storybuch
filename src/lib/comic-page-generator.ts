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

// ── Step 1: GPT-4o baut Story-Struktur ───────────────────────────────────────
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

// ── Step 2: Character Builder ─────────────────────────────────────────────────
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
      "visual_anchor": "Precise English description: age, hair color and style, clothing colors, distinctive features, body type"
    }
  ]
}
Be very specific: 'Emma: 6-year-old girl, shoulder-length red-brown hair, yellow t-shirt, blue shorts, freckles, big brown eyes'`,
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

// ── Step 3: gpt-image-1 generiert eine komplette Comic-Seite ─────────────────
export async function generateComicPage(
  page: StoryPage,
  characters: Character[],
  illustrationStyle: string,
  comicStyle: string,
  category: string = "familie",
  styleReferenceBase64?: string  // Base64 des Comic.png Referenzbilds
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
    // Mit Stil-Referenzbild (gpt-image-1 image input via responses API)
    if (styleReferenceBase64) {
      const response = await (openai as any).responses.create({
        model: "gpt-image-1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image_url: `data:image/png;base64,${styleReferenceBase64}`,
              },
              {
                type: "input_text",
                text: `Use the art style, character drawing technique, and panel quality from this reference image. Apply the same watercolor comic style and character proportions. Then create: ${prompt}`,
              },
            ],
          },
        ],
        output: [{ type: "image_generation_call", quality: "high", size: "1536x1024" }],
      });

      const output = response.output?.[0];
      if (output?.result) return `data:image/png;base64,${output.result}`;
    }

    // Ohne Referenzbild – standard generate
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });

    const data = response.data ?? [];
    const item = data[0];
    if (!item) return "";
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error(`Page ${page.pageNumber} generation error:`, err.message);
    // Fallback ohne Referenz
    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "high",
      });
      const data = response.data ?? [];
      const item = data[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch {
      // ignore
    }
    return `https://picsum.photos/seed/comic-page-${page.pageNumber}/1536/1024`;
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
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
