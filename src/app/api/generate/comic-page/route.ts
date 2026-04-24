import { NextRequest, NextResponse } from "next/server";
import { generateComicPage } from "@/lib/comic-page-generator";
import { buildComicPagePrompt } from "@/lib/prompt-builder";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { page, characters, illustrationStyle, comicStyle, category } = await req.json();

    // Generate raw image — NO text overlay, NO sharp compositing
    const rawUrl = await generateComicPage(
      page,
      characters || [],
      illustrationStyle || "comic",
      comicStyle || "emotional",
      category || "familie"
    );

    // Return image URL + panels JSON (text rendered in frontend via CSS)
    return NextResponse.json({
      imageUrl: rawUrl || "",
      panels: page.panels || [],
    });
  } catch (err: any) {
    console.error("comic-page error:", err.message);
    return NextResponse.json({ error: err.message, imageUrl: "", panels: [] }, { status: 500 });
  }
}
