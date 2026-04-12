import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Chapter {
  id: string;
  nummer: number;
  titel: string;
  handlung: string;
  szene_beschreibung: string;
  illustration_prompt: string;
}

export interface Character {
  name: string;
  age: number;
  visual_anchor: string;
  bubble_color: string;
  style_lock: string;
}

export interface Dialog {
  speaker: string;
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-top";
  bubble_type: "speech" | "shout" | "thought" | "whisper" | "caption";
  bubble_color: string;
  order: number;
}

// ── Buchstruktur ──────────────────────────────────────────────────────────────
export async function generateBookStructure(
  storyInput: string,
  guidedAnswers: Record<string, string>,
  tone: string,
  language: string = "de"
): Promise<Chapter[]> {
  const context = buildStoryContext(storyInput, guidedAnswers);
  const langMap: Record<string, string> = { de: "Deutsch", en: "English", fr: "Français", es: "Español" };
  const lang = langMap[language] || "Deutsch";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Du bist ein kreativer Comic-Autor. Erstelle aus der Geschichte eine Comic-Struktur mit 5 Kapiteln auf ${lang}.
Tonalität: ${tone}
Antworte NUR mit einem JSON-Array:
[{
  "id": "ch1",
  "nummer": 1,
  "titel": "Kapitelname",
  "handlung": "Was passiert in diesem Kapitel (2-3 Sätze)",
  "szene_beschreibung": "Visuelle Beschreibung der Hauptszene",
  "illustration_prompt": "English description for DALL-E, no text, no letters, no speech bubbles, no captions, pure illustration"
}]`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(raw) ? raw : raw.chapters || raw.kapitel || [];
}

// ── Character Builder ─────────────────────────────────────────────────────────
export async function buildCharacters(
  storyInput: string,
  guidedAnswers: Record<string, string>
): Promise<Character[]> {
  const context = buildStoryContext(storyInput, guidedAnswers);
  const BUBBLE_COLORS = ["#E8F4FF", "#FFF0F5", "#F0FFF0", "#FFFDE8", "#F5F0FF"];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Extrahiere alle Hauptfiguren aus der Geschichte.
Antworte NUR mit JSON:
{
  "characters": [{
    "name": "Name",
    "age": 30,
    "visual_anchor": "precise English visual description: age, hair, clothing, features",
    "style_lock": "watercolor comic illustration, warm colors, no text, no speech bubbles"
  }]
}`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  const chars: Character[] = raw.characters || [];
  return chars.map((c, i) => ({
    ...c,
    bubble_color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
  }));
}

// ── Dialog Engine ─────────────────────────────────────────────────────────────
export async function generateDialogs(
  chapter: Chapter,
  characters: Character[],
  tone: string,
  comicStyle: string,
  mustHaveSentences: string = "",
  language: string = "de"
): Promise<Dialog[]> {
  const langMap: Record<string, string> = { de: "Deutsch", en: "English", fr: "Français", es: "Español" };
  const lang = langMap[language] || "Deutsch";
  const charList = characters.map((c) => `${c.name} (${c.age} Jahre, bubble_color: ${c.bubble_color})`).join(", ");
  const positions = ["top-left", "top-right", "bottom-left", "bottom-right", "center-top"];
  const bubbleTypes = ["speech", "shout", "thought", "whisper", "caption"];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Du schreibst Comic-Dialoge auf ${lang}. Tonalität: ${tone}, Stil: ${comicStyle}.
Figuren: ${charList}
${mustHaveSentences ? `Wichtige Sätze die vorkommen sollen: ${mustHaveSentences}` : ""}

Schreibe 2-3 kurze, lebendige Dialoge für die Szene.
Antworte NUR mit JSON-Array:
[{
  "speaker": "Name",
  "text": "Dialog-Text (max 8 Wörter)",
  "position": "${positions.join("|")}",
  "bubble_type": "${bubbleTypes.join("|")}",
  "bubble_color": "#hex aus Figuren-Liste",
  "order": 1
}]`,
      },
      {
        role: "user",
        content: `Kapitel: ${chapter.titel}\nSzene: ${chapter.szene_beschreibung}\nHandlung: ${chapter.handlung}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(raw) ? raw : raw.dialogs || raw.dialoge || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildStoryContext(storyInput: string, guidedAnswers: Record<string, string>): string {
  let ctx = storyInput || "";
  if (guidedAnswers.personen)      ctx += `\nPersonen: ${guidedAnswers.personen}`;
  if (guidedAnswers.characters)    ctx += `\nCharaktere: ${guidedAnswers.characters}`;
  if (guidedAnswers.ort)           ctx += `\nOrt: ${guidedAnswers.ort}`;
  if (guidedAnswers.location)      ctx += `\nOrt: ${guidedAnswers.location}`;
  if (guidedAnswers.zeitraum)      ctx += `\nZeitraum: ${guidedAnswers.zeitraum}`;
  if (guidedAnswers.timeframe)     ctx += `\nZeitraum: ${guidedAnswers.timeframe}`;
  if (guidedAnswers.specialMoments) ctx += `\nBesondere Momente: ${guidedAnswers.specialMoments}`;
  return ctx;
}

export { openai };
