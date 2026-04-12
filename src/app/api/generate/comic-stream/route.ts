import { NextRequest } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import { generateCoverImage, buildCoverSVG } from "@/lib/cover-generator";

// SSE helper
function sseMessage(event: string, data: unknown): string {
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    storyInput, guidedAnswers, tone, comicStyle,
    mustHaveSentences, language, illustrationStyle,
    category = "familie", numPages = 4,
  } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseMessage(event, data)));
      };

      try {
        // Step 1: Struktur
        send("progress", { step: "structure", label: "Geschichte wird analysiert…", progress: 5 });

        const [pages, characters] = await Promise.all([
          buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
            comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category),
          buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
        ]);

        if (!pages.length) throw new Error("Keine Seiten generiert.");

        send("structure", { pages, characters });
        send("progress", { step: "structure_done", label: `${pages.length} Seiten geplant`, progress: 15 });

        const sharp = (await import("sharp")).default;
        const location = guidedAnswers?.ort || guidedAnswers?.location || "";
        const bookTitle = (storyInput || "").split("\n")[0]?.substring(0, 50) || "Mein Comic";

        // Step 2: Cover
        send("progress", { step: "cover", label: "Cover wird erstellt…", progress: 18 });
        try {
          const coverRaw = await generateCoverImage(
            bookTitle, characters, category, illustrationStyle || "comic", location
          );
          let coverUrl = coverRaw;
          if (coverRaw && !coverRaw.includes("picsum")) {
            const buf = await fetchBuf(coverRaw);
            if (buf) {
              const meta = await sharp(buf).metadata();
              const W = meta.width || 1024;
              const H = meta.height || 1536;
              // Simple cover overlay – just title text, no complex SVG fonts
              const titleSvg = buildSimpleCoverSVG(bookTitle, W, H);
              const comp = await sharp(buf)
                .composite([{ input: Buffer.from(titleSvg), top: 0, left: 0 }])
                .png().toBuffer();
              coverUrl = `data:image/png;base64,${comp.toString("base64")}`;
            }
          }
          send("cover", { coverImageUrl: coverUrl });
          send("progress", { step: "cover_done", label: "Cover fertig", progress: 22 });
        } catch (e: any) {
          send("progress", { step: "cover_error", label: "Cover übersprungen", progress: 22 });
        }

        // Step 3: Seiten einzeln
        const progressPerPage = 75 / pages.length;

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const baseProgress = 22 + i * progressPerPage;
          send("progress", { step: `page_${i}`, label: `Seite ${i + 1}: "${page.title}"…`, progress: baseProgress });

          try {
            const rawUrl = await generateComicPage(
              page, characters, illustrationStyle || "comic",
              comicStyle || "emotional", category
            );

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
                  imageWidth: W,
                  imageHeight: H,
                  panels: page.panels.map((p: any, idx: number) => ({
                    nummer: p.nummer,
                    dialog: p.dialog,
                    speaker: p.speaker,
                    position: (idx % 2 === 0 ? "top-left" : "top-right") as "top-left" | "top-right",
                    layout: layouts[idx] || layouts[0],
                  })),
                });

                const comp = await sharp(buf)
                  .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
                  .png().toBuffer();
                finalUrl = `data:image/png;base64,${comp.toString("base64")}`;
              }
            }

            send("page", { pageIndex: i, pageId: page.id, imageUrl: finalUrl, title: page.title });
            send("progress", { step: `page_${i}_done`, label: `Seite ${i + 1} fertig`, progress: baseProgress + progressPerPage });
          } catch (e: any) {
            send("page", { pageIndex: i, pageId: page.id, imageUrl: "", title: page.title, error: e.message });
          }
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

// Einfaches Cover-SVG ohne problematische Fonts
function buildSimpleCoverSVG(title: string, W: number, H: number): string {
  const lines = title.length > 20
    ? [title.substring(0, 20), title.substring(20)]
    : [title];

  const overlayH = Math.round(H * 0.35);
  const overlayY = H - overlayH;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="rgba(20,10,5,0.88)"/>
  </linearGradient></defs>`;
  svg += `<rect x="0" y="${overlayY}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;

  lines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${H - overlayH * 0.45 + i * 52}"
      text-anchor="middle" font-family="serif" font-size="48"
      font-weight="bold" fill="white">${escXml(line)}</text>`;
  });

  svg += `<rect x="${W / 2 - 36}" y="${H - overlayH * 0.18}" width="72" height="3" fill="#C9963A" rx="1"/>`;
  svg += `</svg>`;
  return svg;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
