import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage } from "@/lib/cover-generator";
import { saveImageToStorage } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title, characters, category, illustrationStyle, location } = await req.json();

    const rawUrl = await generateCoverImage(
      title,
      characters || [],
      category || "familie",
      illustrationStyle || "comic",
      location || ""
    );

    if (!rawUrl) {
      return NextResponse.json({ coverImageUrl: "" });
    }

    // Save to Supabase Storage → return public URL (no b64 in response)
    const coverImageUrl = await saveImageToStorage(rawUrl, "covers", `cover-${Date.now()}`);

    return NextResponse.json({ coverImageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, coverImageUrl: "" }, { status: 500 });
  }
}
