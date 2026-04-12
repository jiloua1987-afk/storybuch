import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import fs from "fs";
import path from "path";

// Lade Stil-Referenzbild einmalig beim Start
function loadStyleReference(): string | undefined {
  try {
    const refPath = path.join(process.cwd(), "public", "Comic.png");
    if (fs.existsSync(refPath)) {
      return fs.readFileSync(refPath).toString("base64");
    }
  } catch { /* ignore */ }
  return undefined;
}

const STYLE_REFERENCE_B64 = loadStyleReference();

export async function POST(req: NextRequest) {
  try {
    const {
      storyInput,
      guidedAnswers,
      tone,
      comicStyle,
      mustHaveSentences,
      language,
      illustrationStyle,
      category = "familie",
      numPages = 4,
    } = await req.json();

    if (!storyInput && !Object.values(guidedAnswers || {}).some((v: any) => v)) {
      return NextResponse.json({ error: "Keine Geschichte angegeben." }, { status: 400 });
    }

    // Step 1: Character Builder + Story Structure (parallel)
    const [pages, characters] = await Promise.all([
      buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
        comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    if (!pages.length) {
      return NextResponse.json({ error: "Keine Seiten generiert." }, { status: 500 });
    }

    // Step 2: Generate raw images (NO text) + composite text overlay
    const sharp = (await import("sharp")).default;
    const comicPages = [];

    for (const page of pages) {
      // Generate raw image without text
      const rawImageUrl = await generateComicPage(page, characters, illustrationStyle || "comic", comicStyle || "emotional", category, STYLE_REFERENCE_B64);

      // Fetch raw image
      let finalImageUrl = rawImageUrl;
      try {
        const imgRes = await fetch(rawImageUrl);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const meta = await sharp(imgBuffer).metadata();
          const W = meta.width || 1536;
          const H = meta.height || 1024;

          // Build panel layouts
          const layouts = getPanelLayouts(page.panels.length, W, H);

          // Build SVG overlay with title + dialogs
          const overlayData = {
            pageTitle: page.title,
            pageSubtitle: page.location || undefined,
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

          const svgString = buildPageSVG(overlayData);
          const svgBuffer = Buffer.from(svgString);

          // Composite SVG over raw image
          const composited = await sharp(imgBuffer)
            .composite([{ input: svgBuffer, top: 0, left: 0 }])
            .png()
            .toBuffer();

          finalImageUrl = `data:image/png;base64,${composited.toString("base64")}`;
        }
      } catch (compositeErr: any) {
        console.error("Composite error:", compositeErr.message);
        // Fall back to raw image
      }

      comicPages.push({ ...page, imageUrl: finalImageUrl });
    }

    return NextResponse.json({ pages: comicPages, characters });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
