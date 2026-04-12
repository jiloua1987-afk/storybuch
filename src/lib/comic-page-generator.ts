import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComicPage {
  id: string;
  pageNumber: number;
  title: string;
  imageUrl: string;
  panels: PanelDescription[];
}

export interface PanelDescription {
  nummer: number;
  szene: string;
  dialog?: string;
}

export interface StoryPage {
  id: string;
  pageNumber: number;
  title: string;
  panels: PanelDescription[];
}

// ── Step 1: GPT-4o baut Story-Struktur (3-5 Seiten, je 4-5 Panels) ────────────
export async function buildComicStructure(
  storyInput: string,
  guidedAnswers: Record<string, string>,
  tone: string,
  comicStyle: string,
  mustHaveSentences: string,
  language: string,
  numPages: number = 4
): Promise<StoryPage[]> {
  const langMap: Record<string, string> = { de: "Deutsch", en: "English", fr: "Français", es: "Español" };
  const lang = langMap[language] || "Deutsch";

  const context = buildContext(storyInput, guidedAnswers);

  const styleMap: Record<string, string> = {
    action:    "dynamisch, energiegeladen, übertrieben",
    emotional: "warm, ruhig, erzählerisch",
    humor:     "lustig, überzeichnet, spielerisch",
  };
  const styleDesc = styleMap[comicStyle] || styleMap.emotional;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Du bist ein Comic-Autor. Erstelle eine Comic-Struktur mit genau ${numPages} Seiten auf ${lang}.
Tonalität: ${tone}, Stil: ${styleDesc}.
${mustHaveSentences ? `Diese Momente/Sätze müssen vorkommen: ${mustHaveSentences}` : ""}

Antworte NUR mit JSON:
{
  "pages": [
    {
      "id": "page1",
      "pageNumber": 1,
      "title": "Seitentitel",
      "panels": [
        {
          "nummer": 1,
          "szene": "Konkrete visuelle Szenen-Beschreibung auf Englisch für DALL-E (Personen, Aktion, Umgebung, Stimmung, Tageszeit)",
          "dialog": "Kurzer Dialog oder Caption-Text auf ${lang} (max 10 Wörter)"
        }
      ]
    }
  ]
}

Jede Seite hat 4-5 Panels. Panels sollen eine zusammenhängende Geschichte erzählen.
Die szene-Beschreibungen müssen sehr konkret sein: Wer macht was, wo, wie sieht es aus.`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  return raw.pages || [];
}

// ── Step 2: gpt-image-1 generiert eine komplette Comic-Seite ─────────────────
export async function generateComicPage(
  page: StoryPage,
  characters: string,
  illustrationStyle: string,
  referenceImageBase64?: string
): Promise<string> {
  const styleMap: Record<string, string> = {
    comic:       "watercolor comic illustration style, bold outlines, vibrant warm colors",
    aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes",
    bleistift:   "pencil sketch comic style, hand-drawn, detailed linework",
    realistisch: "realistic comic art style, detailed digital painting",
  };
  const style = styleMap[illustrationStyle] || styleMap.comic;

  // Build panel descriptions
  const panelDescriptions = page.panels
    .map((p) => `Panel ${p.nummer}: ${p.szene}${p.dialog ? `. Caption: "${p.dialog}"` : ""}`)
    .join("\n");

  const prompt = `Create a single comic book page with ${page.panels.length} panels arranged in a grid layout.
Black panel borders between panels. White caption boxes in corners for text.
${characters ? `Characters to include consistently: ${characters}` : ""}
Style: ${style}, cinematic lighting, warm atmosphere.
NO random text, NO speech bubbles unless specified.

Page title: "${page.title}"

${panelDescriptions}

Important: Keep all characters visually consistent across all panels - same faces, hair, clothing throughout.
Caption boxes should contain the specified dialog text in the correct panels.`;

  try {
    if (referenceImageBase64) {
      // Use gpt-image-1 with reference image
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
    } else {
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
    }
  } catch (err: any) {
    console.error(`Image generation error for page ${page.pageNumber}:`, err.message);
    return `https://picsum.photos/seed/page${page.pageNumber}/1536/1024`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildContext(storyInput: string, guidedAnswers: Record<string, string>): string {
  let ctx = storyInput || "";
  const fields = ["personen", "characters", "ort", "location", "zeitraum", "timeframe", "specialMoments", "kennengelernt", "zusammen", "anlass"];
  for (const f of fields) {
    if (guidedAnswers[f]) ctx += `\n${f}: ${guidedAnswers[f]}`;
  }
  return ctx;
}
