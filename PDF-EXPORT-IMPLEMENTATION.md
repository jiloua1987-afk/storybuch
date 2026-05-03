# PDF-Export Implementation - Proof of Concept
**Datum:** 3. Mai 2026, 21:00 Uhr

---

## 🎯 ZIEL

**Button in Step5Preview oder Step6Checkout:**
- "📄 Als PDF exportieren (Testdruck)"
- Exportiert: Cover + alle Seiten + Ending
- Format: A4 mit Titel + Seitenzahl
- Download als einzelne PDF-Datei

**Nutzen:**
- User kann Qualität selbst prüfen
- Testdruck bei lokaler Druckerei bestellen
- Feedback zur DPI-Qualität sammeln

---

## 📦 BENÖTIGTE PACKAGES

### Backend:
```json
{
  "dependencies": {
    "pdfkit": "^0.15.0"
  }
}
```

**PDFKit:** Einfache PDF-Erstellung in Node.js

---

## 🛠️ IMPLEMENTIERUNG

### **Schritt 1: PDF Generator (Backend)**

**Datei:** `backend-railway/src/lib/pdf-generator.js` (NEU)

```javascript
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
```

---

### **Schritt 2: API Endpoint (Backend)**

**Datei:** `backend-railway/src/routes/comic.js`

```javascript
const { createComicPDF } = require('../lib/pdf-generator');

// PDF Export Endpoint
router.post("/export-pdf", async (req, res) => {
  try {
    const { project } = req.body;
    
    if (!project) {
      return res.status(400).json({ error: "Project data required" });
    }
    
    console.log(`Creating PDF for project: ${project.title}`);
    
    const pdfBuffer = await createComicPDF(project);
    
    // PDF als Download zurückgeben
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(project.title)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
    console.log(`✓ PDF created: ${pdfBuffer.length} bytes`);
  } catch (err) {
    console.error("PDF export error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

module.exports = router;
```

---

### **Schritt 3: Frontend Button (Step5Preview) - NUR FÜR DICH**

**Datei:** `src/components/steps/Step5Preview.tsx`

```typescript
const [exportingPDF, setExportingPDF] = useState(false);
const [showDebugTools, setShowDebugTools] = useState(false);

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || "";

// Debug-Modus aktivieren mit ?debug=true in URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setShowDebugTools(params.get('debug') === 'true');
}, []);

const handleExportPDF = async () => {
  setExportingPDF(true);
  try {
    const fullUrl = RAILWAY_URL ? `${RAILWAY_URL}/api/comic/export-pdf` : "/api/comic/export-pdf";
    
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project })
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // PDF als Blob herunterladen
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF erfolgreich exportiert! 📄");
  } catch (e) {
    console.error("PDF export error:", e);
    toast.error("PDF-Export fehlgeschlagen");
  } finally {
    setExportingPDF(false);
  }
};

// UI - Nach den Navigations-Buttons einfügen:
<div className="flex gap-3">
  <Button variant="secondary" onClick={() => setStep(2)}>← Zurück</Button>
  <Button onClick={() => setStep(5)} fullWidth size="lg">Jetzt bestellen</Button>
</div>

{/* PDF Export Button - NUR IM DEBUG-MODUS SICHTBAR */}
{showDebugTools && (
  <div className="border-2 border-yellow-300 bg-yellow-50 rounded-2xl p-4 space-y-2">
    <p className="text-xs text-yellow-700 font-semibold">🔧 DEBUG-TOOLS (nur für dich sichtbar)</p>
    <button
      onClick={handleExportPDF}
      disabled={exportingPDF}
      className="w-full py-3 rounded-xl border-2 border-yellow-400 bg-white text-yellow-700 text-sm hover:bg-yellow-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {exportingPDF ? (
        <>
          <div className="animate-spin">⏳</div>
          <span>PDF wird erstellt...</span>
        </>
      ) : (
        <>
          <span>📄</span>
          <span>PDF exportieren (Testdruck)</span>
        </>
      )}
    </button>
    <p className="text-xs text-yellow-600">
      Für Qualitätsprüfung & Testdrucke. Nicht für Kunden sichtbar.
    </p>
  </div>
)}
```

**Verwendung:**
- Normal: `https://deine-app.com/` → Button NICHT sichtbar
- Debug: `https://deine-app.com/?debug=true` → Button sichtbar

---

### **Alternative: Button in Step6Checkout**

Falls du den Button lieber im Checkout haben möchtest:

**Datei:** `src/components/steps/Step6Checkout.tsx`

```typescript
// Ersetze die bestehende handleExportPDF Funktion:
const handleExportPDF = async () => {
  setLoading(true);
  try {
    const fullUrl = RAILWAY_URL ? `${RAILWAY_URL}/api/comic/export-pdf` : "/api/comic/export-pdf";
    
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project })
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF erfolgreich exportiert! 📄");
  } catch (e) {
    console.error("PDF export error:", e);
    toast.error("PDF-Export fehlgeschlagen");
  } finally {
    setLoading(false);
  }
};

// Der Button ist bereits vorhanden, funktioniert jetzt richtig!
```

---

## 📊 AUFWAND & KOSTEN

### **Implementierung:**
- **Backend PDF Generator:** 3 Stunden
- **API Endpoint:** 30 Minuten
- **Frontend Button:** 30 Minuten
- **Testing:** 1 Stunde
- **Total:** ~5 Stunden

### **Kosten:**
- **Keine zusätzlichen API-Kosten**
- PDFKit ist kostenlos (Open Source)
- Nur Server-Rechenzeit (minimal)

### **Dependencies:**
```bash
cd backend-railway
npm install pdfkit
```

---

## ✅ VORTEILE

1. ✅ **Sofort testbar** - User kann Qualität selbst prüfen
2. ✅ **Keine zusätzlichen Kosten** - Kein Upscaling nötig für Test
3. ✅ **Einfach** - PDFKit ist sehr einfach zu verwenden
4. ✅ **Feedback** - Sammle Feedback zur DPI-Qualität
5. ✅ **Flexibel** - Später mit Upscaling erweiterbar

---

## 🎯 VERWENDUNG

### **Für dich zum Testen:**
1. Öffne deine App mit `?debug=true`: 
   - `http://localhost:3000/?debug=true`
   - `https://deine-app.vercel.app/?debug=true`
2. Erstelle einen Comic
3. In Step5Preview siehst du gelbe Debug-Box mit PDF-Button
4. Klicke "PDF exportieren" → Download startet
5. Öffne PDF und prüfe Qualität
6. Lade bei Flyeralarm hoch und bestelle Testdruck

### **Für Kunden:**
- Ohne `?debug=true` → Button NICHT sichtbar
- Kunden sehen nur "Jetzt bestellen" Button
- Später entscheiden: PDF anbieten oder nicht

---

## 💰 GESCHÄFTSMODELL-OPTIONEN

### **Option A: Nur Druck (EINFACH)** ⭐ EMPFOHLEN

**Preismodell:**
- Starter (3 Seiten): €39
- Standard (5 Seiten): €49
- Premium (8 Seiten): €69

**Workflow:**
```
User erstellt Comic
    ↓
Bezahlt €49
    ↓
Lulu druckt & versendet
    ↓
User erhält Buch
```

**Vorteile:**
- ✅ Einfach zu kommunizieren
- ✅ Höhere Marge
- ✅ Kein Piraterie-Risiko
- ✅ Fokus auf Premium-Produkt

---

### **Option B: PDF per Email nach Zahlung**

**Preismodell:**
- Nur PDF: €29
- Nur Druck: €49
- PDF + Druck: €59 (Bundle)

**Workflow:**
```
User erstellt Comic
    ↓
Wählt: PDF / Druck / Beides
    ↓
Bezahlt
    ↓
PDF per Email + Optional: Druck
```

**Vorteile:**
- ✅ Flexibler für Kunden
- ✅ Digitale Kopie als Backup
- ✅ Mehr Optionen

**Nachteile:**
- ⚠️ Komplexer
- ⚠️ Niedrigere Marge (User druckt selbst)
- ⚠️ Piraterie-Risiko

---

### **Option C: Wasserzeichen-PDF (Vorschau)**

**Kostenlos:**
- PDF mit "VORSCHAU" Wasserzeichen
- User kann Qualität prüfen
- Muss bezahlen für finales PDF/Druck

**Nach Zahlung:**
- PDF ohne Wasserzeichen per Email
- Oder gedrucktes Buch

**Vorteile:**
- ✅ User kann vor Kauf prüfen
- ✅ Reduziert Retouren
- ✅ Vertrauen

**Nachteile:**
- ⚠️ Zusätzliche Implementierung (Wasserzeichen)

### **Phase 1: Basis-PDF (JETZT)**
1. PDFKit installieren
2. PDF Generator implementieren
3. API Endpoint erstellen
4. Frontend Button hinzufügen
5. Testen mit echtem Comic

**Ergebnis:** User kann PDF herunterladen und bei Druckerei bestellen

---

### **Phase 2: Mit Upscaling (SPÄTER)**
Falls Testdrucke zeigen, dass Qualität nicht ausreicht:

```javascript
// In createComicPDF() vor Sharp-Processing:
if (useUpscaling) {
  const upscaledUrl = await upscaleImage(page.imageUrl, 2);
  pageBuffer = await fetchImageBuffer(upscaledUrl);
}
```

**Zusätzlicher Aufwand:** 2-3 Stunden

---

## 📋 TESTING-PLAN

1. **Comic generieren** (z.B. Barcelona-Beispiel)
2. **PDF exportieren** über Button
3. **PDF öffnen** und Qualität prüfen
4. **Bei Flyeralarm hochladen** und Testdruck bestellen (€5-10)
5. **Qualität in der Hand prüfen**
6. **Entscheidung:** Upscaling nötig oder nicht?

---

## 💡 VERBESSERUNGEN (Optional)

### **Option 1: Qualitäts-Auswahl**
```typescript
<select onChange={(e) => setQuality(e.target.value)}>
  <option value="web">Web-Qualität (schnell, klein)</option>
  <option value="print">Druck-Qualität (langsam, groß)</option>
</select>
```

### **Option 2: Format-Auswahl**
```typescript
<select onChange={(e) => setFormat(e.target.value)}>
  <option value="a4">A4 (21×29.7 cm)</option>
  <option value="a5">A5 (14.8×21 cm)</option>
  <option value="square">Quadratisch (20×20 cm)</option>
</select>
```

### **Option 3: Vorschau**
```typescript
// PDF in neuem Tab öffnen statt Download
const url = window.URL.createObjectURL(blob);
window.open(url, '_blank');
```

---

## ✅ FAZIT

**Ja, PDF-Export ist sehr gut machbar!**

- ✅ Einfache Implementierung (~5 Stunden)
- ✅ Keine zusätzlichen Kosten
- ✅ Perfekt zum Testen der Druckqualität
- ✅ User kann bei lokaler Druckerei bestellen
- ✅ Feedback sammeln für Upscaling-Entscheidung

**Empfehlung:**
1. **JETZT:** Basis-PDF implementieren (ohne Upscaling)
2. Testdrucke bestellen und Qualität prüfen
3. **SPÄTER:** Falls nötig, Upscaling hinzufügen

---

**Erstellt:** 3. Mai 2026, 21:00 Uhr  
**Status:** Bereit zur Implementierung  
**Aufwand:** ~5 Stunden
