// Sharp Text-Overlay Engine
// Legt GPT-4o generierten Text als SVG auf das Rohbild
// Kein Text im DALL-E Prompt → keine Rechtschreibfehler

export interface PanelTextOverlay {
  pageTitle: string;
  pageSubtitle?: string;
  panels: {
    nummer: number;
    dialog?: string;
    speaker?: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    layout: PanelLayout;
    size?: "small" | "medium" | "large" | "splash"; // NEW: Panel size
  }[];
  imageWidth: number;
  imageHeight: number;
}

export interface PanelLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Panel-Layouts je nach Anzahl ──────────────────────────────────────────────
export function getPanelLayouts(
  panelCount: number,
  imgW: number,
  imgH: number
): PanelLayout[] {
  const border = 12;
  const titleH = 80; // Platz für Titel oben
  const usableH = imgH - titleH - border;
  const usableW = imgW - border * 2;

  switch (panelCount) {
    case 3:
      // Breites Panel oben + 2 unten (wie Zielbild)
      return [
        { x: border, y: titleH, width: usableW, height: usableH * 0.5 },
        { x: border, y: titleH + usableH * 0.5 + border, width: usableW / 2 - border / 2, height: usableH * 0.5 - border },
        { x: border + usableW / 2 + border / 2, y: titleH + usableH * 0.5 + border, width: usableW / 2 - border / 2, height: usableH * 0.5 - border },
      ];

    case 4:
      // 2×2 Grid
      return [
        { x: border, y: titleH, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
        { x: border + usableW / 2 + border / 2, y: titleH, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
        { x: border, y: titleH + usableH / 2 + border / 2, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
        { x: border + usableW / 2 + border / 2, y: titleH + usableH / 2 + border / 2, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
      ];

    case 5:
      // 2 oben + 1 breit mitte + 2 unten
      const rowH = usableH / 3;
      return [
        { x: border, y: titleH, width: usableW / 2 - border / 2, height: rowH - border / 2 },
        { x: border + usableW / 2 + border / 2, y: titleH, width: usableW / 2 - border / 2, height: rowH - border / 2 },
        { x: border, y: titleH + rowH + border / 2, width: usableW, height: rowH - border },
        { x: border, y: titleH + rowH * 2 + border, width: usableW / 2 - border / 2, height: rowH - border / 2 },
        { x: border + usableW / 2 + border / 2, y: titleH + rowH * 2 + border, width: usableW / 2 - border / 2, height: rowH - border / 2 },
      ];

    case 6:
      // 3×2 Grid
      const colW = usableW / 3;
      const h6 = usableH / 2;
      return [0, 1, 2, 3, 4, 5].map((i) => ({
        x: border + (i % 3) * (colW + border / 3),
        y: titleH + Math.floor(i / 3) * (h6 + border / 2),
        width: colW - border / 3,
        height: h6 - border / 2,
      }));

    default:
      return getPanelLayouts(4, imgW, imgH);
  }
}

// ── NEW: Dynamic Panel Layouts based on sizes ─────────────────────────────────
export function getDynamicPanelLayouts(
  panels: Array<{ size?: "small" | "medium" | "large" | "splash" }>,
  imgW: number,
  imgH: number
): PanelLayout[] {
  const border = 12;
  const titleH = 80;
  const usableH = imgH - titleH - border;
  const usableW = imgW - border * 2;

  // Check if there's a splash panel (full page)
  const hasSplash = panels.some(p => p.size === "splash");
  if (hasSplash) {
    // Splash panel takes entire page
    return panels.map((p, i) => {
      if (p.size === "splash") {
        return { x: border, y: titleH, width: usableW, height: usableH };
      }
      // Other panels get small space (shouldn't happen, but fallback)
      return { x: border, y: titleH, width: usableW / 4, height: usableH / 4 };
    });
  }

  // Calculate total "weight" of panels
  const weights = panels.map(p => {
    switch (p.size) {
      case "large": return 3;
      case "medium": return 2;
      case "small":
      default: return 1;
    }
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Simple vertical stacking based on weights
  const layouts: PanelLayout[] = [];
  let currentY = titleH;

  panels.forEach((panel, i) => {
    const weight = weights[i];
    const heightRatio = weight / totalWeight;
    const panelHeight = usableH * heightRatio - border;

    layouts.push({
      x: border,
      y: currentY,
      width: usableW,
      height: panelHeight
    });

    currentY += panelHeight + border;
  });

  return layouts;
}

// ── SVG für komplette Comic-Seite ─────────────────────────────────────────────
export function buildPageSVG(overlay: PanelTextOverlay): string {
  const { pageTitle, pageSubtitle, panels, imageWidth: W, imageHeight: H } = overlay;
  const titleH = 80;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;

  // White background
  svg += `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;

  // Page title
  svg += `<text x="${W / 2}" y="52" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="38" font-weight="900" fill="#1A1410"
    letter-spacing="1">${escXml(pageTitle.toUpperCase())}</text>`;

  if (pageSubtitle) {
    svg += `<text x="${W / 2}" y="74" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="16" fill="#8B7355">${escXml(pageSubtitle)}</text>`;
  }

  // Panels
  for (const panel of panels) {
    const { layout: l, dialog, speaker, position } = panel;

    // Panel border (black rectangle)
    svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}"
      fill="none" stroke="#1A1410" stroke-width="4" rx="2"/>`;

    // Caption box with text
    if (dialog) {
      const text = speaker ? `${speaker}: ${dialog}` : dialog;
      const lines = wrapLines(text, 22);
      const boxH = lines.length * 22 + 16;
      const boxW = Math.min(l.width * 0.55, 280);
      const margin = 10;

      let bx = l.x + margin;
      let by = l.y + margin;

      if (position === "top-right")    bx = l.x + l.width - boxW - margin;
      if (position === "bottom-left")  by = l.y + l.height - boxH - margin;
      if (position === "bottom-right") { bx = l.x + l.width - boxW - margin; by = l.y + l.height - boxH - margin; }

      // White box
      svg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}"
        fill="white" stroke="#1A1410" stroke-width="2" rx="4"/>`;

      // Text lines
      lines.forEach((line, i) => {
        svg += `<text x="${bx + 8}" y="${by + 18 + i * 22}"
          font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1A1410">${escXml(line)}</text>`;
      });
    }
  }

  svg += `</svg>`;
  return svg;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxChars: number): string[] {
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
  return lines.slice(0, 4); // max 4 Zeilen
}
