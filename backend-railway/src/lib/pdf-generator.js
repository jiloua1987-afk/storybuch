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
          fit: 'cover',  // Cover statt contain - füllt volle Breite
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
      
      // Comic-Bild - maximale Platznutzung
      if (page.imageUrl) {
        const pageBuffer = await fetchImageBuffer(page.imageUrl);
        
        // Maximale Bildgröße: kompletter Platz zwischen Titel und Seitenzahl
        const footerHeight = 30;
        const imgPadding = 8; // Padding oben/unten
        const imgWidth = A4_WIDTH; // Volle Breite
        const imgHeight = A4_HEIGHT - titleHeight - footerHeight - (imgPadding * 2);
        const imgX = 0;
        const imgY = titleHeight + imgPadding;
        
        const pageProcessed = await sharp(pageBuffer)
          .resize(Math.round(imgWidth * 2), Math.round(imgHeight * 2), { 
            fit: 'contain',  // Contain - zeigt ganzes Bild ohne Abschneiden
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();
        
        doc.image(pageProcessed, imgX, imgY, { 
          width: imgWidth, 
          height: imgHeight,
          align: 'center',
          valign: 'center'
        });
        
        // ── Sprechblasen rendern ──────────────────────────────────────
        if (page.panels && page.panels.length > 0) {
          console.log(`    → Rendering bubbles for page ${i + 1}`);
          
          // Flatten multi-bubble panels (dialogs array) into individual bubbles
          const allBubbles = [];
          page.panels.forEach((panel, panelIdx) => {
            // Check for multi-bubble format (dialogs array)
            if (panel.dialogs && Array.isArray(panel.dialogs) && panel.dialogs.length > 0) {
              panel.dialogs.forEach((dialogItem, bubbleIdx) => {
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
          
          console.log(`    → Found ${allBubbles.length} bubbles to render`);
          
          allBubbles.forEach((bubble, idx) => {
            // Text vorbereiten (ZUERST!)
            const speaker = bubble.speaker && bubble.speaker !== 'narrator' && bubble.speaker.toLowerCase() !== 'null' 
              ? bubble.speaker + ': ' 
              : '';
            const text = speaker + bubble.dialog;
            
            // Position aus panelPositions oder Fallback
            let bubbleX = imgX + 30;
            let bubbleY = imgY + 30 + (idx * 100);
            
            if (page.panelPositions && page.panelPositions.length > 0) {
              // Find position for this panel number
              const pos = page.panelPositions.find(p => p.nummer === bubble.nummer) || page.panelPositions[idx];
              if (pos) {
                // Konvertiere Prozent zu Pixel-Koordinaten
                bubbleX = imgX + (pos.left / 100) * imgWidth;
                bubbleY = imgY + (pos.top / 100) * imgHeight;
                
                // For multi-bubble panels, stack them vertically
                if (bubble.isMultiBubble && bubble.bubbleIndex > 0) {
                  bubbleY += (bubble.bubbleIndex * (imgHeight * 0.15)); // 15% offset per bubble
                }
              }
            }
            
            // Bubble-Größe berechnen (sehr kompakt für PDF)
            const maxBubbleWidth = 110; // Sehr klein für PDF
            const padding = 6; // Minimales Padding
            
            // Text-Höhe messen
            doc.fontSize(9).font('Helvetica'); // Sehr kleine Schrift für PDF
            const textHeight = doc.heightOfString(text, { width: maxBubbleWidth - (padding * 2) });
            const bubbleWidth = Math.min(maxBubbleWidth, Math.max(70, text.length * 2));
            const bubbleHeight = textHeight + (padding * 2) + 4;
            
            // Ensure bubble stays within image bounds
            if (bubbleY + bubbleHeight > imgY + imgHeight) {
              bubbleY = imgY + imgHeight - bubbleHeight - 5;
            }
            if (bubbleY < imgY) {
              bubbleY = imgY + 5;
            }
            if (bubbleX + bubbleWidth > imgX + imgWidth) {
              bubbleX = imgX + imgWidth - bubbleWidth - 5;
            }
            
            // Bubble-Hintergrund (weiß mit dünnem schwarzem Rand wie in Vorschau)
            const isCaption = bubble.bubble_type === 'caption';
            const bgColor = isCaption ? '#1E0F32' : '#FFFEF8';
            const textColor = isCaption ? '#FFFFFF' : '#1A1410';
            
            doc.save();
            doc.roundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6)
               .lineWidth(1.5)  // Dünner Rahmen wie in Vorschau
               .fillAndStroke(bgColor, '#1A1410');
            
            // Tail (Schwänzchen) hinzufügen - kleines Dreieck nach unten links
            if (!isCaption) {
              const tailX = bubbleX + 20;
              const tailY = bubbleY + bubbleHeight;
              doc.moveTo(tailX, tailY)
                 .lineTo(tailX - 8, tailY + 12)
                 .lineTo(tailX + 12, tailY)
                 .closePath()
                 .fillAndStroke(bgColor, '#1A1410');
            }
            
            // Text in Bubble - Speaker fett, Rest normal (wie in Vorschau)
            if (speaker) {
              // Speaker fett
              doc.fontSize(9) // Kleinere Schrift
                 .font('Helvetica-Bold')
                 .fillColor(textColor)
                 .text(speaker, bubbleX + padding, bubbleY + padding + 2, {
                   width: bubbleWidth - (padding * 2),
                   continued: true
                 })
                 // Dialog normal
                 .font('Helvetica')
                 .text(bubble.dialog, {
                   width: bubbleWidth - (padding * 2),
                   align: 'left',
                   lineGap: 1
                 });
            } else {
              // Nur Dialog, normal
              doc.fontSize(9) // Kleinere Schrift
                 .font('Helvetica')
                 .fillColor(textColor)
                 .text(text, bubbleX + padding, bubbleY + padding + 2, {
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
