const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Comic font — Bangers (Google Fonts, OFL License)
const COMIC_FONT_PATH = (() => {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', 'Bangers.ttf'),
    path.join(__dirname, '..', '..', 'public', 'fonts', 'Bangers.ttf'),
    '/app/public/fonts/Bangers.ttf',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
})();

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function createComicPDF(project) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
    info: { Title: project.title, Author: 'ComicStyle.de', Creator: 'ComicStyle.de' }
  });

  if (COMIC_FONT_PATH) {
    doc.registerFont('Bangers', COMIC_FONT_PATH);
    console.log(`✓ Comic font loaded`);
  }
  const BUBBLE_FONT = COMIC_FONT_PATH ? 'Bangers' : 'Helvetica';

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const A4_W = 595;
  const A4_H = 842;

  // ── POSTER-MODUS: 1 Seite, Vollbild, kein Cover, kein Header ─────────────
  if (project.isPoster) {
    const posterPage = project.chapters[0];
    if (posterPage?.imageUrl) {
      doc.addPage();
      try {
        const buf = await fetchImageBuffer(posterPage.imageUrl);
        // Vollbild — ganzes A4 ausgefüllt, fit:contain damit Panels nicht abgeschnitten
        const img = await sharp(buf)
          .resize(A4_W * 2, A4_H * 2, { fit: 'contain', position: 'center', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png().toBuffer();
        doc.image(img, 0, 0, { width: A4_W, height: A4_H });

        // Tatsächliche Bildgröße nach Letterboxing — identisch mit Comic-Buch-Logik
        const srcRatio = 1024 / 1536;
        const ctnRatio = A4_W / A4_H;
        let aW, aH, aX, aY;
        if (srcRatio < ctnRatio) {
          aH = A4_H; aW = A4_H * srcRatio;
          aX = (A4_W - aW) / 2; aY = 0;
        } else {
          aW = A4_W; aH = A4_W / srcRatio;
          aX = 0; aY = (A4_H - aH) / 2;
        }
        console.log(`  → Poster image area: ${aW.toFixed(0)}×${aH.toFixed(0)} at (${aX.toFixed(0)},${aY.toFixed(0)})`);

        // CRITICAL: Bubble positions are stored as % of the preview container (510×765px).
        // The poster PDF image area is 561×842 (full A4, no header).
        // We must scale bubble coordinates from the 510×765 preview reference to 561×842 PDF.
        // Scale factors: scaleW = aW/510, scaleH = aH/765
        const PREVIEW_W = 510;
        const PREVIEW_H = 765;
        const bubbleScaleW = aW / PREVIEW_W;
        const bubbleScaleH = aH / PREVIEW_H;
        // Titel-Overlay (wie Cover)
        const title = project.title.toUpperCase();
        const maxW = A4_W - 80;
        let titleFontSize = 28;
        doc.font('Helvetica-Bold');
        while (titleFontSize > 12 && doc.widthOfString(title, { fontSize: titleFontSize }) > maxW) titleFontSize -= 2;
        const titleTextH = doc.heightOfString(title, { width: maxW, fontSize: titleFontSize, lineGap: 3 });
        const titleLineGap = 18;
        const titleBlockY = aY + aH - 140 - (titleLineGap + titleTextH + titleLineGap) / 2;
        doc.moveTo(A4_W / 2 - 50, titleBlockY).lineTo(A4_W / 2 + 50, titleBlockY)
           .lineWidth(2.5).strokeColor('#C9963A').stroke();
        doc.fillOpacity(1).fontSize(titleFontSize).font('Helvetica-Bold').fillColor('#FFFFFF')
           .text(title, 40, titleBlockY + titleLineGap, { width: maxW, align: 'center', lineGap: 3 });
        doc.moveTo(A4_W / 2 - 50, titleBlockY + titleLineGap + titleTextH + titleLineGap)
           .lineTo(A4_W / 2 + 50, titleBlockY + titleLineGap + titleTextH + titleLineGap)
           .lineWidth(2.5).strokeColor('#C9963A').stroke();

        // Widmung-Overlay — kein schwarzer Balken, nur Text + goldene Linien
        if (project.posterDedication) {
          const dedText = project.posterDedication;
          const dedFrom = project.posterDedicationFrom || "";
          const dedPos  = project.posterDedicationPosition || "bottom";
          const dedFontSize = 13;
          const dedH   = doc.fontSize(dedFontSize).heightOfString(dedText, { width: A4_W - 80, lineGap: 3 });
          const fromH  = dedFrom ? doc.fontSize(11).heightOfString(`— ${dedFrom}`, { width: A4_W - 80 }) + 10 : 0;
          const blockH = 16 + dedH + fromH + 16;
          const blockY = dedPos === "top" ? aY + 20 : aY + aH - 20 - blockH;

          doc.moveTo(A4_W / 2 - 40, blockY).lineTo(A4_W / 2 + 40, blockY)
             .lineWidth(2).strokeColor('#C9963A').stroke();
          doc.fillOpacity(1).fontSize(dedFontSize).font('Helvetica-Oblique').fillColor('#FFFFFF')
             .text(dedText, 40, blockY + 16, { width: A4_W - 80, align: 'center', lineGap: 3 });
          if (dedFrom) {
            doc.fontSize(11).font('Helvetica').fillColor('#C9963A')
               .text(`— ${dedFrom}`, 40, blockY + 16 + dedH + 10, { width: A4_W - 80, align: 'center' });
          }
          doc.moveTo(A4_W / 2 - 40, blockY + blockH).lineTo(A4_W / 2 + 40, blockY + blockH)
             .lineWidth(2).strokeColor('#C9963A').stroke();
        }

        // ── Sprechblasen — identisch mit Comic-Buch-Logik ─────────────────
        const hiddenBubbles = new Set(posterPage.hiddenBubbles || []);
        const allBubbles = [];
        (posterPage.panels || []).forEach((panel, panelIdx) => {
          if (panel.dialogs && panel.dialogs.length > 0) {
            panel.dialogs.forEach((d, bIdx) => {
              const bid = `${panelIdx}-${bIdx}`;
              if (hiddenBubbles.has(bid)) return;
              if (!d.text || !d.text.trim() || d.text.toLowerCase() === 'null') return;
              allBubbles.push({ nummer: panel.nummer, bubbleIndex: bIdx, dialog: d.text, speaker: d.speaker, bubble_type: panel.bubble_type });
            });
          } else if (panel.dialog && panel.dialog.trim() && panel.dialog.toLowerCase() !== 'null') {
            const bid = `${panelIdx}-0`;
            if (!hiddenBubbles.has(bid)) {
              allBubbles.push({ nummer: panel.nummer, bubbleIndex: 0, dialog: panel.dialog, speaker: panel.speaker, bubble_type: panel.bubble_type });
            }
          }
        });
        (posterPage.extraBubbles || []).forEach(extra => {
          allBubbles.push({ nummer: -1, bubbleIndex: 0, dialog: extra.dialog, speaker: extra.speaker || '', bubble_type: 'speech', isExtra: true, extraTop: extra.top, extraLeft: extra.left });
        });

        console.log(`  → Poster bubbles: ${allBubbles.length} (hidden: ${hiddenBubbles.size})`);
        console.log(`  → panelPositions: ${(posterPage.panelPositions || []).length}`);

        allBubbles.forEach((bubble, idx) => {
          const speakerText = (bubble.speaker && bubble.speaker !== 'narrator' && bubble.speaker.toLowerCase() !== 'null') ? bubble.speaker + ': ' : '';
          const fallbackRow = Math.floor(idx / 2);
          const fallbackCol = idx % 2;
          let bX = aX + (fallbackCol === 0 ? 0.05 : 0.55) * aW;
          let bY = aY + (0.05 + fallbackRow * 0.25) * aH;
          let bW = aW * 0.20;
          let bH = aH * 0.07;

          if (bubble.isExtra) {
            // Extra bubbles: % of preview container → scale to PDF
            bX = aX + (bubble.extraLeft / 100) * PREVIEW_W * bubbleScaleW;
            bY = aY + (bubble.extraTop  / 100) * PREVIEW_H * bubbleScaleH;
          } else {
            const pos = (posterPage.panelPositions || []).find(p => p.nummer === bubble.nummer && p.bubbleIndex === bubble.bubbleIndex);
            if (pos) {
              // pos.left/top are % of preview container (510×765px)
              // Scale to PDF: multiply by (aW/510) and (aH/765)
              bX = aX + (pos.left / 100) * PREVIEW_W * bubbleScaleW;
              bY = aY + (pos.top  / 100) * PREVIEW_H * bubbleScaleH;
              if (pos.width && pos.height) {
                const isDefaultSize = pos.width === 20 && pos.height === 10;
                if (isDefaultSize) {
                  // Calculate from text, scale to PDF
                  const textLen = (bubble.speaker ? bubble.speaker + ': ' : '').length + (bubble.dialog || '').length;
                  const wPx = Math.min(220, Math.max(100, 80 + textLen * 3.2));
                  const lines = Math.ceil(textLen / 22);
                  const hPx = Math.max(48, 28 + lines * 20);
                  bW = wPx * bubbleScaleW;
                  bH = hPx * bubbleScaleH;
                } else {
                  // pos.width/height are % of preview container → scale to PDF
                  bW = (pos.width  / 100) * PREVIEW_W * bubbleScaleW;
                  bH = (pos.height / 100) * PREVIEW_H * bubbleScaleH;
                }
                bW = Math.max(bW, 60);
                bH = Math.max(bH, 25);
                console.log(`  → Bubble ${bubble.nummer}-${bubble.bubbleIndex}: pos=${pos.left.toFixed(1)}%,${pos.top.toFixed(1)}% size=${pos.width.toFixed(1)}%×${pos.height.toFixed(1)}% → ${bW.toFixed(0)}×${bH.toFixed(0)}pt`);
              }
            }
          }

          const fontSize = 9;
          const pad = 5;
          bX = Math.min(Math.max(bX, aX + 2), aX + aW - bW - 2);
          bY = Math.min(Math.max(bY, aY + 2), aY + aH - bH - 14);

          const isCaption = bubble.bubble_type === 'caption';
          const bgColor   = isCaption ? '#1E0F32' : '#FFFEF8';
          const textColor = isCaption ? '#FFFFFF'  : '#1A1410';

          doc.save();
          doc.roundedRect(bX, bY, bW, bH, 5).lineWidth(1.5).fillAndStroke(bgColor, '#1A1410');
          if (!isCaption) {
            const tX = bX + 18;
            const tY = bY + bH;
            doc.moveTo(tX, tY).lineTo(tX - 7, tY + 10).lineTo(tX + 10, tY).closePath().fillAndStroke(bgColor, '#1A1410');
          }
          if (speakerText) {
            doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
               .text(speakerText, bX + pad, bY + pad, { width: bW - pad * 2, lineGap: 0 });
            const sH = doc.heightOfString(speakerText, { width: bW - pad * 2 });
            doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
               .text(bubble.dialog, bX + pad, bY + pad + sH + 1, { width: bW - pad * 2, lineGap: 1 });
          } else {
            doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
               .text(speakerText + bubble.dialog, bX + pad, bY + pad, { width: bW - pad * 2, lineGap: 1 });
          }
          doc.restore();
        });

        console.log(`✓ Poster PDF done`);
      } catch (e) {
        console.error('Poster PDF error:', e.message);
      }
    }

    // Kein Back-Cover beim Poster
    const end = new Promise(resolve => doc.on('end', resolve));
    doc.end();
    await end;
    return Buffer.concat(buffers);
  }

  // ── 1. COVER ──────────────────────────────────────────────────────────────
  if (project.coverImageUrl) {
    doc.addPage();
    try {
      const buf = await fetchImageBuffer(project.coverImageUrl);
      const img = await sharp(buf)
        .resize(A4_W * 2, A4_H * 2, { fit: 'cover', position: 'center' })
        .png().toBuffer();
      doc.image(img, 0, 0, { width: A4_W, height: A4_H });

      // Dynamische Schriftgröße: passt sich Titellänge an
      const title = project.title.toUpperCase();
      const maxW = A4_W - 80;
      let fontSize = 32;
      doc.font('Helvetica-Bold');
      while (fontSize > 14 && doc.widthOfString(title, { fontSize }) > maxW) {
        fontSize -= 2;
      }

      // Titelblock-Höhe berechnen
      const titleH = doc.heightOfString(title, { width: maxW, fontSize, lineGap: 3 });
      
      // Gesamthöhe des Overlay-Blocks: Linie + Abstand + Text + Abstand + Linie
      const lineGap = 24;  // Mindestabstand zwischen Linie und Text (vorher 12 — zu eng)
      const blockH = lineGap + titleH + lineGap;
      
      // Block im unteren Bereich, etwas höher für mehr Luft
      const blockY = A4_H - 160 - blockH / 2;
      const line1Y = blockY;
      const textY  = blockY + lineGap;
      const line2Y = blockY + lineGap + titleH + lineGap;

      // Goldene Linie oben
      doc.moveTo(A4_W / 2 - 60, line1Y)
         .lineTo(A4_W / 2 + 60, line1Y)
         .lineWidth(3).strokeColor('#C9963A').stroke();

      // Titel
      doc.fillOpacity(1)
         .fontSize(fontSize)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text(title, 40, textY, { width: maxW, align: 'center', lineGap: 3 });

      // Goldene Linie unten
      doc.moveTo(A4_W / 2 - 60, line2Y)
         .lineTo(A4_W / 2 + 60, line2Y)
         .lineWidth(3).strokeColor('#C9963A').stroke();

      // ── Poster-Widmung (optional) ──────────────────────────────────────────
      // Wird als elegantes Overlay oben oder unten auf dem Poster gerendert
      if (project.posterDedication) {
        const dedText = project.posterDedication;
        const dedFrom = project.posterDedicationFrom || "";
        const dedPos  = project.posterDedicationPosition || "bottom";
        const dedMaxW = A4_W - 80;
        const dedFontSize = 13;
        const dedH = doc.fontSize(dedFontSize).heightOfString(dedText, { width: dedMaxW, lineGap: 4 });
        const fromH = dedFrom ? doc.fontSize(11).heightOfString(`— ${dedFrom}`, { width: dedMaxW }) + 6 : 0;
        const totalDedH = 12 + dedH + fromH + 12; // padding + text + from + padding

        // Semi-transparent gradient overlay
        const gradY = dedPos === "top" ? 0 : A4_H - totalDedH - 20;
        doc.save();
        doc.rect(0, gradY, A4_W, totalDedH + 20).fillOpacity(0.6).fill('#000000');
        doc.restore();

        // Golden line
        const lineY = dedPos === "top" ? gradY + 10 : gradY + 10;
        doc.moveTo(A4_W / 2 - 40, lineY)
           .lineTo(A4_W / 2 + 40, lineY)
           .lineWidth(2).strokeColor('#C9963A').stroke();

        // Dedication text (italic)
        const textStartY = lineY + 8;
        doc.fillOpacity(1)
           .fontSize(dedFontSize)
           .font('Helvetica-Oblique')
           .fillColor('#FFFFFF')
           .text(dedText, 40, textStartY, { width: dedMaxW, align: 'center', lineGap: 4 });

        // "Von:" line
        if (dedFrom) {
          const fromY = textStartY + dedH + 4;
          doc.fontSize(11).font('Helvetica').fillColor('#C9963A')
             .text(`— ${dedFrom}`, 40, fromY, { width: dedMaxW, align: 'center' });
        }

        // Golden line bottom
        const line2DedY = gradY + totalDedH + 8;
        doc.moveTo(A4_W / 2 - 40, line2DedY)
           .lineTo(A4_W / 2 + 40, line2DedY)
           .lineWidth(2).strokeColor('#C9963A').stroke();
      }

    } catch (e) {
      console.error('Cover error:', e.message);
      doc.rect(0, 0, A4_W, A4_H).fill('#FFFFFF');
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#1A1410')
         .text(project.title.toUpperCase(), 50, A4_H / 2, { width: A4_W - 100, align: 'center' });
    }
  }

  // ── 2. COMIC-SEITEN ────────────────────────────────────────────────────────
  const pages = project.chapters.filter(c => c.id !== 'ending');
  console.log(`\n📄 PDF Export: ${pages.length} pages`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`\n  Page ${i + 1}: "${page.title}"`);
    doc.addPage();

    try {
      doc.rect(0, 0, A4_W, A4_H).fill('#FFFFFF');

      // Titel oben
      const titleH = 55;
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1A1410')
         .text(page.title.toUpperCase(), 40, 18, {
           width: A4_W - 80, align: 'center', characterSpacing: 1.0
         });

      // Seitenzahl — AUSSERHALB des Bildes, ganz unten
      const footerH = 22;
      doc.fontSize(9).font('Helvetica').fillColor('#999999')
         .text(`${i + 1}`, A4_W - 35, A4_H - 16, { width: 25, align: 'right' });

      if (!page.imageUrl) continue;

      // Bild-Bereich
      const imgX = 0;
      const imgY = titleH;
      const imgW = A4_W;
      const imgH = A4_H - titleH - footerH;

      // Schwarzer Rahmen oben
      doc.rect(imgX, imgY, imgW, 3).fill('#000000');

      // fit:contain — ganzes Bild sichtbar, keine Panels abgeschnitten
      const pageBuf = await fetchImageBuffer(page.imageUrl);
      const pageImg = await sharp(pageBuf)
        .resize(imgW * 2, imgH * 2, {
          fit: 'contain', position: 'center',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png().toBuffer();
      doc.image(pageImg, imgX, imgY, { width: imgW, height: imgH });

      // Tatsächliche Bildgröße nach Letterboxing berechnen
      // Quellbild: 1024×1536 → ratio 0.667
      const srcRatio = 1024 / 1536;
      const ctnRatio = imgW / imgH;
      let aW, aH, aX, aY;
      if (srcRatio < ctnRatio) {
        aH = imgH; aW = imgH * srcRatio;
        aX = imgX + (imgW - aW) / 2; aY = imgY;
      } else {
        aW = imgW; aH = imgW / srcRatio;
        aX = imgX; aY = imgY + (imgH - aH) / 2;
      }
      console.log(`    → Image area: ${aW.toFixed(0)}×${aH.toFixed(0)} at (${aX.toFixed(0)},${aY.toFixed(0)})`);

      // ── Sprechblasen ────────────────────────────────────────────────────
      const hiddenBubbles = new Set(page.hiddenBubbles || []);

      // Alle Bubbles sammeln
      const allBubbles = [];
      (page.panels || []).forEach((panel, panelIdx) => {
        if (panel.dialogs && panel.dialogs.length > 0) {
          panel.dialogs.forEach((d, bIdx) => {
            const bid = `${panelIdx}-${bIdx}`;
            if (hiddenBubbles.has(bid)) return;
            if (!d.text || !d.text.trim() || d.text.toLowerCase() === 'null') return;
            allBubbles.push({
              nummer: panel.nummer, bubbleIndex: bIdx,
              dialog: d.text, speaker: d.speaker,
              bubble_type: panel.bubble_type
            });
          });
        } else if (panel.dialog && panel.dialog.trim() && panel.dialog.toLowerCase() !== 'null') {
          const bid = `${panelIdx}-0`;
          if (!hiddenBubbles.has(bid)) {
            allBubbles.push({
              nummer: panel.nummer, bubbleIndex: 0,
              dialog: panel.dialog, speaker: panel.speaker,
              bubble_type: panel.bubble_type
            });
          }
        }
      });

      // Extra bubbles (user-added)
      (page.extraBubbles || []).forEach(extra => {
        allBubbles.push({
          nummer: -1, bubbleIndex: 0,
          dialog: extra.dialog, speaker: extra.speaker || '',
          bubble_type: 'speech',
          isExtra: true, extraTop: extra.top, extraLeft: extra.left
        });
      });

      console.log(`    → Bubbles: ${allBubbles.length} (hidden: ${hiddenBubbles.size})`);
      console.log(`    → panelPositions available: ${(page.panelPositions || []).length}`);

      allBubbles.forEach((bubble, idx) => {
        const speakerText = (bubble.speaker && bubble.speaker !== 'narrator' && bubble.speaker.toLowerCase() !== 'null')
          ? bubble.speaker + ': ' : '';
        const fullText = speakerText + bubble.dialog;

        // Position bestimmen
        // Fallback: same grid as preview (alternating left/right columns, rows spread vertically)
        const fallbackRow = Math.floor(idx / 2);
        const fallbackCol = idx % 2;
        let bX = aX + (fallbackCol === 0 ? 0.05 : 0.55) * aW;
        let bY = aY + (0.05 + fallbackRow * 0.25) * aH;
        let bW = aW * 0.20;  // 20% of image width — matches preview default
        let bH = aH * 0.07;  // 7% of image height

        if (bubble.isExtra) {
          bX = aX + (bubble.extraLeft / 100) * aW;
          bY = aY + (bubble.extraTop  / 100) * aH;
        } else {
          const pos = (page.panelPositions || []).find(p =>
            p.nummer === bubble.nummer && p.bubbleIndex === bubble.bubbleIndex
          );
          if (pos) {
            bX = aX + (pos.left  / 100) * aW;
            bY = aY + (pos.top   / 100) * aH;
            if (pos.width && pos.height) {
              // Check if this is the old default value (20×10) — if so, calculate from text instead.
              // Old defaults were stored before proper text-based sizing was implemented.
              const isDefaultSize = pos.width === 20 && pos.height === 10;
              if (isDefaultSize) {
                // Calculate from text — same formula as preview
                const textLen = (bubble.speaker ? bubble.speaker + ': ' : '').length + (bubble.dialog || '').length;
                const wPx = Math.min(220, Math.max(100, 80 + textLen * 3.2));
                const lines = Math.ceil(textLen / 22);
                const hPx = Math.max(48, 28 + lines * 20);
                // Scale from 400×600 reference to PDF image area
                bW = (wPx / 400) * aW;
                bH = (hPx / 600) * aH;
              } else {
                // Use saved size — stored as % of container width/height
                bW = (pos.width  / 100) * aW;
                bH = (pos.height / 100) * aH;
              }
              bW = Math.max(bW, 60);
              bH = Math.max(bH, 25);
              console.log(`    → Bubble ${bubble.nummer}-${bubble.bubbleIndex}: pos=${pos.left.toFixed(1)}%,${pos.top.toFixed(1)}% size=${pos.width.toFixed(1)}%×${pos.height.toFixed(1)}% → ${bW.toFixed(0)}×${bH.toFixed(0)}px${isDefaultSize ? ' (text-calc)' : ''}`);
            }
          }
        }

        // Schriftgröße + Padding — fest wie in der Vorschau (12px Bangers)
        // CSS 12px ≈ 9pt in PDF (1pt = 1.333px). Bangers ist eine Display-Schrift,
        // bei 9pt sieht sie ähnlich aus wie 12px im Browser.
        const fontSize = 9;
        const pad = 5;

        // Bounds — Bubble bleibt im Bild (inkl. Tail 12px)
        bX = Math.min(Math.max(bX, aX + 2), aX + aW - bW - 2);
        bY = Math.min(Math.max(bY, aY + 2), aY + aH - bH - 14);

        const isCaption = bubble.bubble_type === 'caption';
        const bgColor   = isCaption ? '#1E0F32' : '#FFFEF8';
        const textColor = isCaption ? '#FFFFFF'  : '#1A1410';

        doc.save();

        // Bubble-Hintergrund
        doc.roundedRect(bX, bY, bW, bH, 5)
           .lineWidth(1.5)
           .fillAndStroke(bgColor, '#1A1410');

        // Tail
        if (!isCaption) {
          const tX = bX + 18;
          const tY = bY + bH;
          doc.moveTo(tX, tY)
             .lineTo(tX - 7, tY + 10)
             .lineTo(tX + 10, tY)
             .closePath()
             .fillAndStroke(bgColor, '#1A1410');
        }

        // Text
        if (speakerText) {
          doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
             .text(speakerText, bX + pad, bY + pad, {
               width: bW - pad * 2, lineGap: 0
             });
          const sH = doc.heightOfString(speakerText, { width: bW - pad * 2 });
          doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
             .text(bubble.dialog, bX + pad, bY + pad + sH + 1, {
               width: bW - pad * 2, lineGap: 1
             });
        } else {
          doc.fontSize(fontSize).font(BUBBLE_FONT).fillColor(textColor)
             .text(fullText, bX + pad, bY + pad, {
               width: bW - pad * 2, lineGap: 1
             });
        }

        doc.restore();
      });

      console.log(`    ✓ Rendered ${allBubbles.length} bubbles`);

    } catch (e) {
      console.error(`Page ${i + 1} error:`, e.message);
    }
  }

  // ── 3. ENDING ─────────────────────────────────────────────────────────────
  if (project.endingData?.endingText) {
    doc.addPage();
    doc.rect(0, 0, A4_W, A4_H).fill('#FDF8F2');

    doc.moveTo(A4_W / 2 - 50, 120).lineTo(A4_W / 2 + 50, 120)
       .lineWidth(2.5).strokeColor('#C9963A').stroke();

    doc.fontSize(11).font('Helvetica').fillColor('#C9963A')
       .text('WIDMUNG', 50, 140, { width: A4_W - 100, align: 'center', characterSpacing: 3 });

    // Widmungstext: Schriftgröße dynamisch reduzieren wenn Text zu lang
    // Maximal verfügbarer Platz: von Y=220 bis Y=A4_H-200 (Platz für Von: + THE END)
    const maxTextH = A4_H - 200 - 220;
    let textFontSize = 17;
    let endingText = project.endingData.endingText;
    // Kürze Text wenn nötig (max 400 Zeichen)
    if (endingText.length > 400) endingText = endingText.substring(0, 397) + '…';
    // Reduziere Schriftgröße bis Text passt
    while (textFontSize > 11) {
      const h = doc.fontSize(textFontSize).heightOfString(endingText, { width: A4_W - 160, lineGap: 8 });
      if (h <= maxTextH) break;
      textFontSize -= 1;
    }

    doc.fontSize(textFontSize).font('Helvetica-Oblique').fillColor('#1A1410')
       .text(endingText, 80, 220, {
         width: A4_W - 160, align: 'center', lineGap: 8
       });

    const textH = doc.fontSize(textFontSize).heightOfString(endingText, { width: A4_W - 160, lineGap: 8 });
    const midY = 220 + textH + 40;

    doc.moveTo(A4_W / 2 - 40, midY).lineTo(A4_W / 2 + 40, midY)
       .lineWidth(2).strokeColor('#C9963A').stroke();

    // "dedication" Feld (z.B. "Maria") wird NICHT mehr angezeigt — Text ist aussagekräftig genug
    // Nur noch "Von: ..." anzeigen
    if (project.endingData.dedicationFrom) {
      doc.fontSize(12).font('Helvetica').fillColor('#8B7355')
         .text(`Von: ${project.endingData.dedicationFrom}`, 80, midY + 30, {
           width: A4_W - 160, align: 'center'
         });
    }

    // THE END immer am unteren Rand — fest positioniert
    doc.fontSize(11).font('Helvetica').fillColor('#C9963A')
       .text('THE END', 50, A4_H - 120, { width: A4_W - 100, align: 'center', characterSpacing: 3 });
    doc.moveTo(A4_W / 2 - 50, A4_H - 100).lineTo(A4_W / 2 + 50, A4_H - 100)
       .lineWidth(2.5).strokeColor('#C9963A').stroke();
  }

  // ── 4. BACK COVER ─────────────────────────────────────────────────────────
  doc.addPage();
  doc.rect(0, 0, A4_W, A4_H).fill('#FDF8F2');

  const brandingY = A4_H / 2 - 100;
  const possibleLogoPaths = [
    path.join(process.cwd(), 'public', 'Logo 1.png'),
    path.join(__dirname, '..', '..', 'public', 'Logo 1.png'),
    '/app/public/Logo 1.png',
  ];
  let logoLoaded = false;
  for (const lp of possibleLogoPaths) {
    try {
      if (fs.existsSync(lp)) {
        const logoBuf = fs.readFileSync(lp);
        const logoW = 360, logoH = 120;
        doc.image(logoBuf, (A4_W - logoW) / 2, brandingY, {
          width: logoW, height: logoH, fit: [logoW, logoH], align: 'center'
        });
        console.log(`✓ Logo loaded from: ${lp}`);
        logoLoaded = true;
        break;
      }
    } catch (e) { continue; }
  }
  if (!logoLoaded) {
    doc.fontSize(42).font('Helvetica-Bold').fillColor('#C9963A')
       .text('ComicStyle.de', 50, brandingY, { width: A4_W - 100, align: 'center' });
  }

  doc.fontSize(16).font('Helvetica').fillColor('#8B7355')
     .text('Deine Geschichte als personalisiertes Comic-Buch', 50, brandingY + 140, {
       width: A4_W - 100, align: 'center'
     });

  const barcodeY = A4_H - 120;
  const barcodeW = 140, barcodeH = 50;
  const barcodeX = (A4_W - barcodeW) / 2;
  doc.rect(barcodeX, barcodeY, barcodeW, barcodeH).lineWidth(1).strokeColor('#1A1410').stroke();
  for (let j = 0; j < 15; j++) {
    const x = barcodeX + 5 + j * 8.5;
    const w = j % 2 === 0 ? 4 : 3;
    doc.rect(x, barcodeY + 5, w, barcodeH - 10).fill('#1A1410');
  }
  doc.fontSize(9).font('Helvetica').fillColor('#1A1410')
     .text('ISBN 978-3-XXXXX-XXX-X', barcodeX, barcodeY + barcodeH + 6, {
       width: barcodeW, align: 'center'
     });

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
}

module.exports = { createComicPDF };
