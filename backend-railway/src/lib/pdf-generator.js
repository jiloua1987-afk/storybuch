const PDFDocument = require('pdfkit');
const sharp = require('sharp');

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
      
      // Cover im Portrait-Format (2:3 Ratio wie Original 1024×1536)
      // Maximale Höhe nutzen mit kleinem Rand
      const margin = 30;
      const coverHeight = A4_HEIGHT - (margin * 2);
      const coverWidth = coverHeight * (2/3); // 2:3 Ratio beibehalten
      const coverX = (A4_WIDTH - coverWidth) / 2;
      const coverY = margin;
      
      const coverProcessed = await sharp(coverBuffer)
        .resize(Math.round(coverWidth * 2), Math.round(coverHeight * 2), { 
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      
      doc.image(coverProcessed, coverX, coverY, { 
        width: coverWidth, 
        height: coverHeight 
      });
      
      // Titel als Overlay unten auf dem Bild mit schönerer Schrift
      const overlayY = coverY + coverHeight - 120;
      
      // Dunkler Hintergrund für bessere Lesbarkeit
      doc.rect(coverX, overlayY - 10, coverWidth, 110)
         .fillOpacity(0.88)
         .fill('#1A1410');
      
      doc.fillOpacity(1)
         .fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text(project.title.toUpperCase(), coverX + 20, overlayY + 15, {
           width: coverWidth - 40,
           align: 'center',
           characterSpacing: 1.5,
           lineGap: 5
         });
      
    } catch (e) {
      console.error('Cover processing error:', e.message);
      // Fallback: Nur Titel
      doc.rect(0, 0, A4_WIDTH, A4_HEIGHT).fill('#F5EDE0');
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
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    doc.addPage();
    
    try {
      // Hintergrund
      doc.rect(0, 0, A4_WIDTH, A4_HEIGHT)
         .fill('#F5EDE0');
      
      // Titel oben mit Hintergrund - schönere Schrift
      doc.rect(0, 0, A4_WIDTH, 70)
         .fill('#FFFFFF');
      
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#1A1410')
         .text(page.title.toUpperCase(), 40, 25, {
           width: A4_WIDTH - 80,
           align: 'center',
           characterSpacing: 1.2
         });
      
      // Comic-Bild - größer, füllt mehr Platz
      if (page.imageUrl) {
        const pageBuffer = await fetchImageBuffer(page.imageUrl);
        const pageProcessed = await sharp(pageBuffer)
          .resize(1024, 1536, { fit: 'cover' })
          .png()
          .toBuffer();
        
        // Bild füllt fast die ganze Seite (mit Platz für Titel oben und Seitenzahl unten)
        const imgWidth = A4_WIDTH;
        const imgHeight = A4_HEIGHT - 110; // 70px Titel + 40px Seitenzahl
        const imgX = 0;
        const imgY = 70;
        
        doc.image(pageProcessed, imgX, imgY, { 
          width: imgWidth, 
          height: imgHeight 
        });
        
        // ── Sprechblasen rendern ──────────────────────────────────────
        if (page.panels && page.panels.length > 0) {
          const panels = page.panels.filter(p => p.dialog && p.dialog.trim() && p.dialog.toLowerCase() !== 'null');
          
          panels.forEach((panel, idx) => {
            // Position aus panelPositions oder Fallback
            let bubbleX = imgX + 30;
            let bubbleY = imgY + 30 + (idx * 100);
            
            if (page.panelPositions && page.panelPositions.length > 0) {
              const pos = page.panelPositions.find(p => p.nummer === panel.nummer) || page.panelPositions[idx];
              if (pos) {
                // Konvertiere Prozent zu Pixel-Koordinaten
                bubbleX = imgX + (pos.left / 100) * imgWidth;
                bubbleY = imgY + (pos.top / 100) * imgHeight;
              }
            }
            
            // Text vorbereiten
            const speaker = panel.speaker && panel.speaker !== 'narrator' && panel.speaker.toLowerCase() !== 'null' 
              ? panel.speaker + ': ' 
              : '';
            const text = speaker + panel.dialog;
            
            // Bubble-Größe berechnen (wie in Vorschau)
            const maxBubbleWidth = 180;
            const padding = 10;
            
            // Text-Höhe messen
            doc.fontSize(12).font('Helvetica');
            const textHeight = doc.heightOfString(text, { width: maxBubbleWidth - (padding * 2) });
            const bubbleWidth = Math.min(maxBubbleWidth, Math.max(100, text.length * 3));
            const bubbleHeight = textHeight + (padding * 2) + 8;
            
            // Bubble-Hintergrund (weiß mit dünnem schwarzem Rand wie in Vorschau)
            const isCaption = panel.bubble_type === 'caption';
            const bgColor = isCaption ? '#1E0F32' : '#FFFEF8';
            const textColor = isCaption ? '#FFFFFF' : '#1A1410';
            
            doc.save();
            doc.roundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6)
               .lineWidth(1.5)  // Dünner Rahmen wie in Vorschau
               .fillAndStroke(bgColor, '#1A1410');
            
            // Text in Bubble - Speaker fett, Rest normal (wie in Vorschau)
            if (speaker) {
              // Speaker fett
              doc.fontSize(12)
                 .font('Helvetica-Bold')
                 .fillColor(textColor)
                 .text(speaker, bubbleX + padding, bubbleY + padding + 3, {
                   width: bubbleWidth - (padding * 2),
                   continued: true
                 })
                 // Dialog normal
                 .font('Helvetica')
                 .text(panel.dialog, {
                   width: bubbleWidth - (padding * 2),
                   align: 'left',
                   lineGap: 2
                 });
            } else {
              // Nur Dialog, normal
              doc.fontSize(12)
                 .font('Helvetica')
                 .fillColor(textColor)
                 .text(text, bubbleX + padding, bubbleY + padding + 3, {
                   width: bubbleWidth - (padding * 2),
                   align: 'left',
                   lineGap: 2
                 });
            }
            
            doc.restore();
          });
        }
      }
      
      // Seitenzahl unten mit weißem Hintergrund
      doc.rect(0, A4_HEIGHT - 40, A4_WIDTH, 40)
         .fill('#FFFFFF');
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#8B7355')
         .text(`Seite ${i + 1} von ${pages.length}`, 50, A4_HEIGHT - 25, {
           width: A4_WIDTH - 100,
           align: 'center'
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
    
    // "Widmung" Label (ohne '&)
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('✦  WIDMUNG  ✦', 50, 140, {
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
    
    // "The End" (ohne '&)
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('✦  THE END  ✦', 50, A4_HEIGHT - 120, {
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
