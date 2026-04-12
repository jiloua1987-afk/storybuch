import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import { generateCoverImage, buildCoverSVG } from "@/lib/cover-generator";
import fs from "fs";
import path from "path";

function loadStyleReference(): string | undefined {
  try {
    const refPath = path.join(process.cwd(), "public", "Comic.png");
    if (fs.existsSync(refPath)) return fs.readFileSync(refPath).toString("base64");
  } catch { /* ignore */ }
  return undefined;
}

const STYLE_REF = loadStyleReference();

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) {
      return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      storyInput, guidedAnswers, tone, comicStyle,
      mustHaveSentences, language, illustrationStyle,
      category = "familie", numPages = 4,
    } = await req.json();

    if (!storyInput && !Object.values(guidedAnswers || {}).some((v: any) => v)) {
      return NextResponse.json({ error: "Keine Geschichte angegeben." }, { status: 400 });
    }

    // Step 1: Story-Struktur + Character Builder (parallel)
    const [pages, characters] = await Promise.all([
      buildComicStructure(
        storyInput || "", guidedAnswers || {}, tone || "humorvoll",
        comicStyle || "emotional", mustHaveSentences || "",
        language || "de", numPages, category
      ),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    if (!pages.length) {
      return NextResponse.json({ error: "Keine Seiten generiert." }, { status: 500 });
    }

    const sharp = (await import("sharp")).default;
    const location = guidedAnswers?.ort || guidedAnswers?.location || "";
    const bookTitle = storyInput?.split("\n")[0]?.substring(0, 50) || "Mein Comic";

    // Step 2: Cover generieren
    let coverImageUrl = "";
    try {
      const coverRaw = await generateCoverImage(
        bookTitle, characters, category,
        illustrationStyle || "comic", location
        // Kein Stil-Referenz für Cover – eigenes Format
      );

      if (coverRaw && !coverRaw.includes("picsum")) {
        const coverBuf = await fetchImageBuffer(coverRaw);
        if (coverBuf) {
          const meta = await sharp(coverBuf).metadata();
          const W = meta.width || 1024;
          const H = meta.height || 1536;
          const svgStr = buildCoverSVG(bookTitle, location || category, W, H);
          const composited = await sharp(coverBuf)
            .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
            .png().toBuffer();
          coverImageUrl = `data:image/png;base64,${composited.toString("base64")}`;
        } else {
          coverImageUrl = coverRaw;
        }
      }
    } catch (e: any) {
      console.error("Cover error:", e.message);
    }

    // Step 3: Comic-Seiten generieren
    const comicPages = [];

    for (const page of pages) {
      let finalImageUrl = "";

      try {
        // Generiere Rohbild (ohne Text)
        const rawUrl = await generateComicPage(
          page, characters,
          illustrationStyle || "comic",
          comicStyle || "emotional",
          category
          // Stil-Referenz temporär deaktiviert bis responses API stabil
        );

        if (rawUrl && !rawUrl.includes("picsum")) {
          const imgBuf = await fetchImageBuffer(rawUrl);
          if (imgBuf) {
            const meta = await sharp(imgBuf).metadata();
            const W = meta.width || 1536;
            const H = meta.height || 1024;
            const layouts = getPanelLayouts(page.panels.length, W, H);

            const overlayData = {
              pageTitle: page.title,
              imageWidth: W,
              imageHeight: H,
              panels: page.panels.map((p: any, i: number) => ({
                nummer: p.nummer,
                dialog: p.dialog,
                speaker: p.speaker,
                position: (i % 2 === 0 ? "top-left" : "top-right") as "top-left" | "top-right",
                layout: layouts[i] || layouts[0],
              })),
            };

            const svgStr = buildPageSVG(overlayData);
            const composited = await sharp(imgBuf)
              .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
              .png().toBuffer();
            finalImageUrl = `data:image/png;base64,${composited.toString("base64")}`;
          } else {
            finalImageUrl = rawUrl;
          }
        } else {
          finalImageUrl = rawUrl;
        }
      } catch (e: any) {
        console.error(`Page ${page.pageNumber} error:`, e.message);
        finalImageUrl = `https://picsum.photos/seed/page${page.pageNumber}/1536/1024`;
      }

      comicPages.push({ ...page, imageUrl: finalImageUrl });
    }

    return NextResponse.json({ pages: comicPages, coverImageUrl, characters });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
