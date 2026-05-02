# UI/UX Roadmap — Marktreife Version

## 🎯 Ziel
Professionelle, verkaufsfähige Website für personalisierte Comic-Bücher

---

## 📋 Aufgaben-Liste

### 1. Branding & Identity
- [ ] **Neuer Name** — MyStoryComic war nur Platzhalter
  - Vorschläge brainstormen
  - Domain-Verfügbarkeit prüfen
  - Überall ersetzen (Code, Texte, Meta-Tags)
- [ ] **Logo erstellen**
  - Stil: Comic-inspiriert, professionell
  - Formate: SVG (Web), PNG (Social Media)
  - Favicon generieren

### 2. Design-System
- [ ] **Icons vereinheitlichen**
  - Option A: Alle Icons gleiche Farbe (z.B. Primärfarbe)
  - Option B: An MagischesKinderbuch.de orientieren
  - Konsistente Icon-Library (z.B. Lucide, Heroicons)
- [ ] **Größere Kacheln**
  - Aktuell zu klein/eng
  - Mehr Whitespace
  - Bessere Touch-Targets (mobile)
- [ ] **Typografie**
  - Comic-Texte NICHT mehr kursiv
  - Lesbarkeit verbessern

### 3. Content & Bilder
- [ ] **Neue Produkt-Bilder**
  - Aktuelle Bilder veraltet
  - Mit GPT-4 + DALL-E erstellen
  - Realistische Comic-Seiten als Beispiele
  - Familien-Szenarien zeigen
- [ ] **Grüne Info-Boxen entfernen**
  - "Nur Schlagworte notwendig" raus
  - Mehr Input = besseres Ergebnis
  - Nutzer sollen ausführlich schreiben

### 4. Navigation & Struktur
- [ ] **Neue Unterseite: Blog**
  - Für SEO-Texte
  - Themen: "Geschenkideen", "Familiengeschichten festhalten", etc.
  - Einfaches Blog-Layout
- [ ] **Über Uns optimieren (SEO)**
  - Keywords: "personalisierte Comics", "Erlebnisse als Comic", "Momente mit Dialogen festhalten"
  - Storytelling: Warum Comics? Emotionale Verbindung
- [ ] **"Beispiele" Unterseite raus**
  - Noch keine echten Beispiele vorhanden
  - Später wieder aktivieren

### 5. Preismodell
- [ ] **Neues Preismodell definieren**
  - Option A: Nach Anzahl Seiten (5, 8, 12 Seiten)
  - Option B: Nach Bindung (Softcover / Hardcover)
  - Option C: Kombination (Seiten + Bindung)
- [ ] **Preise festlegen**
  - Kosten pro Comic: ~$1.45 (OpenAI)
  - Druck-Kosten recherchieren
  - Marge kalkulieren
- [ ] **Preisseite umbauen**
  - Klare Pakete
  - "Beliebteste Wahl" Badge
  - Feature-Vergleich

### 6. Ablauf-Darstellung (User Journey)
- [ ] **Ablauf visualisieren**
  - Wo: Startseite oder FAQ
  - Schritte:
    1. Geschichte & Stil wählen
    2. Momente beschreiben
    3. Dialoge (optional)
    4. Bilder hochladen
    5. Widmung
    6. Vorschau & Bearbeiten (Dialoge, Seiten löschen, neu illustrieren)
    7. Bestellen
- [ ] **Design-Optionen**
  - Timeline mit Icons
  - Nummerierte Schritte mit Screenshots
  - Interaktive Demo?

---

## 🎨 Design-Referenzen

### MagischesKinderbuch.de — Was übernehmen?
- Farbschema
- Icon-Stil
- Kachel-Layout
- Call-to-Action Buttons

### Zu vermeiden:
- Zu viel Text in grünen Boxen
- Kleine, enge Kacheln
- Veraltete Beispielbilder

---

## 📁 Betroffene Dateien

### Branding
- `src/app/layout.tsx` — Meta-Tags, Title
- `src/components/Navbar.tsx` — Logo, Name
- `src/components/Footer.tsx` — Name, Links
- `public/` — Logo-Dateien, Favicon

### Design
- `src/app/globals.css` — Farben, Typografie
- `src/components/ui/` — Button, Kacheln
- `tailwind.config.ts` — Design-Tokens

### Content
- `src/app/page.tsx` — Startseite (Ablauf, Bilder)
- `src/components/LandingHero.tsx` — Hero-Section
- `src/app/ueber-uns/page.tsx` — Über Uns (SEO)
- `src/app/preise/page.tsx` — Preismodell
- `src/app/faq/page.tsx` — FAQ (evtl. Ablauf hier)
- `src/app/blog/` — Neue Blog-Sektion (neu erstellen)

### Navigation
- `src/components/Navbar.tsx` — Links anpassen

---

## 🚀 Umsetzungs-Reihenfolge (Vorschlag)

### Phase 1: Quick Wins (1-2h)
1. Grüne Info-Boxen entfernen
2. Comic-Text nicht mehr kursiv
3. Icons vereinheitlichen
4. "Beispiele" Link entfernen

### Phase 2: Content (2-3h)
5. Über Uns SEO-optimieren
6. Ablauf-Darstellung erstellen
7. Neue Bilder mit GPT generieren

### Phase 3: Struktur (2-3h)
8. Preismodell überarbeiten
9. Blog-Sektion erstellen
10. Größere Kacheln / Layout-Verbesserungen

### Phase 4: Branding (2-4h)
11. Neuen Namen festlegen
12. Logo erstellen/beauftragen
13. Überall ersetzen

---

## 💡 Offene Fragen

1. **Neuer Name** — Hast du schon Ideen? Soll ich Vorschläge machen?
2. **Preismodell** — Welche Option bevorzugst du? (Seiten / Bindung / Kombination)
3. **MagischesKinderbuch.de** — Kannst du mir Screenshots/Link zeigen für Icon-Referenz?
4. **Blog** — Wie viele Artikel initial? Soll ich SEO-Texte vorschlagen?
5. **Logo** — Selbst erstellen (GPT/Canva) oder Designer beauftragen?

---

## 📊 Nächste Schritte

**Womit sollen wir anfangen?**
- Quick Wins (grüne Boxen, Icons, Kursiv)?
- Content (Über Uns, Ablauf)?
- Preismodell definieren?
- Branding (Name, Logo)?

Sag mir, was Priorität hat! 🚀
