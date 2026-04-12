// Schritt 2: Eine einzelne Seite generieren (~25-40s)
import { NextRequest, NextResponse } from "next/server";
import { generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { page, characters, illustrationStyle, comicStyle, category } = await req.json();

    const rawUrl = await generateComicPage(
      page, characters || [],
      illustrationStyle || "comic",
      comicStyle || "emotional",
      category || "familie"
    );

    if (!rawUrl || rawUrl.includes("picsum")) {
      return NextResponse.json({ imageUrl: rawUrl });
    }

    // Sharp Text-Overlay
    const sharp = (await import("sharp")).default;

    let imgBuf: Buffer;
    if (rawUrl.startsWith("data:")) {
      imgBuf = Buffer.from(rawUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } else {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(20000) });
      imgBuf = Buffer.from(await res.arrayBuffer());
    }

    const meta = await sharp(imgBuf).metadata();
    const W = meta.width || 1536;
    const H = meta.height || 1024;
    const layouts = getPanelLayouts(page.panels.length, W, H);

    const svgStr = buildPageSVG({
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
    });

    const composited = await sharp(imgBuf)
      .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
      .png().toBuffer();

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${composited.toString("base64")}`,
    });
  } catch (err: any) {
    console.error("Page generation error:", err.message);
    return NextResponse.json({ error: err.message, imageUrl: "" }, { status: 500 });
  }
}
