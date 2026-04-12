import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Ähnlichkeits-Check via GPT-4o Vision ─────────────────────────────────────
// Prüft ob generiertes Bild die Figuren korrekt darstellt
// Score < 70% → neu generieren (max 2 Versuche)

export async function checkCharacterSimilarity(
  generatedImageBase64: string,
  characterDescriptions: string[]
): Promise<number> {
  if (!characterDescriptions.length) return 100;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${generatedImageBase64}`, detail: "low" },
            },
            {
              type: "text",
              text: `Look at this comic panel image. Rate how well the characters match these descriptions (0-100):
${characterDescriptions.map((d, i) => `Character ${i + 1}: ${d}`).join("\n")}

Consider: correct hair color/style, clothing colors, approximate age, body proportions.
Respond ONLY with a JSON: {"score": 75, "reason": "brief explanation"}`,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 100,
    });

    const raw = JSON.parse(response.choices[0].message.content || "{}");
    return typeof raw.score === "number" ? raw.score : 75;
  } catch {
    return 75; // Default: pass if check fails
  }
}

// ── Wrapper: Generiere mit Retry wenn Score < 70% ────────────────────────────
export async function generateWithSimilarityCheck(
  generateFn: () => Promise<string>,
  characterDescriptions: string[],
  maxRetries: number = 2
): Promise<{ imageUrl: string; score: number; attempts: number }> {
  let attempts = 0;
  let bestUrl = "";
  let bestScore = 0;

  while (attempts < maxRetries) {
    attempts++;
    const imageUrl = await generateFn();

    if (!imageUrl || imageUrl.includes("picsum")) {
      return { imageUrl, score: 0, attempts };
    }

    // Extract base64 for check
    let base64 = "";
    if (imageUrl.startsWith("data:image/png;base64,")) {
      base64 = imageUrl.replace("data:image/png;base64,", "");
    } else {
      // URL – fetch and convert
      try {
        const res = await fetch(imageUrl);
        const buf = await res.arrayBuffer();
        base64 = Buffer.from(buf).toString("base64");
      } catch {
        return { imageUrl, score: 75, attempts };
      }
    }

    const score = await checkCharacterSimilarity(base64, characterDescriptions);

    if (score > bestScore) {
      bestScore = score;
      bestUrl = imageUrl;
    }

    // Pass if score >= 70
    if (score >= 70) break;
  }

  return { imageUrl: bestUrl, score: bestScore, attempts };
}
