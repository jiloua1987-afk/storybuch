# Ready to Deploy — 2. Mai 2026

## ✅ Alle Features implementiert

### 1. Quality Score + Auto-Retry
- GPT-4.1 Vision prüft jede Seite nach Generierung
- Bei Manga/Anime/Photorealistisch: Automatischer Retry
- Quality Score in Supabase gespeichert
- **Kosten:** +$0.025 pro Comic

### 2. "Neu illustrieren" mit Freitextfeld
- Textarea unter jeder Seite: "Was soll anders sein?"
- Optional — leer = zufällige Regenerierung
- Backend hängt Note ans Ende des Prompts
- **Sicherheit:** projectId + referenceImageUrls mitgesendet → keine Auswirkung auf andere Seiten

### 3. Seite löschen
- Button "🗑️ Seite löschen" unter jeder Seite
- Confirmation Dialog
- Gelöschte Seiten ausgeblendet (nicht aus Store entfernt)
- "Alle wiederherstellen" Button

### 4. Weitere Fixes
- Photo-Analyse präziser (graue Haare statt blonde)
- Panel-Variation mit GOOD/BAD Beispielen
- Safety-Block erweitert (photo, album, secret entfernt)
- Frontend Error-Logging verbessert

---

## 🚀 Deployment-Schritte

### 1. Git Push
```bash
git push origin main
```

### 2. Railway Deploy
- Warte 2-3 Minuten
- Prüfe Logs: https://railway.app
- Status sollte "Active" sein

### 3. Supabase Constraint Fix ⚠️ WICHTIG!
```bash
# Öffne SUPABASE-FIX.sql
# Kopiere SQL
# Gehe zu Supabase Dashboard → SQL Editor
# Füge ein und klicke "Run"
```

**SQL:**
```sql
ALTER TABLE character_ref_image
ADD CONSTRAINT character_ref_image_project_character_unique
UNIQUE (project_id, character_name);
```

**Ohne diesen Fix:** saveCharacterRefs schlägt bei jeder Generierung fehl!

---

## 🧪 Test-Checklist

Nach Deployment testen:

**Basis-Funktionalität:**
- [ ] Comic generieren funktioniert
- [ ] Cover wird erstellt
- [ ] Alle 5 Seiten werden generiert
- [ ] Keine Fehler in Railway Logs

**Quality Score:**
- [ ] Seiten werden generiert
- [ ] Keine Manga-Ausreißer (visuell prüfen)
- [ ] Railway Logs zeigen "Quality check PASSED" oder "Quality check FAILED, retrying"

**Neu illustrieren:**
- [ ] Textarea erscheint unter jeder Seite
- [ ] Ohne Text: Seite wird neu generiert (zufällig)
- [ ] Mit Text (z.B. "Opa mehr im Vordergrund"): Seite wird angepasst
- [ ] Andere Seiten bleiben unverändert
- [ ] Nach 1x: Button disabled "Bereits neu illustriert"

**Seite löschen:**
- [ ] Button "🗑️ Seite löschen" erscheint
- [ ] Confirmation Dialog erscheint
- [ ] Seite wird ausgeblendet
- [ ] "X Seiten gelöscht — Alle wiederherstellen" erscheint
- [ ] Wiederherstellen funktioniert

**Supabase:**
- [ ] Keine Fehler "no unique or exclusion constraint" in Logs
- [ ] character_ref_image Tabelle wird befüllt
- [ ] last_page_image Tabelle wird befüllt mit quality_score

---

## 📊 Erwartete Logs (Railway)

**Erfolgreiche Generierung:**
```
Structuring 5 moments individually...
✓ Ending generated
Analyzing photo — detecting which characters are visible...
  → Detected in photo: mama, papa, luca, maria
  → Mama: described from photo
  → Papa: described from photo
✓ Structure: 5 pages, 4 characters
✓ Cover done (with user photo)
Generating page "Titel 1" (3 panels, ref: cover)
  → Quality check PASSED
✓ Page "Titel 1" done
Generating page "Titel 2" (4 panels, ref: cover)
  → Quality check PASSED
✓ Page "Titel 2" done
...
```

**Mit Quality Retry:**
```
Generating page "Titel 3" (3 panels, ref: cover)
  → Quality check FAILED (style: wrong), retrying with stronger prompt
  → Retry completed with stronger prompt
✓ Page "Titel 3" done
```

**Mit Safety Block:**
```
Generating page "Fotoalbum" (3 panels, ref: cover)
  → images.edit() failed, falling back: 400 Your request was rejected by the safety system
  → Safety block, retrying with sanitized prompt + generate-only
✓ Page "Fotoalbum" done
```

---

## ⚠️ Bekannte Probleme

### 1. Safety-Block bei sensiblen Szenen
**Symptom:** Cover oder bestimmte Seiten werden geblockt
**Lösung:** Sanitized prompt entfernt jetzt "photo", "album", "secret"
**Wenn weiterhin Problem:** Szene manuell umformulieren

### 2. Charaktere nicht 100% konsistent
**Symptom:** Papa sieht auf Seite 3 anders aus als auf Seite 1
**Grund:** gpt-image-2 interpretiert Referenzbild bei jedem Call leicht anders
**Langfristige Lösung:** Character Sheet (erst bei Tier 2 sinnvoll)

### 3. Geschwindigkeit
**Aktuell:** ~12 Minuten für 5 Seiten (Tier 1: 5 IPM)
**Mit Tier 2:** ~2-3 Minuten (50 IPM)
**Wann upgraden:** Sobald erste zahlende Kunden

---

## 💰 Kosten pro Comic

**Struktur:**
- GPT-4.1 (5 Momente): 5 × $0.004 = $0.02

**Cover:**
- gpt-image-2: $0.20

**Seiten:**
- gpt-image-2: 5 × $0.20 = $1.00
- Quality Checks: 5 × $0.005 = $0.025
- Retries (20% der Fälle): ~1 × $0.20 = $0.20

**Ending:**
- GPT-4.1: $0.002

**Gesamt: ~$1.45 pro Comic**
(vorher ohne Quality Score: ~$1.22)

---

## 📁 Alle Commits (heute)

```
30c0eff - Fix: Photo-Analyse präziser, Panel-Variation, Safety-Block
c02b657 - Docs: Update session-state mit Test-Ergebnissen
181333c - Feature: Quality Score + Auto-Retry + Neu illustrieren
d912934 - Docs: Implementation Summary
f1e273a - Fix: Neu illustrieren Sicherheit + Seite löschen
```

---

## 🎯 Nach Deployment

**Frontend/UX (nächste Session):**
1. UX/UI Redesign — Ruhigerer Wizard
2. Outfit-State Tracking — Kleidungs-Konsistenz
3. Weitere Frontend-Verbesserungen

**Später (nach Tier 2):**
4. Geschwindigkeit — OpenAI Tier 2 Upgrade
5. PDF-Export + Druckspezifikation
6. Seitenanzahl erhöhen (8-12 Seiten)

---

## ✅ Bereit zum Pushen!

```bash
git push origin main
```

Dann:
1. Railway Deploy abwarten
2. Supabase Constraint Fix (SUPABASE-FIX.sql)
3. Test durchführen
4. Frontend/UX Session starten

🚀
