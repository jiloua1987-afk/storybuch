import { NextRequest, NextResponse } from "next/server";
import { generateDialogs } from "@/lib/gpt";

export async function POST(req: NextRequest) {
  try {
    const { chapter, characters, tone, comicStyle, mustHaveSentences, language } = await req.json();

    if (!chapter || !characters) {
      return NextResponse.json({ error: "Kapitel und Figuren erforderlich." }, { status: 400 });
    }

    const dialogs = await generateDialogs(
      chapter,
      characters,
      tone || "humorvoll",
      comicStyle || "emotional",
      mustHaveSentences || "",
      language || "de"
    );

    return NextResponse.json({ dialogs });
  } catch (err: any) {
    console.error("Dialog generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
