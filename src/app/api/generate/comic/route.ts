import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";

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
      numPages = 4,
    } = await req.json();

    if (!storyInput && !Object.values(guidedAnswers || {}).some((v: any) => v)) {
      return NextResponse.json({ error: "Keine Geschichte angegeben." }, { status: 400 });
    }

    // Step 1: Character Builder + Story Structure (parallel)
    const [pages, characters] = await Promise.all([
      buildComicStructure(
        storyInput || "",
        guidedAnswers || {},
        tone || "humorvoll",
        comicStyle || "emotional",
        mustHaveSentences || "",
        language || "de",
        numPages
      ),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    if (!pages.length) {
      return NextResponse.json({ error: "Keine Seiten generiert." }, { status: 500 });
    }

    // Step 2: Generate each page with Fix+Flex Prompt Builder
    // Sequential to avoid rate limits
    const comicPages = [];
    for (const page of pages) {
      const imageUrl = await generateComicPage(
        page,
        characters,
        illustrationStyle || "comic",
        comicStyle || "emotional"
      );
      comicPages.push({ ...page, imageUrl });
    }

    return NextResponse.json({ pages: comicPages, characters });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
