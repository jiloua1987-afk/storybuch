import { NextRequest, NextResponse } from "next/server";
import { generateBookStructure, buildCharacters } from "@/lib/gpt";

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, language } = await req.json();

    if (!storyInput && !guidedAnswers?.characters) {
      return NextResponse.json({ error: "Keine Geschichte angegeben." }, { status: 400 });
    }

    // Run in parallel
    const [chapters, characters] = await Promise.all([
      generateBookStructure(storyInput || "", guidedAnswers || {}, tone || "humorvoll", language || "de"),
      buildCharacters(storyInput || "", guidedAnswers || {}),
    ]);

    return NextResponse.json({ chapters, characters });
  } catch (err: any) {
    console.error("Structure generation error:", err);
    return NextResponse.json({ error: err.message || "Fehler bei der Generierung." }, { status: 500 });
  }
}
