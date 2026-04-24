import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { generateCoverImage } from "@/lib/cover-generator";

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

    // Step 1: Story structure + Character Builder (parallel)
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

    const location = guidedAnswers?.ort || guidedAnswers?.location || "";
    const bookTitle = storyInput?.split("\n")[0]?.substring(0, 50) || "Mein Comic";

    // Step 2: Cover — raw image, no text overlay
    let coverImageUrl = "";
    try {
      coverImageUrl = await generateCoverImage(
        bookTitle, characters, category,
        illustrationStyle || "comic", location
      );
    } catch (e: any) {
      console.error("Cover error:", e.message);
    }

    // Step 3: Comic pages — raw images, no sharp compositing
    const comicPages = [];
    for (const page of pages) {
      let imageUrl = "";
      try {
        imageUrl = await generateComicPage(
          page, characters,
          illustrationStyle || "comic",
          comicStyle || "emotional",
          category
        );
      } catch (e: any) {
        console.error(`Page ${page.pageNumber} error:`, e.message);
      }

      comicPages.push({
        ...page,
        imageUrl,
        panels: page.panels, // panels JSON for frontend CSS overlay
      });
    }

    return NextResponse.json({ pages: comicPages, coverImageUrl, characters });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
