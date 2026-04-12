// Cover generieren
import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage, buildCoverSVG } from "@/lib/cover-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title, characters, category, illustrationStyle, location } = await req.json();

    const rawUrl = await generateCoverImage(title, characters || [], category || "familie", illustrationStyle || "comic", location || "");

    if (!rawUrl || rawUrl.includes("picsum")) {
      return NextResponse.json({ coverImageUrl: rawUrl });
    }

    const sharp = (await import("sharp")).default;
    let buf: Buffer;
    if (rawUrl.startsWith("data:")) {
      buf = Buffer.from(rawUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } else {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(20000) });
      buf = Buffer.from(await res.arrayBuffer());
    }

    const meta = await sharp(buf).metadata();
    const svgStr = buildCoverSVG(title, location || category, meta.width || 1024, meta.height || 1536);
    const composited = await sharp(buf)
      .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
      .png().toBuffer();

    return NextResponse.json({
      coverImageUrl: `data:image/png;base64,${composited.toString("base64")}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, coverImageUrl: "" }, { status: 500 });
  }
}
