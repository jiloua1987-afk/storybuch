import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, language, dedication, dedicationFrom } = await req.json();
    const langMap: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const storyContext = [
      storyInput || "",
      ...Object.entries(guidedAnswers || {})
        .filter(([k, v]) => v && k !== "category")
        .map(([k, v]) => `${k}: ${v}`),
      dedication ? `Widmung vom Nutzer: ${dedication}` : "",
      dedicationFrom ? `Von: ${dedicationFrom}` : "",
    ].filter(Boolean).join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `Du schreibst eine persönliche Widmung für die letzte Seite eines Comic-Buchs in ${lang}.

WICHTIG — Das ist eine WIDMUNG, keine Zusammenfassung!
- Schreibe wie eine handgeschriebene Widmung auf der letzten Seite eines Geschenks
- Maximal 2-3 kurze, herzliche Sätze
- Sprich die Hauptperson(en) DIREKT an
- Wenn die Geschichte von Großeltern handelt: "Für Opa und Oma..." oder "Für euch, liebe Großeltern..."
- Wenn die Geschichte von einem Kind handelt: "Für Dich, lieber [Name]..."
- Erwähne EIN konkretes Detail aus der Geschichte
- Ton: ${tone || "liebevoll, persönlich, warm"}
${dedicationFrom ? `- Ende die Widmung mit: "Von: ${dedicationFrom}" (NICHT "Von: Von ${dedicationFrom}")` : '- VERBOTEN: "[Dein Name]", "[Familienmitglied]" als Absender'}
- VERBOTEN: "Liebe Leserinnen", "dieses Buch", "diese Geschichte"
- VERBOTEN: Zusammenfassungen der Handlung
- VERBOTEN: Doppelungen wie "Von: Von..."
- Schreibe so, als würde ein Familienmitglied die Widmung von Hand schreiben`,
      }, {
        role: "user",
        content: storyContext,
      }],
      max_tokens: 100,
      temperature: 0.8,
    });

    return NextResponse.json({
      endingText: res.choices[0].message.content || "",
      dedication: dedication || "",
      dedicationFrom: dedicationFrom || "",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
