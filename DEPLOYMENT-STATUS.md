# Deployment Status — 2. Mai 2026

## ✅ Git Push Erfolgreich

**Commit:** `234e47c` - Fix: Photo-Analyse ULTRA-verstärkt + Panel-Action-Wiederholung
**Pushed to:** `origin/main`
**Zeit:** Gerade eben

---

## 🚀 Railway Deployment

**Status:** In Progress (Image wird gepusht)
**Erwartete Dauer:** 2-3 Minuten
**Dashboard:** https://railway.app

### Was zu prüfen ist:
1. Deployment Status wird "Active"
2. Keine Fehler in den Build-Logs
3. Backend startet erfolgreich auf Port 3001

---

## ⚠️ WICHTIG: Supabase Constraint Fix

**MUSS MANUELL AUSGEFÜHRT WERDEN!**

### Schritt-für-Schritt:

1. **Öffne Supabase Dashboard:**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt

2. **SQL Editor öffnen:**
   - Klicke auf "SQL Editor" in der linken Sidebar

3. **SQL ausführen:**
   ```sql
   -- Prüfe ob Constraint bereits existiert
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints 
   WHERE table_name = 'character_ref_image' 
     AND constraint_type = 'UNIQUE';
   
   -- Wenn leer → Constraint hinzufügen:
   ALTER TABLE character_ref_image
   ADD CONSTRAINT character_ref_image_project_character_unique
   UNIQUE (project_id, character_name);
   
   -- Verifizieren:
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints 
   WHERE table_name = 'character_ref_image' 
     AND constraint_type = 'UNIQUE';
   ```

4. **Klicke "Run"** (oder Strg+Enter)

5. **Erwartetes Ergebnis:**
   ```
   constraint_name                                  | constraint_type
   ------------------------------------------------|----------------
   character_ref_image_project_character_unique    | UNIQUE
   ```

### Warum ist das wichtig?
Ohne diesen Fix schlägt `saveCharacterRefs` bei jeder Generierung fehl mit:
```
saveCharacterRefs error: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

---

## 🧪 Test-Plan (nach Supabase Fix)

### Test-Szenario: "Omas 80. Geburtstag"
(Gleiche Story wie vorher, um Verbesserungen zu vergleichen)

**Zu prüfen:**

#### 1. Charakter-Genauigkeit (Photo-Analyse Fix)
- [ ] **Thomas (Schwiegersohn):** Hat er jetzt GRAUE Haare statt blonde?
- [ ] **Andere Charaktere:** Stimmen sie mit dem Original überein?
- [ ] **Keine erfundenen Details:** Keine Brillen/Schnurrbärte die nicht im Foto sind

#### 2. Panel-Variation (Panel-Action Fix)
- [ ] **Torte-Szene:** Zeigt Panel 1 und Panel 3 unterschiedliche Actions?
- [ ] **Abschiedstanz:** Sind die Panels progressiv statt repetitiv?
- [ ] **Allgemein:** Keine zwei Panels zeigen die gleiche Action

#### 3. Safety-Block (Erweiterte Sanitization)
- [ ] **Fotoalbum-Szene:** Wird sie jetzt generiert?
- [ ] **Cover:** Funktioniert mit User-Foto?
- [ ] **Logs:** Weniger Safety-Blocks als vorher?

#### 4. Quality Score + Auto-Retry
- [ ] **Stil-Konsistenz:** Alle Seiten im Bande Dessinée Stil?
- [ ] **Keine Manga-Ausreißer:** Visuell prüfen
- [ ] **Logs:** Zeigen "Quality check PASSED" oder "Quality check FAILED, retrying"

#### 5. Neu illustrieren Feature
- [ ] **Textarea erscheint:** Unter jeder Seite
- [ ] **Ohne Text:** Seite wird zufällig neu generiert
- [ ] **Mit Text:** (z.B. "Opa mehr im Vordergrund") → Seite wird angepasst
- [ ] **Andere Seiten:** Bleiben unverändert
- [ ] **Nach 1x:** Button disabled "Bereits neu illustriert"

#### 6. Seite löschen Feature
- [ ] **Button erscheint:** "🗑️ Seite löschen" unter jeder Seite
- [ ] **Confirmation:** Dialog erscheint
- [ ] **Löschen funktioniert:** Seite wird ausgeblendet
- [ ] **Wiederherstellen:** "X Seiten gelöscht — Alle wiederherstellen" funktioniert

#### 7. Supabase (nach Fix)
- [ ] **Keine Constraint-Fehler:** In Railway Logs
- [ ] **character_ref_image:** Wird befüllt
- [ ] **last_page_image:** Wird befüllt mit quality_score

---

## 📊 Erwartete Railway Logs

### Erfolgreiche Generierung:
```
[inf] Structuring 5 moments individually...
[inf] ✓ Ending generated
[inf] Analyzing photo — detecting which characters are visible...
[inf]   → Detected in photo: oma helga, opa werner, sabine, thomas, sophie, felix
[inf]   → Thomas: described from photo
[inf] ✓ Structure: 5 pages, 6 characters
[inf] ✓ Cover done (with user photo)
[inf] Generating page "Die Torte kommt!" (3 panels, ref: cover)
[inf]   → Quality check PASSED
[inf] ✓ Page "Die Torte kommt!" done
[inf] Generating page "Geheime Garten-Party" (3 panels, ref: cover)
[inf]   → Quality check PASSED
[inf] ✓ Page "Geheime Garten-Party" done
...
```

### Mit Quality Retry (gut!):
```
[inf] Generating page "Titel 3" (3 panels, ref: cover)
[inf]   → Quality check FAILED (style: wrong), retrying with stronger prompt
[inf]   → Retry completed with stronger prompt
[inf] ✓ Page "Titel 3" done
```

### Mit Safety Block (sollte seltener sein):
```
[inf] Generating page "Fotoalbum" (3 panels, ref: cover)
[err]   → images.edit() failed, falling back: 400 Your request was rejected
[inf]   → Safety block, retrying with sanitized prompt + generate-only
[inf] ✓ Page "Fotoalbum" done
```

### ❌ FEHLER die NICHT mehr auftreten sollten:
```
[err] saveCharacterRefs error: there is no unique or exclusion constraint
```
→ Wenn das noch erscheint: Supabase Fix wurde nicht ausgeführt!

---

## 🎯 Was wurde gefixt (Zusammenfassung)

### Problem 1: Schwiegersohn falsch (blonde statt graue Haare)
**Fix:** Photo-Analyse ULTRA-verstärkt
- Explizite Regel: "Person 50+ with light hair → almost always GRAY, not blonde"
- "NEVER confuse gray hair with blonde hair!"
- Alter-Check: "Does description match person of age X?"
- **Code:** `backend-railway/src/routes/comic.js` Zeile 295-320

### Problem 2: Ähnliche Panels (Torte/Abschiedstanz)
**Fix:** Panel-Action-Wiederholung verboten
- "If Panel 1 shows character does X → NO other panel may show character does X"
- GOOD/BAD Beispiele mit konkretem Torte-Szenario
- **Code:** `backend-railway/src/routes/comic.js` Zeile 195-220

### Problem 3: Fotoalbum-Szene nicht generiert
**Fix:** Safety-Block erweitert
- Sanitized prompt entfernt jetzt auch: "photo", "album", "secret", "memory", "hidden"
- Gilt für Englisch und Deutsch
- **Code:** `backend-railway/src/routes/comic.js` Zeile 625-635

### Problem 4: Manga-Ausreißer möglich
**Fix:** Quality Score + Auto-Retry
- GPT-4.1 Vision prüft jede Seite nach Generierung
- Bei "wrong": Automatischer Retry mit ultra-starkem Anti-Manga-Prompt
- **Code:** `backend-railway/src/routes/comic.js` Zeile 665-730

### Problem 5: Keine Möglichkeit Seiten anzupassen
**Fix:** "Neu illustrieren" mit Freitextfeld
- Textarea unter jeder Seite: "Was soll anders sein?"
- Optional — leer = zufällige Regenerierung
- **Code:** `src/components/steps/Step5Preview.tsx`

### Problem 6: Keine Möglichkeit Seiten zu löschen
**Fix:** Seite löschen Feature
- Button "🗑️ Seite löschen" mit Confirmation
- "Alle wiederherstellen" Button
- **Code:** `src/components/steps/Step5Preview.tsx`

---

## 💰 Kosten pro Comic

**Neu (mit Quality Score):**
- Struktur (GPT-4.1): $0.02
- Cover (gpt-image-2): $0.20
- Seiten (gpt-image-2): 5 × $0.20 = $1.00
- **Quality Checks (GPT-4.1 Vision): 5 × $0.005 = $0.025**
- Retries (worst case, 20%): ~1 × $0.20 = $0.20
- **Gesamt: ~$1.45 pro Comic**

**Vorher (ohne Quality Score):**
- Gesamt: ~$1.22 pro Comic

**Zusatzkosten:** +$0.23 pro Comic (davon $0.025 für Checks, ~$0.20 für Retries)

---

## 📁 Alle Commits (heute)

```
234e47c - Fix: Photo-Analyse ULTRA-verstärkt + Panel-Action-Wiederholung ← GERADE GEPUSHT
b73c813 - Docs: Ready to Deploy Checklist
f1e273a - Fix: Neu illustrieren Sicherheit + Seite löschen Feature
d912934 - Docs: Implementation Summary
181333c - Feature: Quality Score + Auto-Retry + Neu illustrieren
c02b657 - Docs: Update session-state mit Test-Ergebnissen
30c0eff - Fix: Photo-Analyse präziser, Panel-Variation, Safety-Block
```

---

## ⏭️ Nächste Schritte

### JETZT (DU):
1. ✅ Git Push — **ERLEDIGT**
2. ⏳ Railway Deployment abwarten (2-3 Min)
3. ⏳ Supabase Constraint Fix ausführen (siehe oben)
4. ⏳ Test durchführen (siehe Test-Plan)

### DANACH (Frontend/UX Session):
5. ⏳ UX/UI Redesign — Ruhigerer Wizard
6. ⏳ Outfit-State Tracking — Kleidungs-Konsistenz
7. ⏳ Weitere Frontend-Verbesserungen

### SPÄTER (nach Tier 2):
8. ⏳ Geschwindigkeit — OpenAI Tier 2 Upgrade (12 Min → 2-3 Min)
9. ⏳ PDF-Export + Druckspezifikation
10. ⏳ Seitenanzahl erhöhen (8-12 Seiten)

---

## 🎉 Status

**Code:** ✅ Gepusht
**Railway:** ⏳ Deploying
**Supabase:** ⚠️ Manueller Fix erforderlich
**Tests:** ⏳ Warten auf Deployment

**Bereit für:** Supabase Fix → Test → Frontend/UX Session

