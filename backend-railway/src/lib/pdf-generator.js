const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Comic font path — Bangers (Google Fonts, OFL License)
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

/**
 * Erstellt PDF mit Cover + Seiten + Ending im A4-Format
 * @param {Object} project - Projekt-Daten
 * @returns {Buffer} PDF als Buffer
 */
async function createComicPDF(project) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
    info: {
      Title: project.title,
      Author: 'MyComicStory',
      Subject: 'Personalisiertes Comic-Buch',
      Creator: 'MyComicStory.com'
    }
  });
  
  // Register comic font if available
  if (COMIC_FONT_PATH) {
    doc.registerFont('Bangers', COMIC_FONT_PATH);
    console.log(`✓ Comic font loaded: ${COMIC_FONT_PATH}`);
  } else {
    console.warn('⚠ Comic font not found, falling back to Helvetica');
  }
  
  const BUBBLE_FONT = COMIC_FONT_PATH ? 'Bangers' : 'Helvetica';
  const BUBBLE_FONT_BOLD = COMIC_FONT_PATH ? 'Bangers' : 'Helvetica-Bold';
  
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // A4 Dimensionen in Points (72 DPI)
  const A4_WIDTH = 595;   // 21 cm
  const A4_HEIGHT = 842;  // 29.7 cm
  
  // ── 1. COVER ────────────────────────────────────────────────────────────
  if (project.coverImageUrl) {
    doc.addPage();
    
    try {
      const coverBuffer = await fetchImageBuffer(project.coverImageUrl);
      
      // Cover VOLLBILD - kein Rand, füllt komplette Seite (wie Kinderbuch)
      const coverProcessed = await sharp(coverBuffer)
        .resize(Math.round(A4_WIDTH * 2), Math.round(A4_HEIGHT * 2), { 
          fit: 'cover',  // Cover - füllt komplette Seite
          position: 'center'
        })
        .png()
        .toBuffer();
      
      // Bild füllt komplette Seite - kein Rand
      doc.image(coverProcessed, 0, 0, { 
        width: A4_WIDTH, 
        height: A4_HEIGHT 
      });
      
      // Titel als Overlay unten auf dem Bild - NUR goldene Linien, KEIN schwarzer Balken
      const overlayY = A4_HEIGHT - 150;
      
      // Goldene Linie oben
      doc.moveTo(A4_WIDTH / 2 - 60, overlayY + 10)
         .lineTo(A4_WIDTH / 2 + 60, overlayY + 10)
         .lineWidth(3)
         .strokeColor('#C9963A')
         .stroke();
      
      // Titel in Weiß mit Schatten
      doc.fillOpacity(1)
         .fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text(project.title.toUpperCase(), 40, overlayY + 30, {
           width: A4_WIDTH - 80,
           align: 'center',
           characterSpacing: 1.5,
           lineGap: 5
         });
      
      // Goldene Linie unten
      doc.moveTo(A4_WIDTH / 2 - 60, overlayY + 90)
         .lineTo(A4_WIDTH / 2 + 60, overlayY + 90)
         .lineWidth(3)
         .strokeColor('#C9963A')
         .stroke();
      
    } catch (e) {
      console.error('Cover processing error:', e.message);
      // Fallback: Nur Titel
      doc.rect(0, 0, A4_WIDTH, A4_HEIGHT).fill('#FFFFFF');
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('#1A1410')
         .text(project.title.toUpperCase(), 50, A4_HEIGHT / 2, {
           width: A4_WIDTH - 100,
           align: 'center'
         });
    }
  }
  
  // ── 2. COMIC-SEITEN ─────────────────────────────────────────────────────
  const pages = project.chapters.filter(c => c.id !== 'ending');
  
  console.log(`\n📄 PDF Export: ${pages.length} pages to render`);
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`\n  Page ${i + 1}: "${page.title}"`);
    console.log(`    - panels: ${page.panels?.length || 0}`);
    console.log(`    - panelPositions: ${page.panelPositions?.length || 0}`);
    if (page.panels && page.panels.length > 0) {
      const dialogCount = page.panels.filter(p => p.dialog && p.dialog.trim() && p.dialog.toLowerCase() !== 'null').length;
      console.log(`    - panels with dialog: ${dialogCount}`);
    }
    
    doc.addPage();
    
    try {
      // Hintergrund
      doc.rect(0, 0, A4_WIDTH, A4_HEIGHT)
         .fill('#FFFFFF');
      
      // Titel oben mit Hintergrund - schönere Schrift
      const titleHeight = 60;
      doc.rect(0, 0, A4_WIDTH, titleHeight)
         .fill('#FFFFFF');
      
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#1A1410')
         .text(page.title.toUpperCase(), 40, 20, {
           width: A4_WIDTH - 80,
           align: 'center',
           characterSpacing: 1.2
         });
      
      // Comic-Bild - VOLLE BREITE, volle Fläche zwischen Titel und Footer
      if (page.imageUrl) {
        const pageBuffer = await fetchImageBuffer(page.imageUrl);
        
        const footerHeight = 20;
        const imgWidth = A4_WIDTH;
        const imgX = 0;
        const imgY = titleHeight;
        const imgHeight = A4_HEIGHT - titleHeight - footerHeight;
        
        // Schwarzer Rahmen oben (Panel-Border)
        doc.rect(imgX, imgY, imgWidth, 4).fill('#000000');
        
        // fit: contain → zeigt das GANZE Bild, kein Abschneiden
        // Weiße Streifen links/rechts sind schmal da Bild fast A4-Breite hat
        const pageProcessed = await sharp(pageBuffer)
          .resize(Math.round(imgWidth * 2), Math.round(imgHeight * 2), {
            fit: 'contain',
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();
        
        doc.image(pageProcessed, imgX, imgY, { width: imgWidth, height: imgHeight });
        
        // ── Berechne tatsächliche Bildposition nach fit:contain Letterboxing ──
        // Quellbild: 1024×1536 (Verhältnis 2:3 = 0.667)
        // Container: imgWidth × imgHeight
        const srcRatio = 1024 / 1536;
        const containerRatio = imgWidth / imgHeight;
        let actualImgWidth, actualImgHeight, actualImgX, actualImgY;
        if (srcRatio < containerRatio) {
          // Bild schmaler als Container → Letterbox links/rechts
          actualImgHeight = imgHeight;
          actualImgWidth  = imgHeight * srcRatio;
          actualImgX = imgX + (imgWidth - actualImgWidth) / 2;
          actualImgY = imgY;
        } else {
          // Bild breiter als Container → Letterbox oben/unten
          actualImgWidth  = imgWidth;
          actualImgHeight = imgWidth / srcRatio;
          actualImgX = imgX;
          actualImgY = imgY + (imgHeight - actualImgHeight) / 2;
        }
        console.log(`    → Actual image: ${actualImgWidth.toFixed(0)}×${actualImgHeight.toFixed(0)}px at (${actualImgX.toFixed(0)}, ${actualImgY.toFixed(0)})`);
        
        // ── Sprechblasen rendern ──────────────────────────────────────
        if (page.panels && page.panels.length > 0) {
          console.log(`    → Rendering bubbles for page ${i + 1}`);
          const hiddenBubbles = new Set(page.hiddenBubbles || []);
          console.log(`    → Hidden bubbles: ${hiddenBubbles.size}`);
          
          // Flatten multi-bubble panels (dialogs array) into individual bubbles
          const allBubbles = [];
          page.panels.forEach((panel, panelIdx) => {
            // Check for multi-bubble format (dialogs array)
            if (panel.dialogs && Array.isArray(panel.dialogs) && panel.dialogs.length > 0) {
              panel.dialogs.forEach((dialogItem, bubbleIdx) => {
                const bubbleId = `${panelIdx}-${bubbleIdx}`;
                // Skip hidden bubbles
                if (hiddenBubbles.has(bubbleId)) {
                  console.log(`    → Skipping hidden bubble ${bubbleId}`);
                  return;
                }
                
                if (dialogItem.text && dialogItem.text.trim() && dialogItem.text.toLowerCase() !== 'null') {
                  allBubbles.push({
                    nummer: panel.nummer,
                    dialog: dialogItem.text,
                    speaker: dialogItem.speaker,
                    bubble_type: panel.bubble_type,
                    bubbleIndex: bubbleIdx,
                    isMultiBubble: true
                  });
                }
              });
            }
            // Legacy single bubble format
            else if (panel.dialog && panel.dialog.trim() && panel.dialog.toLowerCase() !== 'null') {
              const bubbleId = `${panelIdx}-0`;
              // Skip hidden bubbles
              if (hiddenBubbles.has(bubbleId)) {
                console.log(`    → Skipping hidden bubble ${bubbleId}`);
                return;
              }
              
              allBubbles.push({
                nummer: panel.nummer,
                dialog: panel.dialog,
                speaker: panel.speaker,
                bubble_type: panel.bubble_type,
                bubbleIndex: 0,
                isMultiBubble: false
              });
            }
          });
          
          // ── Extra bubbles (user-added) ──────────────────────────────
          if (page.extraBubbles && page.extraBubbles.length > 0) {
            console.log(`    → Extra bubbles: ${page.extraBubbles.length}`);
            page.extraBubbles.forEach(extra => {
              allBubbles.push({
                nummer: -1, // Mark as extra
                dialog: extra.dialog,
                speaker: extra.speaker || '',
                bubble_type: 'speech',
                bubbleIndex: 0,
                isMultiBubble: false,
                isExtra: true,
                extraTop: extra.top,   // % coordinates
                extraLeft: extra.left, // % coordinates
              });
            });
          }
          
          console.log(`    → Found ${allBubbles.length} bubbles to render (after filtering hidden)`);
          
          allBubbles.forEach((bubble, idx) => {
            // Text vorbereiten (ZUERST!)
            const speaker = bubble.speaker && bubble.speaker !== 'narrator' && bubble.speaker.toLowerCase() !== 'null' 
              ? bubble.speaker + ': ' 
              : '';
            const text = speaker + bubble.dialog;
            
            // Position aus panelPositions oder Fallback
            // Use ACTUAL image dimensions for correct coordinate mapping
            let bubbleX = actualImgX + 30;
            let bubbleY = actualImgY + 30 + (idx * 100);
            let bubbleWidth = 90; // Default
            let bubbleHeight = 40; // Default
            
            if (bubble.isExtra) {
              // Extra bubbles use their own % coordinates
              bubbleX = actualImgX + (bubble.extraLeft / 100) * actualImgWidth;
              bubbleY = actualImgY + (bubble.extraTop / 100) * actualImgHeight;
            } else if (page.panelPositions && page.panelPositions.length > 0) {
              // Find position for this panel number AND bubbleIndex (for multi-bubble support)
              const pos = page.panelPositions.find(p => 
                p.nummer === bubble.nummer && 
                (p.bubbleIndex === undefined || p.bubbleIndex === bubble.bubbleIndex)
              );
              
              if (pos) {
                // Konvertiere Prozent zu Pixel-Koordinaten basierend auf TATSÄCHLICHER Bildgröße
                bubbleX = actualImgX + (pos.left / 100) * actualImgWidth;
                bubbleY = actualImgY + (pos.top / 100) * actualImgHeight;
                
                // USE SAVED SIZE from panelPositions, scale to actual image size
                if (pos.width && pos.height) {
                  bubbleWidth = (pos.width / 100) * actualImgWidth;
                  bubbleHeight = (pos.height / 100) * actualImgHeight;
                  console.log(`    → Bubble ${bubble.nummer}-${bubble.bubbleIndex}: Using saved size ${pos.width}%×${pos.height}% = ${bubbleWidth.toFixed(0)}×${bubbleHeight.toFixed(0)}px`);
                }
              } else {
                // Fallback: Stack multi-bubble panels vertically
                if (bubble.isMultiBubble && bubble.bubbleIndex > 0) {
                  bubbleY += (bubble.bubbleIndex * (actualImgHeight * 0.15));
                }
              }
            }
            
            // If no saved size, calculate from text
            if (!bubble.isExtra && (!page.panelPositions || !page.panelPositions.find(p => p.nummer === bubble.nummer && p.bubbleIndex === bubble.bubbleIndex)?.width)) {
              const maxBubbleWidth = 90;
              doc.fontSize(8).font('Helvetica');
              const textHeight = doc.heightOfString(text, { width: maxBubbleWidth - 8 });
              bubbleWidth = Math.min(maxBubbleWidth, Math.max(60, text.length * 1.8));
              bubbleHeight = textHeight + 11;
            }
            
            // Font size + padding — proportional to bubble height
            const bubbleFontSize = Math.min(11, Math.max(7, bubbleHeight * 0.14));
            const padding = Math.max(4, bubbleHeight * 0.07);
            
            // Bounds: Bubble MUSS innerhalb des tatsächlichen Bildbereichs bleiben
            bubbleX = Math.min(Math.max(bubbleX, actualImgX + 2), actualImgX + actualImgWidth  - bubbleWidth  - 2);
            bubbleY = Math.min(Math.max(bubbleY, actualImgY + 2), actualImgY + actualImgHeight - bubbleHeight - 14);
            
            doc.save();
            doc.roundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 5)
               .lineWidth(1.5)
               .fillAndStroke(bgColor, '#1A1410');
            
            // Tail
            if (!isCaption) {
              const tailX = bubbleX + 18;
              const tailY = bubbleY + bubbleHeight;
              doc.moveTo(tailX, tailY)
                 .lineTo(tailX - 7, tailY + 10)
                 .lineTo(tailX + 10, tailY)
                 .closePath()
                 .fillAndStroke(bgColor, '#1A1410');
            }
            
            // Text: Bangers für alles (Speaker + Dialog)
            if (speaker) {
              doc.fontSize(bubbleFontSize)
                 .font(BUBBLE_FONT_BOLD)
                 .fillColor(textColor)
                 .text(speaker, bubbleX + padding, bubbleY + padding, {
                   width: bubbleWidth - (padding * 2),
                   lineGap: 0
                 });
              const speakerH = doc.heightOfString(speaker, { width: bubbleWidth - (padding * 2) });
              doc.fontSize(bubbleFontSize)
                 .font(BUBBLE_FONT)
                 .fillColor(textColor)
                 .text(bubble.dialog, bubbleX + padding, bubbleY + padding + speakerH + 1, {
                   width: bubbleWidth - (padding * 2),
                   align: 'left',
                   lineGap: 1
                 });
            } else {
              doc.fontSize(bubbleFontSize)
                 .font(BUBBLE_FONT)
                 .fillColor(textColor)
                 .text(text, bubbleX + padding, bubbleY + padding, {
                   width: bubbleWidth - (padding * 2),
                   align: 'left',
                   lineGap: 1
                 });
            }
            
            doc.restore();
          });
          
          console.log(`    ✓ Rendered ${allBubbles.length} bubbles`);
        } else {
          console.log(`    ⚠ No panels data for page ${i + 1}`);
        }
      }
      
      // Seitenzahl klein rechts unten (außerhalb des Bildes)
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#999999')
         .text(`${i + 1}`, A4_WIDTH - 30, A4_HEIGHT - 15, {
           width: 20,
           align: 'right'
         });
      
    } catch (e) {
      console.error(`Page ${i + 1} processing error:`, e.message);
      // Fallback: Nur Titel
      doc.fontSize(16)
         .font('Helvetica')
         .fillColor('#1A1410')
         .text(`Seite ${i + 1}: ${page.title}`, 50, A4_HEIGHT / 2, {
           width: A4_WIDTH - 100,
           align: 'center'
         });
    }
  }
  
  // ── 3. ENDING ───────────────────────────────────────────────────────────
  if (project.endingData?.endingText) {
    doc.addPage();
    
    // Hintergrund
    doc.rect(0, 0, A4_WIDTH, A4_HEIGHT)
       .fill('#FDF8F2');
    
    // Dekorative Linie oben
    doc.moveTo(A4_WIDTH / 2 - 50, 120)
       .lineTo(A4_WIDTH / 2 + 50, 120)
       .lineWidth(2.5)
       .strokeColor('#C9963A')
       .stroke();
    
    // "Widmung" Label
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('WIDMUNG', 50, 140, {
         width: A4_WIDTH - 100,
         align: 'center',
         characterSpacing: 3
       });
    
    // Widmungstext - schönere Schrift
    doc.fontSize(17)
       .font('Helvetica-Oblique')
       .fillColor('#1A1410')
       .text(project.endingData.endingText, 80, 220, {
         width: A4_WIDTH - 160,
         align: 'center',
         lineGap: 10
       });
    
    // Dekorative Linie mitte
    const middleY = 220 + doc.heightOfString(project.endingData.endingText, { width: A4_WIDTH - 160, lineGap: 10 }) + 40;
    doc.moveTo(A4_WIDTH / 2 - 40, middleY)
       .lineTo(A4_WIDTH / 2 + 40, middleY)
       .lineWidth(2)
       .strokeColor('#C9963A')
       .stroke();
    
    // Zitat (falls vorhanden)
    if (project.endingData.dedication) {
      doc.fontSize(13)
         .font('Helvetica-Oblique')
         .fillColor('#8B7355')
         .text(`"${project.endingData.dedication}"`, 80, middleY + 30, {
           width: A4_WIDTH - 160,
           align: 'center'
         });
    }
    
    // Von (falls vorhanden)
    if (project.endingData.dedicationFrom) {
      const fromY = middleY + (project.endingData.dedication ? 80 : 30);
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#8B7355')
         .text(`Von: ${project.endingData.dedicationFrom}`, 80, fromY, {
           width: A4_WIDTH - 160,
           align: 'center'
         });
    }
    
    // "The End"
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('THE END', 50, A4_HEIGHT - 120, {
         width: A4_WIDTH - 100,
         align: 'center',
         characterSpacing: 3
       });
    
    // Dekorative Linie unten
    doc.moveTo(A4_WIDTH / 2 - 50, A4_HEIGHT - 100)
       .lineTo(A4_WIDTH / 2 + 50, A4_HEIGHT - 100)
       .lineWidth(2.5)
       .strokeColor('#C9963A')
       .stroke();
  }
  
  // ── 4. BACK COVER ───────────────────────────────────────────────────────
  doc.addPage();
  
  // Hintergrund - elegantes Beige wie Ending
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT)
     .fill('#FDF8F2');
  
  // ComicStyle.de Branding ZENTRIERT - VIEL GRÖSSERES LOGO
  const brandingY = A4_HEIGHT / 2 - 100; // Zentriert - MUST be defined BEFORE try block
  
  // Logo laden und einfügen - VIEL GRÖSSER
  try {
    // Try multiple possible logo paths for Railway deployment
    let logoBuffer;
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'Logo 1.png'),
      path.join(__dirname, '..', '..', 'public', 'Logo 1.png'),
      path.join('/app', 'public', 'Logo 1.png'),
      '/app/public/Logo 1.png'
    ];
    
    let logoLoaded = false;
    for (const logoPath of possiblePaths) {
      try {
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          logoLoaded = true;
          console.log(`✓ Logo loaded from: ${logoPath}`);
          break;
        }
      } catch (e) {
        // Try next path
        continue;
      }
    }
    
    if (!logoLoaded) {
      throw new Error('Logo file not found in any expected location');
    }
    
    // Logo zentriert - VIEL GRÖSSER
    const logoHeight = 120;
    const logoWidth = 360;
    const logoX = (A4_WIDTH - logoWidth) / 2;
    
    // Ensure brandingY is a valid number
    if (isNaN(brandingY)) {
      throw new Error('brandingY is NaN');
    }
    
    doc.image(logoBuffer, logoX, brandingY, {
      width: logoWidth,
      height: logoHeight,
      fit: [logoWidth, logoHeight],
      align: 'center'
    });
  } catch (e) {
    console.error('Logo loading error:', e.message);
    // Fallback: Text-basiertes Branding - GRÖSSER
    doc.fontSize(42)
       .font('Helvetica-Bold')
       .fillColor('#C9963A')
       .text('ComicStyle.de', 50, brandingY, {
         width: A4_WIDTH - 100,
         align: 'center',
         characterSpacing: 1.5
       });
  }
  
  doc.fontSize(16)
     .font('Helvetica')
     .fillColor('#8B7355')
     .text('Deine Geschichte als personalisiertes Comic-Buch', 50, brandingY + 140, {
       width: A4_WIDTH - 100,
       align: 'center'
     });
  
  // Barcode-Platzhalter (für professionellen Look) - GRÖSSER, weiter unten
  const barcodeY = A4_HEIGHT - 120;
  const barcodeWidth = 140;
  const barcodeHeight = 50;
  const barcodeX = (A4_WIDTH - barcodeWidth) / 2;
  
  // Einfacher Barcode-Look (Streifen)
  doc.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight)
     .lineWidth(1)
     .strokeColor('#1A1410')
     .stroke();
  
  // Barcode-Streifen (dekorativ)
  for (let i = 0; i < 15; i++) {
    const x = barcodeX + 5 + (i * 8.5);
    const width = Math.random() > 0.5 ? 4 : 3;
    doc.rect(x, barcodeY + 5, width, barcodeHeight - 10)
       .fill('#1A1410');
  }
  
  // ISBN-ähnliche Nummer (dekorativ)
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#1A1410')
     .text('ISBN 978-3-XXXXX-XXX-X', barcodeX, barcodeY + barcodeHeight + 6, {
       width: barcodeWidth,
       align: 'center'
     });
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { createComicPDF };
