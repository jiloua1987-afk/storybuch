# Poster-Produkt — Status & Offene Punkte

**Stand:** 17. Mai 2026

---

## Was funktioniert ✅

- **Generierung:** 3-4 Panels aus 1 Moment + Foto → 1 Bild via gpt-image-2
- **Widmung:** Overlay oben oder unten, goldene Linien, kursive Schrift
- **Sprechblasen:** Editierbar per Doppelklick, verschiebbar per Drag
- **PDF-Export:** 1 Seite Vollbild, Titel-Overlay, Widmung, Bubbles
- **Safety-Fallback:** 3-stufig (edit → generate safe → generate generic)
- **Europapark & Freizeitparks:** Werden sanitized → kein Safety-Block mehr
- **Stuck-State-Reset:** Wenn Generierung abgebrochen, wird beim nächsten Besuch zurückgesetzt
- **Komplett getrennt** vom Comic-Buch (eigene Route `/poster`, eigener Store)

---

## Bekannte Bugs 🐛

### 1. Bild wird nicht berücksichtigt (Safety-Block bei images.edit())
**Problem:** `images.edit()` mit Familienfoto wird von OpenAI geblockt → Fallback ohne Foto → Charaktere sehen nicht aus wie im Foto.

**Log:** `images.edit() failed: 400 Your request was rejected by the safety system`

**Ursache:** Unbekannt — möglicherweise Kombination aus Foto + Freizeitpark-Szene. Passiert auch nach Sanitization.

**Workaround:** Fallback generiert ohne Foto, Stil stimmt aber Gesichter sind erfunden.

**Fix-Idee:** Foto-Beschreibung (visual_anchor) stärker in den Fallback-Prompt einbauen, damit Charaktere zumindest ähnlich aussehen.

### 2. Gelöschte Sprechblasen werden trotzdem exportiert
**Problem:** `PanelView` speichert `hiddenBubbles` in `bookStore` via `updateChapter(pageId)`. Der PDF-Export liest aber aus dem `posterStore` — dort sind `hiddenBubbles` nie gesetzt.

**Fix deployed (17. Mai):** `PosterStep4Preview` synct jetzt beim Mount den posterStore in den bookStore. Beim Export wird aus dem bookStore gelesen.

**Status:** ⚠️ Fix deployed, noch nicht getestet.

### 3. Titel-Overlay aus Cover noch sichtbar
**Problem:** Im PDF erscheint der Titel zweimal — einmal aus dem alten Cover-Rendering-Code (weil `coverImageUrl` gesetzt war) und einmal aus dem neuen Poster-Code.

**Fix deployed (17. Mai):** `isPoster: true` Flag verhindert dass der Cover-Code läuft. `coverImageUrl` wird nicht mehr gesetzt.

**Status:** ⚠️ Fix deployed, noch nicht getestet.

---

## Technische Architektur

### Frontend
```
/poster                          → src/app/poster/page.tsx
posterStore (localStorage)       → src/store/posterStore.ts
PosterStep1Basics                → Kategorie, Stil, Format, Foto
PosterStep2Moment                → Titel, Moment, Widmung
PosterStep3Generate              → Generierungs-Screen
PosterStep4Preview               → Vorschau + Bubbles + PDF-Export
```

### Backend (Railway)
```
POST /api/poster/describe-characters  → Charaktere aus Foto beschreiben
POST /api/poster/structure            → GPT-4.1: 3-4 Panel-Struktur
POST /api/poster/generate             → gpt-image-2: Poster-Bild
POST /api/comic/export-pdf            → PDF (isPoster=true Modus)
```

### PDF-Export Flow (isPoster=true)
```
1 Seite Vollbild (fit:contain, A4)
  → Titel-Overlay (goldene Linien, weiße Schrift)
  → Widmung-Overlay (oben oder unten, semi-transparent)
  → Sprechblasen (identisch mit Comic-Buch-Logik)
Keine Cover-Seite, keine Rückseite
```

### Bubble-Sync-Problem (bookStore ↔ posterStore)
`PanelView` schreibt immer in `bookStore.updateChapter(pageId)`.
`PosterStep4Preview` synct beim Mount den posterStore → bookStore.
Beim PDF-Export wird aus bookStore gelesen (nicht posterStore).

---

## Nächste Schritte

### Sofort
- [ ] Bug 1 testen: Sind gelöschte Bubbles jetzt korrekt ausgeblendet?
- [ ] Bug 2 testen: Erscheint der Titel nur einmal?
- [ ] Bug 3 testen: Wird das Foto berücksichtigt (oder immer noch Safety-Block)?

### Kurzfristig
- [ ] Safety-Block bei images.edit() mit Foto lösen
  - Option A: Foto-Beschreibung (visual_anchor) in Fallback-Prompt stärker nutzen
  - Option B: Foto vor dem Upload durch Safety-Rewriter schicken (nicht möglich)
  - Option C: Foto als Base64 direkt übergeben statt URL (bereits so implementiert)
- [ ] Druckpartner anbinden (Gelato/Printful) für Poster/Leinwand
- [ ] Preisseite für Poster ergänzen
- [ ] Landing-Page-Eintrag für `/poster`

### Mittelfristig
- [ ] Querformat-Support im PDF (aktuell immer A4 Hochformat)
- [ ] Mehr Panel-Layouts (z.B. 1 großes Panel + 2 kleine)
- [ ] Poster-Vorschau auf Landing-Page

---

## Preismodell (Vorschlag)

| Produkt | Herstellung | Verkauf |
|---------|-------------|---------|
| Digital Download | ~0€ | 9–19€ |
| Fine-Art Poster A3 | 3–6€ | 29–49€ |
| Leinwand 40×60 | 12–20€ | 59–99€ |

---

**Route:** `https://storybuch-jiloua1987-afks-projects.vercel.app/poster`
