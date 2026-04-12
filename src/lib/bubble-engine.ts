// Bubble Engine – SVG Sprechblasen als Base64 Data URLs
// sharp wird serverseitig verwendet

export interface Dialog {
  speaker: string;
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-top";
  bubble_type: "speech" | "shout" | "thought" | "whisper" | "caption";
  bubble_color: string;
  order: number;
}

interface BubbleLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  tailX: number;
  tailY: number;
}

// ── Position → Koordinaten (für 1792×1024 Bild) ──────────────────────────────
function getLayout(position: Dialog["position"], imgW = 1792, imgH = 1024): BubbleLayout {
  const w = 320;
  const h = 120;
  const margin = 40;

  const positions: Record<Dialog["position"], BubbleLayout> = {
    "top-left":     { x: margin,           y: margin,           width: w, height: h, tailX: w * 0.25, tailY: h },
    "top-right":    { x: imgW - w - margin, y: margin,           width: w, height: h, tailX: w * 0.75, tailY: h },
    "bottom-left":  { x: margin,           y: imgH - h - margin, width: w, height: h, tailX: w * 0.25, tailY: 0 },
    "bottom-right": { x: imgW - w - margin, y: imgH - h - margin, width: w, height: h, tailX: w * 0.75, tailY: 0 },
    "center-top":   { x: imgW / 2 - w / 2,  y: margin,           width: w, height: h, tailX: w * 0.5,  tailY: h },
  };

  return positions[position] || positions["top-left"];
}

// ── SVG Bubble Shapes ─────────────────────────────────────────────────────────
function speechBubbleSVG(layout: BubbleLayout, color: string, text: string, speaker: string): string {
  const { width: w, height: h, tailX, tailY } = layout;
  const tailDown = tailY > 0;
  const tailPath = tailDown
    ? `M ${tailX - 15} ${h} L ${tailX} ${h + 30} L ${tailX + 15} ${h} Z`
    : `M ${tailX - 15} 0 L ${tailX} -30 L ${tailX + 15} 0 Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 35}">
    <rect x="2" y="${tailDown ? 2 : 32}" width="${w - 4}" height="${h - 4}" rx="20" ry="20"
      fill="${color}" stroke="#1f1a2e" stroke-width="3"/>
    <path d="${tailPath}" fill="${color}" stroke="#1f1a2e" stroke-width="3" stroke-linejoin="round"/>
    <text x="${w / 2}" y="${tailDown ? 28 : 58}" text-anchor="middle"
      font-family="Arial Black, sans-serif" font-size="13" font-weight="bold" fill="#1f1a2e">
      ${escapeXml(speaker)}
    </text>
    <text x="${w / 2}" y="${tailDown ? 50 : 80}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="12" fill="#1f1a2e">
      ${wrapText(escapeXml(text), 38)}
    </text>
  </svg>`;
}

function shoutBubbleSVG(layout: BubbleLayout, color: string, text: string, speaker: string): string {
  const { width: w, height: h } = layout;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 5;
  const ry = h / 2 - 5;
  const spikes = 12;
  let points = "";
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const r = i % 2 === 0 ? Math.max(rx, ry) + 15 : Math.min(rx, ry) - 5;
    points += `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)} `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <polygon points="${points.trim()}" fill="${color}" stroke="#1f1a2e" stroke-width="3"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle"
      font-family="Arial Black, sans-serif" font-size="13" font-weight="bold" fill="#1f1a2e">
      ${escapeXml(speaker)}
    </text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle"
      font-family="Arial Black, sans-serif" font-size="12" fill="#1f1a2e">
      ${escapeXml(text.substring(0, 20))}
    </text>
  </svg>`;
}

function thoughtBubbleSVG(layout: BubbleLayout, color: string, text: string, speaker: string): string {
  const { width: w, height: h } = layout;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 20}">
    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 8}" ry="${h / 2 - 8}"
      fill="${color}" stroke="#1f1a2e" stroke-width="3" stroke-dasharray="8,4"/>
    <circle cx="${w * 0.3}" cy="${h + 5}" r="8" fill="${color}" stroke="#1f1a2e" stroke-width="2"/>
    <circle cx="${w * 0.25}" cy="${h + 16}" r="5" fill="${color}" stroke="#1f1a2e" stroke-width="2"/>
    <text x="${w / 2}" y="${h / 2 - 6}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="11" font-style="italic" fill="#1f1a2e">
      ${escapeXml(speaker)}
    </text>
    <text x="${w / 2}" y="${h / 2 + 12}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="11" font-style="italic" fill="#1f1a2e">
      ${escapeXml(text.substring(0, 30))}
    </text>
  </svg>`;
}

function whisperBubbleSVG(layout: BubbleLayout, color: string, text: string, speaker: string): string {
  const { width: w, height: h } = layout;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="16" ry="16"
      fill="${color}" stroke="#1f1a2e" stroke-width="2" stroke-dasharray="6,4" opacity="0.9"/>
    <text x="${w / 2}" y="${h / 2 - 6}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="11" fill="#555">
      ${escapeXml(speaker)}
    </text>
    <text x="${w / 2}" y="${h / 2 + 12}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="11" fill="#555" font-style="italic">
      ${escapeXml(text.substring(0, 30))}
    </text>
  </svg>`;
}

function captionBubbleSVG(layout: BubbleLayout, color: string, text: string): string {
  const { width: w, height: h } = layout;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="8" ry="8"
      fill="#1f1a2e" opacity="0.85"/>
    <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="12" fill="white">
      ${escapeXml(text.substring(0, 40))}
    </text>
  </svg>`;
}

// ── Generate SVG for a dialog ─────────────────────────────────────────────────
export function generateBubbleSVG(dialog: Dialog): { svg: string; layout: BubbleLayout } {
  const layout = getLayout(dialog.position);
  const color = dialog.bubble_color || "#E8F4FF";
  let svg = "";

  switch (dialog.bubble_type) {
    case "shout":   svg = shoutBubbleSVG(layout, color, dialog.text, dialog.speaker); break;
    case "thought": svg = thoughtBubbleSVG(layout, color, dialog.text, dialog.speaker); break;
    case "whisper": svg = whisperBubbleSVG(layout, color, dialog.text, dialog.speaker); break;
    case "caption": svg = captionBubbleSVG(layout, color, dialog.text); break;
    default:        svg = speechBubbleSVG(layout, color, dialog.text, dialog.speaker);
  }

  return { svg, layout };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const mid = text.lastIndexOf(" ", maxChars);
  if (mid === -1) return text.substring(0, maxChars) + "…";
  return text.substring(0, mid) + "…";
}
