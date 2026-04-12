import { NextRequest } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import { generateCoverImage } from "@/lib/cover-generator";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function fetchBuf(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

// ── GPT-4o analysiert Referenzfoto → präzise Beschreibung ────────────────────
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

// ── gpt-image-1 Edit mit Referenzfoto ────────────────────────────────────────
async function generatePageWithReference(
  prompt: string,
  referenceBase64: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  try {
    const imgBuffer = Buffer.from(referenceBase64, "base64");
    const blob = new Blob([imgBuffer], { type: mimeType });
    const file = new File([blob], "reference.jpg", { type: mimeType });

    const response = await (openai.images as any).edit({
      model: "gpt-image-1",
      image: file,
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });

    const item = (response.data ?? [])[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error("Edit API error:", err.message);
    return ""; // Fallback to standard generate
  }
}

// ── Endseite generieren ───────────────────────────────────────────────────────
async function generateEndingText(
  storyInput: string,
  guidedAnswers: Record<string, string>,
  tone: string,
  language: string,
  dedication: string
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

// ── Endseite SVG ──────────────────────────────────────────────────────────────
function buildEndPageSVG(
  endingText: string,
  dedication: string,
  W: number,
  H: number
): string {
  const lines = wrapText(endingText, 45);
  const dedLines = dedication ? wrapText(`"${dedication}"`, 40) : [];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;

  // Decorative top line
  svg += `<rect x="${W / 2 - 60}" y="60" width="120" height="3" fill="#C9963A" rx="1"/>`;

  // Ending text
  const startY = H * 0.25;
  lines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${startY + i * 36}"
      text-anchor="middle" font-family="Georgia, serif"
      font-size="22" fill="#1A1410" font-style="italic">${escXml(line)}</text>`;
  });

  // Decorative divider
  const divY = startY + lines.length * 36 + 40;
  svg += `<rect x="${W / 2 - 30}" y="${divY}" width="60" height="2" fill="#C9963A" rx="1"/>`;

  // Dedication
  if (dedLines.length > 0) {
    const dedY = divY + 40;
    dedLines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${dedY + i * 30}"
        text-anchor="middle" font-family="Georgia, serif"
        font-size="18" fill="#8B7355">${escXml(line)}</text>`;
    });
  }

  // Bottom decoration
  svg += `<rect x="${W / 2 - 60}" y="${H - 60}" width="120" height="3" fill="#C9963A" rx="1"/>`;
  svg += `<text x="${W / 2}" y="${H - 30}" text-anchor="middle"
    font-family="Georgia, serif" font-size="14" fill="#8B7355" letter-spacing="3">✦ THE END ✦</text>`;

  svg += `</svg>`;
  return svg;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Cover SVG ─────────────────────────────────────────────────────────────────
function buildCoverSVG(title: string, W: number, H: number): string {
  const lines = title.length > 22 ? [title.substring(0, 22), title.substring(22)] : [title];
  const overlayH = Math.round(H * 0.38);
  const overlayY = H - overlayH;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(15,8,3,0.9)"/>
  </linearGradient></defs>`;
  svg += `<rect x="0" y="${overlayY}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;
  lines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${H - overlayH * 0.5 + i * 54}"
      text-anchor="middle" font-family="Georgia, serif"
      font-size="52" font-weight="bold" fill="white">${escXml(line)}</text>`;
  });
  svg += `<rect x="${W / 2 - 40}" y="${H - overlayH * 0.18}" width="80" height="3" fill="#C9963A" rx="1"/>`;
  svg += `</svg>`;
  return svg;
}

// ── MAIN STREAM HANDLER ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    storyInput, guidedAnswers, tone, comicStyle,
    mustHaveSentences, language, illustrationStyle,
    category = "familie", numPages = 4,
    referenceImages = [],  // Base64 Personenfotos aus Schritt 2
  } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        // Step 1: Struktur + Characters
        send("progress", { label: "Geschichte wird analysiert…", progress: 5 });

        const [pages, rawCharacters] = await Promise.all([
          buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
            comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category),
          buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
        ]);

        if (!pages.length) throw new Error("Keine Seiten generiert.");

        // Option 2: Referenzfotos analysieren → präzise Beschreibungen
        let characters = rawCharacters;
        if (referenceImages.length > 0) {
          send("progress", { label: "Referenzfotos werden analysiert…", progress: 10 });
          characters = await Promise.all(rawCharacters.map(async (char: any, i: number) => {
            const refBase64 = referenceImages[i] || referenceImages[0];
            if (!refBase64) return char;
            const photoDesc = await analyzeReferencePhoto(refBase64, char.name);
            return { ...char, visual_anchor: photoDesc || char.visual_anchor, refBase64 };
          }));
        }

        send("structure", { pages, characters });
        send("progress", { label: `${pages.length} Seiten geplant`, progress: 15 });

        const sharp = (await import("sharp")).default;
        const location = guidedAnswers?.ort || guidedAnswers?.location || "";
        const bookTitle = (storyInput || "").split("\n")[0]?.substring(0, 50) || "Mein Comic";
        const dedication = guidedAnswers?.dedication || body.dedication || "";

        // Step 2: Cover
        send("progress", { label: "Cover wird erstellt…", progress: 18 });
        try {
          const coverRaw = await generateCoverImage(bookTitle, characters, category, illustrationStyle || "comic", location);
          let coverUrl = coverRaw;
          if (coverRaw && !coverRaw.includes("picsum")) {
            const buf = await fetchBuf(coverRaw);
            if (buf) {
              const meta = await sharp(buf).metadata();
              const svgStr = buildCoverSVG(bookTitle, meta.width || 1024, meta.height || 1536);
              const comp = await sharp(buf).composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }]).png().toBuffer();
              coverUrl = `data:image/png;base64,${comp.toString("base64")}`;
            }
          }
          send("cover", { coverImageUrl: coverUrl });
          send("progress", { label: "Cover fertig", progress: 22 });
        } catch (e: any) {
          send("progress", { label: "Cover übersprungen", progress: 22 });
        }

        // Step 3: Seiten
        const progressPerPage = 68 / pages.length;
        const primaryRef = referenceImages[0] || null;

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const baseProgress = 22 + i * progressPerPage;
          send("progress", { label: `Seite ${i + 1}: "${page.title}"…`, progress: baseProgress });

          try {
            let rawUrl = "";

            // Option 1: gpt-image-1 Edit mit Referenzfoto
            if (primaryRef) {
              const prompt = buildPagePromptForEdit(page, characters, illustrationStyle || "comic", comicStyle, category);
              rawUrl = await generatePageWithReference(prompt, primaryRef);
            }

            // Fallback: Standard generate (Option 3: starker Konsistenz-Prompt)
            if (!rawUrl) {
              rawUrl = await generateComicPage(page, characters, illustrationStyle || "comic", comicStyle || "emotional", category);
            }

            let finalUrl = rawUrl;
            if (rawUrl && !rawUrl.includes("picsum")) {
              const buf = await fetchBuf(rawUrl);
              if (buf) {
                const meta = await sharp(buf).metadata();
                const W = meta.width || 1536;
                const H = meta.height || 1024;
                const layouts = getPanelLayouts(page.panels.length, W, H);
                const svgStr = buildPageSVG({
                  pageTitle: page.title,
                  imageWidth: W, imageHeight: H,
                  panels: page.panels.map((p: any, idx: number) => ({
                    nummer: p.nummer, dialog: p.dialog, speaker: p.speaker,
                    position: (idx % 2 === 0 ? "top-left" : "top-right") as "top-left" | "top-right",
                    layout: layouts[idx] || layouts[0],
                  })),
                });
                const comp = await sharp(buf).composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }]).png().toBuffer();
                finalUrl = `data:image/png;base64,${comp.toString("base64")}`;
              }
            }

            send("page", { pageIndex: i, pageId: page.id, imageUrl: finalUrl, title: page.title });
            send("progress", { label: `Seite ${i + 1} fertig`, progress: baseProgress + progressPerPage });
          } catch (e: any) {
            send("page", { pageIndex: i, pageId: page.id, imageUrl: "", title: page.title });
          }
        }

        // Step 4: Endseite
        send("progress", { label: "Abschlussseite wird erstellt…", progress: 92 });
        try {
          const endText = await generateEndingText(storyInput || "", guidedAnswers || {}, tone || "humorvoll", language || "de", dedication);
          const sharp2 = (await import("sharp")).default;
          const W = 1536; const H = 1024;
          const endSvg = buildEndPageSVG(endText, dedication, W, H);
          const endBuf = await sharp2({ create: { width: W, height: H, channels: 4, background: { r: 245, g: 237, b: 224, alpha: 1 } } })
            .composite([{ input: Buffer.from(endSvg), top: 0, left: 0 }])
            .png().toBuffer();
          const endUrl = `data:image/png;base64,${endBuf.toString("base64")}`;
          send("page", { pageIndex: pages.length, pageId: "ending", imageUrl: endUrl, title: "Das Ende" });
          send("progress", { label: "Abschlussseite fertig", progress: 97 });
        } catch (e: any) {
          console.error("Ending page error:", e.message);
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

// Prompt für Edit-API (kompakter als Standard-Prompt)
function buildPagePromptForEdit(page: any, characters: any[], style: string, comicStyle: string, category: string): string {
  const styleMap: Record<string, string> = {
    comic: "warm watercolor comic style, bold outlines, vibrant colors",
    aquarell: "soft watercolor, pastel colors",
    bleistift: "pencil sketch comic style",
    realistisch: "realistic comic art",
  };
  const charAnchors = characters.map((c: any) => `${c.name}: ${c.visual_anchor}`).join("; ");
  const panelDescs = page.panels.map((p: any) => `Panel ${p.nummer}: ${p.szene}`).join(". ");

  return `Transform this reference photo into a ${styleMap[style] || styleMap.comic} comic page with ${page.panels.length} panels in a 2x2 grid layout. Black panel borders. Cream background. Page title "${page.title.toUpperCase()}" at top. Keep the people from the reference photo as the main characters (${charAnchors}). Panels: ${panelDescs}. NO text in panels.`;
}
