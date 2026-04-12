import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import { generateCoverImage, buildCoverSVG } from "@/lib/cover-generator";
import { generateWithSimilarityCheck } from "@/lib/similarity-check";
import fs from "fs";
import path from "path";

// Lade Stil-Referenzbild einmalig
function loadStyleReference(): string | undefined {
  try {
    const refPath = path.join(process.cwd(), "public", "Comic.png");
    if (fs.existsSync(refPath)) return fs.readFileSync(refPath).toString("base64");
  } catch { /* ignore */ }
  return undefined;
}

const STYLE_REF = loadStyleReference();

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
      buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
        comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    if (!pages.length) {
      return NextResponse.json({ error: "Keine Seiten generiert." }, { status: 500 });
    }

    const sharp = (await import("sharp")).default;
    const charDescriptions = characters.map((c: any) => c.visual_anchor);
    const location = guidedAnswers?.ort || guidedAnswers?.location || "";

    // Step 2: Cover-Bild generieren
    const coverRaw = await generateCoverImage(
      storyInput?.split("\n")[0] || "Mein Comic",
      characters,
      category,
      illustrationStyle || "comic",
      location,
      STYLE_REF
    );

    // Cover SVG Overlay
    let coverImageUrl = coverRaw;
    try {
      if (coverRaw && !coverRaw.includes("picsum")) {
        const coverBuf = coverRaw.startsWith("data:")
          ? Buffer.from(coverRaw.replace(/^data:image\/\w+;base64,/, ""), "base64")
          : Buffer.from(await (await fetch(coverRaw)).arrayBuffer());

        const meta = await sharp(coverBuf).metadata();
        const W = meta.width || 1024;
        const H = meta.height || 1536;
        const svgStr = buildCoverSVG(
          storyInput?.split("\n")[0] || "Mein Comic",
          location || category,
          W, H
        );
        const composited = await sharp(coverBuf)
          .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
          .png().toBuffer();
        coverImageUrl = `data:image/png;base64,${composited.toString("base64")}`;
      }
    } catch (e: any) {
      console.error("Cover composite error:", e.message);
    }

    // Step 3: Comic-Seiten generieren mit Ähnlichkeits-Check
    const comicPages = [];

    for (const page of pages) {
      // Generiere mit Retry wenn Figuren nicht passen
      const { imageUrl: rawImageUrl } = await generateWithSimilarityCheck(
        () => generateComicPage(page, characters, illustrationStyle || "comic",
          comicStyle || "emotional", category, STYLE_REF),
        charDescriptions,
        2 // max 2 Versuche
      );

      // Sharp Text-Overlay
      let finalImageUrl = rawImageUrl;
      try {
        if (rawImageUrl && !rawImageUrl.includes("picsum")) {
          const imgBuf = rawImageUrl.startsWith("data:")
            ? Buffer.from(rawImageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64")
            : Buffer.from(await (await fetch(rawImageUrl)).arrayBuffer());

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
        }
      } catch (e: any) {
        console.error("Page composite error:", e.message);
      }

      comicPages.push({ ...page, imageUrl: finalImageUrl });
    }

    return NextResponse.json({
      pages: comicPages,
      coverImageUrl,
      characters,
    });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
