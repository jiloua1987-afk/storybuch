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
      const lineGap = 12;  // Abstand zwischen Linie und Text
      const blockH = lineGap + titleH + lineGap;
      
      // Block vertikal zentriert im unteren Bereich
      const blockY = A4_H - 140 - blockH / 2;
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
              // pos.width/height are % of the source image (1024×1536 native resolution).
              // Both preview and PDF use the same image aspect ratio, so % maps directly.
              bW = (pos.width  / 100) * aW;
              bH = (pos.height / 100) * aH;
              // Sanity check: bubble must be at least readable
              bW = Math.max(bW, 60);
              bH = Math.max(bH, 25);
              console.log(`    → Bubble ${bubble.nummer}-${bubble.bubbleIndex}: pos=${pos.left.toFixed(1)}%,${pos.top.toFixed(1)}% size=${pos.width.toFixed(1)}%×${pos.height.toFixed(1)}% → ${bW.toFixed(0)}×${bH.toFixed(0)}px`);
            }
          }
        }

        // Schriftgröße + Padding proportional zur Bubble-Höhe
        const fontSize = Math.min(11, Math.max(7, bH * 0.14));
        const pad = Math.max(4, bH * 0.07);

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

    doc.fontSize(17).font('Helvetica-Oblique').fillColor('#1A1410')
       .text(project.endingData.endingText, 80, 220, {
         width: A4_W - 160, align: 'center', lineGap: 10
       });

    const midY = 220 + doc.heightOfString(project.endingData.endingText, { width: A4_W - 160, lineGap: 10 }) + 40;
    doc.moveTo(A4_W / 2 - 40, midY).lineTo(A4_W / 2 + 40, midY)
       .lineWidth(2).strokeColor('#C9963A').stroke();

    if (project.endingData.dedication) {
      doc.fontSize(13).font('Helvetica-Oblique').fillColor('#8B7355')
         .text(`"${project.endingData.dedication}"`, 80, midY + 30, {
           width: A4_W - 160, align: 'center'
         });
    }
    if (project.endingData.dedicationFrom) {
      const fromY = midY + (project.endingData.dedication ? 80 : 30);
      doc.fontSize(12).font('Helvetica').fillColor('#8B7355')
         .text(`Von: ${project.endingData.dedicationFrom}`, 80, fromY, {
           width: A4_W - 160, align: 'center'
         });
    }

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
