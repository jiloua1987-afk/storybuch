import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage } from "@/lib/cover-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title, characters, category, illustrationStyle, location } = await req.json();

    // Generate raw cover image — NO title overlay, NO sharp compositing
    // Title overlay is rendered in frontend via CSS
    const rawUrl = await generateCoverImage(
      title,
      characters || [],
      category || "familie",
      illustrationStyle || "comic",
      location || ""
    );

    return NextResponse.json({ coverImageUrl: rawUrl || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, coverImageUrl: "" }, { status: 500 });
  }
}
