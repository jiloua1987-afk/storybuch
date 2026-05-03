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
      const coverProcessed = await sharp(coverBuffer)
        .resize(1024, 1536, { fit: 'contain', background: { r: 245, g: 237, b: 224 } })
        .png()
        .toBuffer();
      
      // Cover zentriert auf A4
      const coverWidth = 400;  // ~14 cm
      const coverHeight = 600; // ~21 cm
      const coverX = (A4_WIDTH - coverWidth) / 2;
      const coverY = (A4_HEIGHT - coverHeight) / 2;
      
      doc.image(coverProcessed, coverX, coverY, { 
        width: coverWidth, 
        height: coverHeight 
      });
      
      // Titel unten
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#1A1410')
         .text(project.title.toUpperCase(), 50, A4_HEIGHT - 80, {
           width: A4_WIDTH - 100,
           align: 'center'
         });
      
    } catch (e) {
      console.error('Cover processing error:', e.message);
      // Fallback: Nur Titel
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
      
      // Titel oben
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1A1410')
         .text(page.title.toUpperCase(), 50, 30, {
           width: A4_WIDTH - 100,
           align: 'center'
         });
      
      // Comic-Bild
      if (page.imageUrl) {
        const pageBuffer = await fetchImageBuffer(page.imageUrl);
        const pageProcessed = await sharp(pageBuffer)
          .resize(1024, 1536, { fit: 'contain' })
          .png()
          .toBuffer();
        
        const imgWidth = 400;
        const imgHeight = 600;
        const imgX = (A4_WIDTH - imgWidth) / 2;
        const imgY = 80;
        
        doc.image(pageProcessed, imgX, imgY, { 
          width: imgWidth, 
          height: imgHeight 
        });
      }
      
      // Seitenzahl unten
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#8B7355')
         .text(`${i + 1} / ${pages.length}`, 50, A4_HEIGHT - 40, {
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
    doc.moveTo(A4_WIDTH / 2 - 40, 100)
       .lineTo(A4_WIDTH / 2 + 40, 100)
       .lineWidth(2)
       .strokeColor('#C9963A')
       .stroke();
    
    // "Widmung" Label
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('✦ WIDMUNG ✦', 50, 120, {
         width: A4_WIDTH - 100,
         align: 'center'
       });
    
    // Widmungstext
    doc.fontSize(16)
       .font('Helvetica-Oblique')
       .fillColor('#1A1410')
       .text(project.endingData.endingText, 80, 200, {
         width: A4_WIDTH - 160,
         align: 'center',
         lineGap: 8
       });
    
    // Dekorative Linie mitte
    doc.moveTo(A4_WIDTH / 2 - 30, 400)
       .lineTo(A4_WIDTH / 2 + 30, 400)
       .lineWidth(2)
       .strokeColor('#C9963A')
       .stroke();
    
    // Zitat (falls vorhanden)
    if (project.endingData.dedication) {
      doc.fontSize(12)
         .font('Helvetica-Oblique')
         .fillColor('#8B7355')
         .text(`"${project.endingData.dedication}"`, 80, 430, {
           width: A4_WIDTH - 160,
           align: 'center'
         });
    }
    
    // Von (falls vorhanden)
    if (project.endingData.dedicationFrom) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#8B7355')
         .text(`Von: ${project.endingData.dedicationFrom}`, 80, 480, {
           width: A4_WIDTH - 160,
           align: 'center'
         });
    }
    
    // "The End"
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#C9963A')
       .text('✦ THE END ✦', 50, A4_HEIGHT - 100, {
         width: A4_WIDTH - 100,
         align: 'center'
       });
    
    // Dekorative Linie unten
    doc.moveTo(A4_WIDTH / 2 - 40, A4_HEIGHT - 80)
       .lineTo(A4_WIDTH / 2 + 40, A4_HEIGHT - 80)
       .lineWidth(2)
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
