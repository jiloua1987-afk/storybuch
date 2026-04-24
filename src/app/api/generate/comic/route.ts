import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors, generateComicPage } from "@/lib/comic-page-generator";
import { generateCoverImage } from "@/lib/cover-generator";
import { saveImageToStorage } from "@/lib/storage";

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
    const bookId = `book-${Date.now()}`;

    // Cover → Supabase
    let coverImageUrl = "";
    try {
      const rawCover = await generateCoverImage(
        bookTitle, characters, category, illustrationStyle || "comic", location
      );
      if (rawCover) {
        coverImageUrl = await saveImageToStorage(rawCover, "covers", `cover-${bookId}`);
      }
    } catch (e: any) {
      console.error("Cover error:", e.message);
    }

    // Pages → Supabase
    const comicPages = [];
    for (const page of pages) {
      let imageUrl = "";
      try {
        const rawUrl = await generateComicPage(
          page, characters, illustrationStyle || "comic", comicStyle || "emotional", category
        );
        if (rawUrl) {
          imageUrl = await saveImageToStorage(rawUrl, bookId, page.id || `page-${page.pageNumber}`);
        }
      } catch (e: any) {
        console.error(`Page ${page.pageNumber} error:`, e.message);
      }

      comicPages.push({ ...page, imageUrl, panels: page.panels });
    }

    return NextResponse.json({ pages: comicPages, coverImageUrl, characters });
  } catch (err: any) {
    console.error("Comic generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
