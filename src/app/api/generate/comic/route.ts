import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, generateComicPage } from "@/lib/comic-page-generator";

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
      characters,
      referenceImages, // Array of base64 strings from uploaded photos
      numPages = 4,
    } = await req.json();

    // Step 1: Build story structure
    const pages = await buildComicStructure(
      storyInput || "",
      guidedAnswers || {},
      tone || "humorvoll",
      comicStyle || "emotional",
      mustHaveSentences || "",
      language || "de",
      numPages
    );

    if (!pages.length) {
      return NextResponse.json({ error: "Keine Seiten generiert." }, { status: 500 });
    }

    // Build character description string
    const characterDesc = characters?.length
      ? characters.map((c: any) => `${c.name}: ${c.visual_anchor || c.name}`).join(", ")
      : "";

    // Use first reference image if available
    const refImage = referenceImages?.[0] || null;

    // Step 2: Generate each page image (sequentially to avoid rate limits)
    const comicPages = [];
    for (const page of pages) {
      const imageUrl = await generateComicPage(
        page,
        characterDesc,
        illustrationStyle || "comic",
        refImage
      );
      comicPages.push({ ...page, imageUrl });
    }

    return NextResponse.json({ pages: comicPages });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
