import { NextRequest } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { generateCoverImage, generateCharacterSheet } from "@/lib/cover-generator";
import { saveImageToStorage } from "@/lib/storage";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── GPT-4o analyzes reference photo → precise description ────────────────────
async function analyzeReferencePhoto(base64: string, name: string): Promise<string> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } },
          { type: "text", text: `Describe the person named "${name}" in this photo with extreme precision for comic illustration. Include: exact hair color and style, eye color, skin tone, approximate age, face shape, any distinctive features (beard, glasses, freckles etc.), typical clothing style. Write in English, max 60 words, as a visual anchor for an artist.` },
        ],
      }],
      max_tokens: 150,
    });
    return res.choices[0].message.content || "";
  } catch { return ""; }
}

// ── Ending text via GPT-4o ───────────────────────────────────────────────────
async function generateEndingText(
  storyInput: string,
  guidedAnswers: Record<string, string>,
  tone: string,
  language: string,
): Promise<string> {
  const langMap: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish" };
  const lang = langMap[language] || "German";

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "system",
      content: `Write a warm, emotional closing text for a personal comic book in ${lang}. Tone: ${tone}. Max 80 words. Make it feel like the last page of a beloved book – personal, touching, memorable. No title needed.`,
    }, {
      role: "user",
      content: storyInput || Object.values(guidedAnswers).filter(Boolean).join(", "),
    }],
    max_tokens: 150,
    temperature: 0.9,
  });

  return res.choices[0].message.content || "";
}

// ── MAIN STREAM HANDLER ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    storyInput, guidedAnswers, tone, comicStyle,
    mustHaveSentences, language, illustrationStyle,
    category = "familie", numPages = 5,
    referenceImages = [],
  } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        // Step 1: Structure + Characters
        send("progress", { label: "Geschichte wird analysiert…", progress: 5 });

        const [pages, rawCharacters] = await Promise.all([
          buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
            comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category),
          buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
        ]);

        if (!pages.length) throw new Error("Keine Seiten generiert.");

        // Analyze reference photos if provided
        let characters = rawCharacters;
        if (referenceImages.length > 0) {
          send("progress", { label: "Referenzfotos werden analysiert…", progress: 10 });
          characters = await Promise.all(rawCharacters.map(async (char: any, i: number) => {
            const refBase64 = referenceImages[i] || referenceImages[0];
            if (!refBase64) return char;
            const photoDesc = await analyzeReferencePhoto(refBase64, char.name);
            return { ...char, visual_anchor: photoDesc || char.visual_anchor };
          }));
        }

        send("structure", { pages, characters });
        send("progress", { label: `${pages.length} Seiten geplant`, progress: 15 });

        const location = guidedAnswers?.ort || guidedAnswers?.location || "";
        const bookTitle = (storyInput || "").split("\n")[0]?.substring(0, 50) || "Mein Comic";
        const dedication = guidedAnswers?.dedication || body.dedication || "";

        // Step 2: Cover → Supabase Storage
        send("progress", { label: "Cover wird erstellt…", progress: 18 });
        const bookId = `book-${Date.now()}`;
        let coverUrl = "";
        let characterSheetReference = ""; // For character consistency
        
        try {
          const rawCover = await generateCoverImage(
            bookTitle, characters, category, illustrationStyle || "comic", location, referenceImages
          );
          coverUrl = rawCover ? await saveImageToStorage(rawCover, "covers", `cover-${bookId}`) : "";
          send("cover", { coverImageUrl: coverUrl });
          send("progress", { label: "Cover fertig", progress: 22 });
        } catch (coverErr: any) {
          console.error("❌ Cover generation failed:", coverErr.message);
          console.error("Full error:", coverErr);
          send("progress", { label: "Cover übersprungen", progress: 22 });
        }

        // Step 2b: Character Reference Sheet (only if no user photos)
        if (referenceImages.length === 0 && characters.length > 0) {
          send("progress", { label: "Charakter-Referenz wird erstellt…", progress: 24 });
          try {
            const rawCharSheet = await generateCharacterSheet(
              characters, illustrationStyle || "comic", referenceImages
            );
            
            if (rawCharSheet) {
              // Convert to base64 for images.edit() API
              if (rawCharSheet.startsWith("http")) {
                try {
                  const response = await fetch(rawCharSheet);
                  const buffer = await response.arrayBuffer();
                  characterSheetReference = Buffer.from(buffer).toString("base64");
                  console.log("✓ Character sheet downloaded and converted to base64");
                } catch (e: any) {
                  console.warn("Character sheet download failed:", e.message);
                }
              } else if (rawCharSheet.startsWith("data:image")) {
                characterSheetReference = rawCharSheet.split(",")[1] || rawCharSheet;
                console.log("✓ Character sheet already in base64 format");
              } else {
                characterSheetReference = rawCharSheet;
              }
              console.log("✓ Character Reference Sheet created for consistency");
            }
            send("progress", { label: "Charakter-Referenz fertig", progress: 26 });
          } catch (e: any) {
            console.warn("Character sheet generation failed:", e.message);
            send("progress", { label: "Charakter-Referenz übersprungen", progress: 26 });
          }
        }

        // Step 3: Pages — raw images + panels JSON, no sharp compositing
        const progressPerPage = 64 / pages.length;

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const baseProgress = 26 + i * progressPerPage;
          send("progress", { label: `Seite ${i + 1}: "${page.title}"…`, progress: baseProgress });

          try {
            // Priority: User photos > Character Sheet > no reference
            let pageReferences: string[] = [];
            if (referenceImages.length > 0) {
              pageReferences = referenceImages;
              console.log(`Page ${i + 1}: Using user photo reference`);
            } else if (characterSheetReference) {
              pageReferences = [characterSheetReference];
              console.log(`Page ${i + 1}: Using character sheet reference`);
            } else {
              console.log(`Page ${i + 1}: No reference available`);
            }
            
            const rawUrl = await generateComicPage(
              page, characters,
              illustrationStyle || "comic",
              comicStyle || "emotional",
              category,
              pageReferences
            );

            // Save to Supabase → send public URL (no b64 over SSE)
            const imageUrl = rawUrl ? await saveImageToStorage(rawUrl, bookId, page.id || `page-${i}`) : "";

            send("page", {
              pageIndex: i,
              pageId: page.id,
              imageUrl,
              title: page.title,
              panels: page.panels,
            });
            send("progress", { label: `Seite ${i + 1} fertig`, progress: baseProgress + progressPerPage });
          } catch (pageErr: any) {
            console.error(`❌ Page ${i + 1} generation failed:`, pageErr.message);
            console.error("Full error:", pageErr);
            send("page", { pageIndex: i, pageId: page.id, imageUrl: "", title: page.title, panels: page.panels, error: pageErr.message });
          }
        }

        // Step 4: Ending — text as JSON, rendered in frontend
        send("progress", { label: "Abschlussseite wird erstellt…", progress: 92 });
        try {
          const endText = await generateEndingText(
            storyInput || "", guidedAnswers || {}, tone || "humorvoll", language || "de"
          );
          send("ending", { endingText: endText, dedication });
          send("progress", { label: "Abschlussseite fertig", progress: 97 });
        } catch (e: any) {
          console.error("Ending error:", e.message);
        }

        send("done", { message: "Comic fertig!" });
      } catch (err: any) {
        send("error", { message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
