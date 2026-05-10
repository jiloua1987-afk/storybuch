# ComicStyle.de - Roadmap

**Letzte Aktualisierung:** 10. Mai 2025

---

## 🔥 KRITISCHE PROBLEME (Sofort)

### ✅ 1. **Clothing-Consistency** (ERLEDIGT - 10. Mai 2025)
**Problem:** Charaktere trugen unterschiedliche Kleidung auf verschiedenen Seiten derselben Szene
- Seite 1 Geburtstag: Mama blaues Kleid
- Seite 2 Geburtstag: Mama grünes Shirt ❌

**Lösung:** ✅ Implementiert
- **Deterministische Kleidungsgenerierung:** Hash-basiert (Name + Location)
- **Konsistent pro Szene:** Dieselbe Location → dieselbe Kleidung
- **Keine Datenbank nötig:** Rein algorithmisch
- **Verstärkte Prompts:** "MUST wear EXACTLY the clothing specified, IDENTICAL across all panels"

**Status:** ✅ Deployed (Commit 682b6449)
**Test:** Mit neuem Comic testen

---

### ~~2. **Character-Presence-Check**~~ ❌ NICHT WICHTIG
**User-Feedback:** "Nr. 3. ist nicht wichtig, er wurde in der Moment beschreibung auch nicht erwähnt"
- Papa fehlt auf manchen Seiten → OK, wenn nicht in Story erwähnt
- **Status:** Übersprungen per User-Anweisung

---

### ✅ 3. **Duplicate Characters in Panel** (ERLEDIGT - 10. Mai 2025)
**Problem:** GPT bildet manchmal eine Figur ZWEIMAL im gleichen Panel ab
- Beispiel: Aymen erscheint links UND rechts im gleichen Panel ❌

**Lösung:** ✅ Implementiert
- Strikter Prompt: "Each character appears EXACTLY ONCE per panel"
- "NEVER show the same character on left AND right side"
- "Each person has ONE body, ONE position per panel"

**Status:** ✅ Deployed (bereits in vorherigem Commit)
**Test:** Mit neuem Comic testen

---

### ✅ 4. **Face-Consistency nimmt ab** (VERBESSERT - 10. Mai 2025)
**Problem:** 
- Cover: ✅ Perfekt
- Seite 1: ✅ Gut
- Seite 2+: ❌ Gesichter ändern sich immer mehr

**Lösung:** ✅ Implementiert
- **3x stärkere Prompts:** "ULTRA-CRITICAL FACE CONSISTENCY RULES"
- **Explizite Details:** "EXACT SAME: eye shape, eye color, nose shape, mouth shape..."
- **Anti-Drift:** "DO NOT let faces drift or change between panels"
- **Wiederholung:** "If brown eyes in panel 1, MUST be brown eyes in panels 2, 3, 4"

**Status:** ✅ Deployed (Commit 682b6449)
**Test:** Mit neuem Comic testen - Gesichter sollten konsistenter bleiben
**Hinweis:** OpenAI's image-edit hat inherenten "drift" - 100% Konsistenz schwierig

---

## 📋 WICHTIGE FEATURES (Bald)

### 5. **Speaker bearbeiten** 📝 MITTEL
**Problem:** Beim Text-Bearbeiten kann man nur Dialog ändern, nicht den Speaker
- User will "Papa:" → "Mama:" ändern können

**Lösung:**
- Input-Feld für Speaker im Edit-Modus hinzufügen
- Speichern in `dialogs[].speaker`

**Impact:** Mittel - Nice-to-have für Flexibilität
**Aufwand:** Niedrig (1-2h)

---

### 6. **Bubble-Positionierung 100% perfekt** 📍 NIEDRIG
**Problem:** Positionen werden "etwas besser" gespeichert, aber nicht 100% perfekt

**Status:** Aktuell "gut genug" - einfaches 2-Spalten-Grid funktioniert

**Lösung (falls nötig):**
- Mehr Logging in `resolvedPositions`
- `dragPositions` auch in Store speichern?

**Impact:** Niedrig - funktioniert bereits "gut genug"
**Aufwand:** Mittel (2-3h)

---

## ✅ ERLEDIGTE FEATURES

### ✅ Clothing-Consistency (10. Mai 2025)
- Deterministische Kleidungsgenerierung pro Szene
- Hash-basiert: Name + Location → konsistente Farben
- Verstärkte Prompts: "IDENTICAL across all panels"
- **Status:** Deployed ✅

### ✅ Face-Consistency Prompts (10. Mai 2025)
- 3x stärkere Prompts mit expliziten Details
- Anti-Drift Anweisungen
- Wiederholung kritischer Features
- **Status:** Deployed ✅ (Verbesserung, nicht 100% Lösung)

### ✅ Duplicate Characters Fix (10. Mai 2025)
- Ultra-strikte Prompts: "EXACTLY ONCE per panel"
- "NEVER show same character twice"
- **Status:** Deployed ✅

### ✅ Bubble-Größe speichern (10. Mai 2025)
- Frontend: `useEffect` in `ResizableBubble` aktualisiert State
- Backend: PDF verwendet gespeicherte Größen
- **Status:** Funktioniert ✅

### ✅ Hidden Bubbles persistieren (10. Mai 2025)
- `hiddenBubbles` Feld in Store
- Gelöschte Bubbles bleiben gelöscht nach Navigation
- PDF filtert hidden bubbles
- **Status:** Funktioniert ✅

### ✅ Text-Bearbeitung (10. Mai 2025)
- Double-Click öffnet Edit-Modus
- Textarea verwendet `editedDialogs` State (nicht `displayDialog`)
- Speichert in Store
- **Status:** Funktioniert ✅

### ✅ PDF-Export (10. Mai 2025)
- Cover ohne schwarzen Balken (nur goldene Linien)
- Bubbles skaliert (70%) für PDF
- Hidden bubbles gefiltert
- Gespeicherte Größen verwendet
- **Status:** Funktioniert ✅

### ✅ CORS-Fix (10. Mai 2025)
- Alle Vercel-Domains erlaubt
- Dynamische Origin-Funktion
- **Status:** Funktioniert ✅

---

## 💡 IDEEN ZUM TESTEN (Sicher, ohne Production zu riskieren)

### **Test: Seiten basieren auf Original-Fotos (statt Cover)**
**Idee:** Aktuell basieren alle Seiten auf dem Cover als Reference. Früher gab es das Problem mit photorealistischen Figuren. Das Cover ist jetzt gut (scharf, nicht photorealistisch). Frage: Wären Seiten noch besser, wenn sie direkt auf den Original-Upload-Fotos basieren?

**Erwartetes Ergebnis:**
- ✅ Möglicherweise schärfere Gesichter (direkt vom Foto)
- ⚠️ Risiko: Photorealismus kommt zurück (das alte Problem von vor 2 Wochen)
- ⚠️ Risiko: Stil-Inkonsistenz zwischen Seiten

**Sicherer Test-Ansatz (Railway Preview Deployment):**
```bash
# 1. Neuen Branch erstellen
git checkout -b test-original-photos-for-pages

# 2. In comic.js: Seiten-Strategie ändern
#    reference = primaryRefUrl (Original-Foto) statt coverImageUrl (Cover)

# 3. Pushen → Railway deployed automatisch auf separater Test-URL
git push origin test-original-photos-for-pages
# → https://storybuch-test-original-photos.up.railway.app

# 4. Testen → wenn gut: merge, wenn schlecht: Branch löschen
```

**Alternativen:**
- Feature-Flag: `USE_ORIGINAL_PHOTOS_FOR_PAGES=true` in Railway Env Variables
- Lokaler Test-Server mit `npm start` im backend-railway Ordner

**Status:** 💤 Idee gespeichert — noch nicht umgesetzt (zu riskant ohne sicheres Testing-Setup)

---

## 🎯 LANGFRISTIGE VISION

### Panel-by-Panel Generation
**Idee:** Jedes Panel einzeln generieren statt ganze Seiten
- **Pro:** Höhere Konsistenz, bessere Kontrolle
- **Contra:** Langsamer, teurer
- **Status:** Evaluieren

### Face-Locking mit AI
**Idee:** OpenAI's neue Consistency-Features nutzen
- **Status:** Warten auf OpenAI-Updates

### Clothing-Override per Panel
**Idee:** User kann Kleidung pro Szene überschreiben
- Beispiel: "Rania trägt Partykleid auf Geburtstag"
- **Status:** Nice-to-have

---

## 📊 Prioritäten-Matrix

| Feature | Impact | Aufwand | Priorität | Status |
|---------|--------|---------|-----------|--------|
| Duplicate Characters Fix | Kritisch | Niedrig | 🔥 **SOFORT** | ✅ **ERLEDIGT** |
| Clothing-Consistency | Hoch | Mittel | 🔥 **SOFORT** | ✅ **ERLEDIGT** |
| Face-Consistency | Hoch | Hoch | ⚠️ **BALD** | ✅ **VERBESSERT** |
| Speaker bearbeiten | Mittel | Niedrig | 📋 **BALD** | ⏳ **OFFEN** |
| ~~Character-Presence~~ | ~~Hoch~~ | ~~Mittel~~ | ~~SOFORT~~ | ❌ **ÜBERSPRUNGEN** |
| Bubble-Position 100% | Niedrig | Mittel | 💤 **SPÄTER** | ⏳ **OFFEN** |

---

## 🚀 Nächste Schritte

1. ✅ ~~**Duplicate Characters Fix**~~ (ERLEDIGT)
   
2. ✅ ~~**Clothing-Consistency**~~ (ERLEDIGT)

3. ✅ ~~**Face-Consistency**~~ (VERBESSERT)

4. **Speaker bearbeiten** (1-2h) - NÄCHSTES
   - Input-Feld für Speaker im Edit-Modus
   - Speichern in `dialogs[].speaker`
   - Nur falls einfach möglich

5. **Testing mit neuem Comic**
   - Kleidung konsistent innerhalb Szene?
   - Gesichter bleiben konsistent?
   - Keine Duplikate mehr?

---

**Geschätzte Zeit für kritische Fixes:** ~~6-8 Stunden~~ → ✅ **ERLEDIGT**  
**Geschätzte Zeit für alle Features:** ~~12-15 Stunden~~ → **2-3 Stunden verbleibend**

---

**Erstellt:** 10. Mai 2025  
**Letztes Update:** 10. Mai 2025, 14:40 Uhr  
**Nächstes Review:** Nach Test mit neuem Comic
