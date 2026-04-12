// Schritt 1: Nur Story-Struktur + Characters generieren (schnell, ~5s)
import { NextRequest, NextResponse } from "next/server";
import { buildComicStructure, buildCharacterAnchors } from "@/lib/comic-page-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, comicStyle, mustHaveSentences, language, category, numPages = 4 } = await req.json();

    const [pages, characters] = await Promise.all([
      buildComicStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll",
        comicStyle || "emotional", mustHaveSentences || "", language || "de", numPages, category || "familie"),
      buildCharacterAnchors(storyInput || "", guidedAnswers || {}),
    ]);

    return NextResponse.json({ pages, characters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
