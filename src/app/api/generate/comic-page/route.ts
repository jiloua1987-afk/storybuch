import { NextRequest, NextResponse } from "next/server";
import { generateComicPage } from "@/lib/comic-page-generator";
import { saveImageToStorage } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { page, characters, illustrationStyle, comicStyle, category, referenceImages } = await req.json();

    // Generate raw image — with user reference photo if available
    const rawUrl = await generateComicPage(
      page,
      characters || [],
      illustrationStyle || "comic",
      comicStyle || "emotional",
      category || "familie",
      referenceImages || []
    );

    if (!rawUrl) {
      return NextResponse.json({ imageUrl: "", panels: page.panels || [] });
    }

    // Save to Supabase Storage → return public URL (no b64 in response)
    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const imageUrl = await saveImageToStorage(rawUrl, bookId, page.id || `page-${Date.now()}`);

    return NextResponse.json({
      imageUrl,
      panels: page.panels || [],
    });
  } catch (err: any) {
    console.error("comic-page error:", err.message);
    return NextResponse.json({ error: err.message, imageUrl: "", panels: [] }, { status: 500 });
  }
}
