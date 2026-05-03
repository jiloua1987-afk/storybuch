# PDF-Export - Verwendung
**Datum:** 3. Mai 2026, 21:30 Uhr

---

## ✅ IMPLEMENTIERUNG ABGESCHLOSSEN

Phase 1 des PDF-Exports ist fertig implementiert!

---

## 🚀 VERWENDUNG

### **1. Dependencies installieren**

```bash
cd backend-railway
npm install
```

Dies installiert PDFKit (bereits in package.json hinzugefügt).

---

### **2. Backend neu starten**

```bash
# Lokal:
cd backend-railway
npm run dev

# Oder auf Railway:
git add .
git commit -m "Add PDF export functionality"
git push
```

Railway deployed automatisch nach dem Push.

---

### **3. PDF exportieren (Debug-Modus)**

1. **Öffne deine App mit `?debug=true`:**
   - Lokal: `http://localhost:3000/?debug=true`
   - Production: `https://deine-app.vercel.app/?debug=true`

2. **Erstelle einen Comic:**
   - Gehe durch alle Steps
   - Generiere Cover + Seiten + Ending

3. **In Step 5 (Vorschau):**
   - Scrolle nach unten
   - Du siehst eine **gelbe Debug-Box** mit:
     - "🔧 DEBUG-TOOLS (nur für dich sichtbar)"
     - Button: "📄 PDF exportieren (Testdruck)"

4. **Klicke auf den Button:**
   - PDF wird erstellt (~5-10 Sekunden)
   - Download startet automatisch
   - Dateiname: `[Dein-Titel].pdf`

---

## 📄 WAS IST IM PDF?

Das PDF enthält:

1. **Cover** - Zentriert auf A4 mit Titel unten
2. **Alle Comic-Seiten** - Mit Titel oben + Seitenzahl unten
3. **Ending** - Widmung mit Dekoration

**Format:**
- A4 (21×29.7 cm)
- Comic-Bilder: 400×600 Points (~14×21 cm)
- Titel oben: 18pt Helvetica Bold
- Seitenzahl unten: 12pt Helvetica
- Hintergrund: Cream (#F5EDE0)

---

## 🖨️ TESTDRUCK BESTELLEN

### **Bei Flyeralarm:**

1. Gehe zu: https://www.flyeralarm.com/de/
2. Wähle: "Broschüren" → "A4" → "Softcover"
3. Lade dein PDF hoch
4. Wähle:
   - Seiten: Automatisch erkannt
   - Papier: 130g/m² (Standard)
   - Bindung: Klebebindung
   - Menge: 1 Stück
5. Bestelle (~€10-15)
6. Lieferung: 3-5 Werktage

### **Bei Cewe:**

1. Gehe zu: https://www.cewe.de/
2. Wähle: "Fotobuch" → "A4 Hochformat" → "Softcover"
3. Lade PDF hoch
4. Bestelle (~€15-20)
5. Lieferung: 2-4 Werktage

---

## 🔍 QUALITÄT PRÜFEN

Wenn du den Testdruck erhältst:

### **Prüfe:**
- ✅ Sind die Bilder scharf genug?
- ✅ Sind Details erkennbar?
- ✅ Wirken die Gesichter klar?
- ✅ Sind die Outlines sichtbar?
- ✅ Ist die Qualität akzeptabel für €49?

### **Wenn Qualität OK:**
→ Kein Upscaling nötig! Spare Kosten & Komplexität.

### **Wenn zu pixelig:**
→ AI Upscaling implementieren (siehe `A4-FORMAT-UND-LULU-ANALYSE.md`)
→ Zusätzliche 8-10 Stunden Aufwand
→ +$0.05 pro Comic

---

## 🐛 TROUBLESHOOTING

### **Problem: Button nicht sichtbar**
**Lösung:** Stelle sicher, dass `?debug=true` in der URL ist.

### **Problem: "PDF export error"**
**Lösung:** 
1. Prüfe Backend-Logs (Railway Dashboard)
2. Stelle sicher, dass PDFKit installiert ist: `npm list pdfkit`
3. Prüfe, dass alle Bilder URLs haben (nicht leer)

### **Problem: PDF ist leer/fehlerhaft**
**Lösung:**
1. Prüfe, dass Cover + Seiten generiert wurden
2. Öffne Browser Console (F12) für Fehler
3. Prüfe Backend-Logs für "PDF export error"

### **Problem: Download startet nicht**
**Lösung:**
1. Prüfe Browser-Popup-Blocker
2. Erlaube Downloads von deiner Domain
3. Versuche anderen Browser

---

## 🎯 NÄCHSTE SCHRITTE

1. ✅ **JETZT:** Testdruck bestellen
2. ⏳ **Warten:** 3-5 Tage Lieferung
3. 🔍 **Prüfen:** Qualität in der Hand
4. 💡 **Entscheiden:** Upscaling nötig oder nicht?
5. 💰 **Geschäftsmodell:** PDF für Kunden anbieten oder nicht?

---

## 📝 NOTIZEN

### **Für Kunden sichtbar machen (später):**

Falls du entscheidest, PDF für Kunden anzubieten:

1. Entferne `{showDebugTools && ...}` Bedingung
2. Ändere Button-Style (nicht gelb)
3. Füge Preismodell hinzu:
   - Nur PDF: €29
   - Nur Druck: €49
   - PDF + Druck: €59

### **Wasserzeichen hinzufügen (optional):**

Für kostenlose Vorschau mit Wasserzeichen:

```javascript
// In pdf-generator.js, nach jedem doc.image():
doc.fontSize(60)
   .font('Helvetica-Bold')
   .fillColor('#FF0000')
   .opacity(0.3)
   .text('VORSCHAU', 0, A4_HEIGHT / 2, {
     width: A4_WIDTH,
     align: 'center',
     rotate: -45
   })
   .opacity(1);
```

---

## ✅ IMPLEMENTIERTE DATEIEN

1. ✅ `backend-railway/package.json` - PDFKit dependency
2. ✅ `backend-railway/src/lib/pdf-generator.js` - PDF Generator (NEU)
3. ✅ `backend-railway/src/routes/comic.js` - Export-Endpoint
4. ✅ `src/components/steps/Step5Preview.tsx` - Debug-Button

---

**Erstellt:** 3. Mai 2026, 21:30 Uhr  
**Status:** ✅ Fertig implementiert  
**Nächster Schritt:** `npm install` im Backend + Testdruck bestellen
