import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const { storyInput, guidedAnswers, tone, language, dedication } = await req.json();
    const langMap: Record<string, string> = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    // GPT-4o schreibt Abschlusstext
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `Write a warm, emotional closing paragraph for a personal comic book in ${lang}. Tone: ${tone || "warm"}. Max 70 words. Make it feel like the last page of a beloved book – personal, touching, memorable. No title.`,
      }, {
        role: "user",
        content: storyInput || Object.values(guidedAnswers || {}).filter(Boolean).join(", "),
      }],
      max_tokens: 120,
      temperature: 0.9,
    });

    const endText = res.choices[0].message.content || "";

    // Endseite als SVG rendern
    const sharp = (await import("sharp")).default;
    const W = 1536; const H = 1024;

    const textLines = wrapText(endText, 55);
    const dedLines = dedication ? wrapText(`"${dedication}"`, 50) : [];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;

    // Top decoration
    svg += `<rect x="${W / 2 - 80}" y="80" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W / 2}" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("✦  ERINNERUNGEN  ✦")}</text>`;

    // Main text
    const startY = H * 0.28;
    textLines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${startY + i * 42}"
        text-anchor="middle" font-family="Georgia, serif"
        font-size="26" fill="#1A1410" font-style="italic">${escXml(line)}</text>`;
    });

    // Divider
    const divY = startY + textLines.length * 42 + 50;
    svg += `<rect x="${W / 2 - 40}" y="${divY}" width="80" height="2" fill="#C9963A" rx="1"/>`;

    // Dedication
    if (dedLines.length > 0) {
      const dedY = divY + 50;
      dedLines.forEach((line, i) => {
        svg += `<text x="${W / 2}" y="${dedY + i * 36}"
          text-anchor="middle" font-family="Georgia, serif"
          font-size="22" fill="#8B7355">${escXml(line)}</text>`;
      });
    }

    // Bottom
    svg += `<rect x="${W / 2 - 80}" y="${H - 80}" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W / 2}" y="${H - 45}" text-anchor="middle"
      font-family="Georgia, serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("✦  THE END  ✦")}</text>`;
    svg += `</svg>`;

    const buf = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 245, g: 237, b: 224, alpha: 1 } }
    }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();

    return NextResponse.json({ imageUrl: `data:image/png;base64,${buf.toString("base64")}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
