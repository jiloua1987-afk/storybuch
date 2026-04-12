import { NextRequest, NextResponse } from "next/server";
import { generatePanelImage } from "@/lib/dalle";

export async function POST(req: NextRequest) {
  try {
    const { chapter, characters, illustrationStyle, dialogPositions } = await req.json();

    if (!chapter) {
      return NextResponse.json({ error: "Kapitel erforderlich." }, { status: 400 });
    }

    const imageUrl = await generatePanelImage(
      chapter,
      characters || [],
      illustrationStyle || "comic",
      dialogPositions || ["top-left", "top-right"]
    );

    return NextResponse.json({ imageUrl, chapterId: chapter.id });
  } catch (err: any) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
