import { NextRequest, NextResponse } from "next/server";
import { generateBubbleSVG, type Dialog } from "@/lib/bubble-engine";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, dialogs } = await req.json() as {
      imageUrl: string;
      dialogs: Dialog[];
    };

    if (!imageUrl || !dialogs?.length) {
      return NextResponse.json({ compositeUrl: imageUrl });
    }

    // Dynamically import sharp (server-only)
    const sharp = (await import("sharp")).default;

    // Fetch the raw image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Bild konnte nicht geladen werden.");
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    // Get image dimensions
    const meta = await sharp(imgBuffer).metadata();
    const imgW = meta.width || 1792;
    const imgH = meta.height || 1024;

    // Build composite overlays for each dialog
    const composites: { input: Buffer; left: number; top: number }[] = [];

    for (const dialog of dialogs) {
      const { svg, layout } = generateBubbleSVG(dialog);
      const svgBuffer = Buffer.from(svg);

      // Convert SVG to PNG via sharp
      const bubblePng = await sharp(svgBuffer)
        .png()
        .toBuffer();

      composites.push({
        input: bubblePng,
        left: Math.max(0, Math.min(layout.x, imgW - layout.width)),
        top: Math.max(0, Math.min(layout.y, imgH - layout.height - 35)),
      });
    }

    // Composite all bubbles onto the image
    const resultBuffer = await sharp(imgBuffer)
      .composite(composites)
      .png()
      .toBuffer();

    // Return as base64 data URL
    const base64 = resultBuffer.toString("base64");
    const compositeUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ compositeUrl });
  } catch (err: any) {
    console.error("Bubble engine error:", err);
    // Return original image URL as fallback
    const { imageUrl } = await req.json().catch(() => ({ imageUrl: "" }));
    return NextResponse.json({ compositeUrl: imageUrl, error: err.message });
  }
}
