# Kritische Fixes - Sofort
*Stand: 5. Mai 2026*

## 🚨 Problem 1: Cover-Regenerierung zeigt braune Seite

**Screenshot:** Cover ist komplett braun/schwarz, kein Bild

**Ursache:**
```tsx
// Frontend erwartet:
updateProject({ coverImageUrl: result.imageUrl });

// Backend gibt zurück:
res.json({ coverImageUrl: coverUrl || rawUrl });
```

**Mismatch:** `result.imageUrl` ist `undefined`, weil Backend `coverImageUrl` sendet!

**Fix:**
```tsx
updateProject({ coverImageUrl: result.coverImageUrl || result.imageUrl });
```

---

## 🚨 Problem 2: Position-Saving für PDF-Export kritisch

**Aus OPEN-TASKS.md:**
> Bubble-Positionen werden beim Drag-Ende in Store gespeichert
> **Kritisch für PDF-Export** - Positionen müssen persistent sein

**Aktueller Status:**
- ✅ Code implementiert
- ❌ Nicht getestet
- ❌ PDF-Export nutzt möglicherweise nicht die gespeicherten Positionen

**Was passieren muss:**
1. User verschiebt Bubble in Vorschau
2. Position wird in `chapter.panelPositions` gespeichert
3. **PDF-Export liest `panelPositions` aus Store**
4. PDF rendert Bubbles an gespeicherten Positionen

**Zu prüfen:**
- Werden Positionen wirklich gespeichert? (Console-Log checken)
- Nutzt PDF-Generator die gespeicherten Positionen?

**Datei zu prüfen:**
`backend-railway/src/lib/pdf-generator.js` - Zeile ~200-300

---

## 🚨 Problem 3: Panel-Rand inkonsistent (weiß vs. schwarz)

**Beobachtung:**
- Manchmal schwarzer Rand zwischen Panels
- Manchmal weißer Abstand zwischen Panels
- Inkonsistent und unprofessionell

**Ursache:**
Panels werden als SVG-Overlay gezeichnet:
```typescript
// sharp-compositor.ts
svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}"
  fill="none" stroke="#1A1410" stroke-width="4" rx="2"/>`;
```

**Problem:**
- `stroke-width="4"` = 4px schwarzer Rand
- Aber: Abstände zwischen Panels sind durch Layout definiert
- Cream Background (#F5EDE0) füllt Lücken
- **Resultat:** Manchmal schwarz, manchmal cream

**Lösung:**
Konsistenter schwarzer Rand überall:
```typescript
const border = 8; // Reduziert von 12 auf 8
// Und stroke-width konsistent halten
```

Oder: Weißer Rand überall:
```typescript
svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}"
  fill="white" stroke="#1A1410" stroke-width="2" rx="2"/>`;
// fill="white" statt fill="none"
```

---

## 🔧 Fixes in Reihenfolge

### Fix 1: Cover-Regenerierung (SOFORT)
**Datei:** `src/components/steps/Step5Preview.tsx`
**Zeile:** ~205
**Änderung:**
```tsx
updateProject({ coverImageUrl: result.coverImageUrl || result.imageUrl });
```

### Fix 2: Position-Saving testen (SOFORT)
**Test-Szenario:**
1. Comic öffnen
2. Bubble verschieben
3. Console: "✓ Saved X bubble positions for page Y"
4. Andere Seite öffnen
5. Zurück zur ersten Seite
6. **Erwartung:** Bubble an neuer Position

**Wenn fehlschlägt:**
- Store prüfen: `project.chapters[X].panelPositions`
- PDF-Generator prüfen: Nutzt er `panelPositions`?

### Fix 3: Panel-Rand konsistent (NACH Go-Live)
**Datei:** `src/lib/sharp-compositor.ts`
**Entscheidung nötig:**
- Option A: Schwarzer Rand überall (border reduzieren)
- Option B: Weißer Rand überall (fill="white")

---

## ⚠️ Cover-Regenerierung: Rollback-Strategie

**Problem:** Wenn Cover fehlschlägt → braune Seite

**Lösung:** Altes Cover behalten bei Fehler

```tsx
const handleRegenerateCover = async () => {
  if (!project) return;
  
  const oldCoverUrl = project.coverImageUrl; // Backup
  setRegeneratingCover(true);
  
  try {
    // ... API call ...
    const result = await res.json();
    
    if (result.coverImageUrl) {
      updateProject({ coverImageUrl: result.coverImageUrl });
      setCoverRegenNote("");
      toast.success("Cover neu generiert! 🎨");
    } else {
      // Kein neues Cover → altes behalten
      toast.error("Cover-Generierung fehlgeschlagen - altes Cover beibehalten");
    }
  } catch (e) {
    // Bei Fehler: altes Cover behalten
    console.error("Cover regeneration error:", e);
    toast.error("Fehler beim Cover-Neu-Generieren - altes Cover beibehalten");
    // updateProject({ coverImageUrl: oldCoverUrl }); // Nicht nötig, ist schon da
  } finally {
    setRegeneratingCover(false);
  }
};
```

---

## 📊 Priorität

1. **SOFORT:** Cover-Regenerierung Fix (5 Min)
2. **SOFORT:** Position-Saving testen (10 Min)
3. **NACH Go-Live:** Panel-Rand konsistent (30 Min)
