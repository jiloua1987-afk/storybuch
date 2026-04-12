import { NextRequest, NextResponse } from "next/server";
import { generateComicPage } from "@/lib/comic-page-generator";
import { buildPageSVG, getPanelLayouts } from "@/lib/sharp-compositor";
import { buildComicPagePrompt } from "@/lib/prompt-builder";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchBuf(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

async function generateWithReference(prompt: string, refBase64: string): Promise<string> {
  try {
    const imgBuf = Buffer.from(refBase64, "base64");
    const blob = new Blob([imgBuf], { type: "image/jpeg" });
    const file = new File([blob], "ref.jpg", { type: "image/jpeg" });

    const response = await (openai.images as any).edit({
      model: "gpt-image-1",
      image: file,
      prompt,
      n: 1,
      size: "1536x1024",
    });

    const item = (response.data ?? [])[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return "";
  } catch (err: any) {
    console.error("Edit API fallback:", err.message);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { page, characters, illustrationStyle, comicStyle, category, referenceImages = [] } = await req.json();

    // Build prompt
    const prompt = buildComicPagePrompt({
      title: page.title,
      panels: page.panels,
      characters: characters || [],
      illustrationStyle: illustrationStyle || "comic",
      comicStyle: comicStyle || "emotional",
      category: category || "familie",
      location: page.location,
      timeOfDay: page.timeOfDay,
    });

    let rawUrl = "";

    // Option 1: Edit API with reference photo
    const primaryRef = characters?.find((c: any) => c.refBase64)?.refBase64 || referenceImages[0];
    if (primaryRef) {
      rawUrl = await generateWithReference(prompt, primaryRef);
    }

    // Fallback: Standard generate
    if (!rawUrl) {
      rawUrl = await generateComicPage(page, characters || [], illustrationStyle || "comic", comicStyle || "emotional", category || "familie");
    }

    if (!rawUrl || rawUrl.includes("picsum")) {
      return NextResponse.json({ imageUrl: rawUrl });
    }

    // Sharp text overlay
    const sharp = (await import("sharp")).default;
    const buf = await fetchBuf(rawUrl);
    if (!buf) return NextResponse.json({ imageUrl: rawUrl });

    const meta = await sharp(buf).metadata();
    const W = meta.width || 1536;
    const H = meta.height || 1024;
    const layouts = getPanelLayouts(page.panels.length, W, H);

    const svgStr = buildPageSVG({
      pageTitle: page.title,
      imageWidth: W, imageHeight: H,
      panels: page.panels.map((p: any, i: number) => ({
        nummer: p.nummer, dialog: p.dialog, speaker: p.speaker,
        position: (i % 2 === 0 ? "top-left" : "top-right") as "top-left" | "top-right",
        layout: layouts[i] || layouts[0],
      })),
    });

    const comp = await sharp(buf)
      .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
      .png().toBuffer();

    return NextResponse.json({ imageUrl: `data:image/png;base64,${comp.toString("base64")}` });
  } catch (err: any) {
    console.error("comic-page error:", err.message);
    return NextResponse.json({ error: err.message, imageUrl: "" }, { status: 500 });
  }
}
