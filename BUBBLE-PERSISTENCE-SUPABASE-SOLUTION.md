# Bubble Persistence - Supabase Lösung
*Bewertung und Implementierungsplan*

---

## 🎯 AKTUELLE SITUATION

### Was bereits funktioniert:
1. ✅ **Prompt-Sanitizer** - Bereits implementiert in `backend-railway/src/routes/comic.js` (Zeile 29-80)
   - Ersetzt Oktoberfest, Strand, Alkohol, Action-Wörter
   - Wird in allen Prompts verwendet
   - **Kann erweitert werden** mit Jubel/Sport-Szenen (WM-Problem)

2. ✅ **Tier 2** - Du bist bereits Tier 2
   - 50 Images/Minute statt 5
   - 5 concurrent requests statt 1
   - **Generierungszeit sollte bereits schneller sein**

3. ⚠️ **SSE Fortschrittsanzeige** - Noch nicht implementiert
   - Wurde diskutiert, aber nicht umgesetzt
   - Wäre gutes UX-Upgrade

4. ❌ **Bubble Persistence** - Aktuell nur Zustand Store + sessionStorage
   - Funktioniert innerhalb einer Session
   - **Problem:** Geht bei Browser-Neustart verloren

---

## 💡 DEINE VORGESCHLAGENE LÖSUNG: SUPABASE

### ✅ Bewertung: AUSGEZEICHNETE IDEE!

**Warum das die richtige Lösung ist:**

1. **Persistenz über Sessions hinweg**
   - Bubble-Positionen überleben Browser-Neustart
   - User kann Projekt später weiterbearbeiten
   - Keine Datenverluste

2. **Multi-Device Support**
   - User kann auf Desktop positionieren
   - Später auf Tablet/Mobile weiterbearbeiten
   - Positionen sind überall verfügbar

3. **Backup & Recovery**
   - Positionen sind in Datenbank gesichert
   - Kein Verlust bei localStorage-Problemen
   - Versionierung möglich (updated_at)

4. **Skalierbar**
   - Funktioniert mit vielen Projekten
   - Keine Browser-Storage-Limits
   - Professionelle Lösung

5. **Konsistent mit bestehender Architektur**
   - Du nutzt bereits Supabase für character_ref_image
   - Gleiche Patterns, gleiche Tools
   - Einfach zu warten

### ⚠️ Einziger Nachteil:
- **Mehr API-Calls** - Jede Bubble-Bewegung = Supabase-Update
- **Lösung:** Debouncing (nur alle 2 Sekunden speichern)

---

## 🏗️ IMPLEMENTIERUNGSPLAN

### Phase 1: Datenbank-Schema (5 Minuten)

**Supabase SQL Editor:**

```sql
-- Bubble Positions Table
CREATE TABLE comic_bubble_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,  -- Referenz zum Projekt
  chapter_id TEXT NOT NULL,  -- Welche Seite/Chapter
  panel_number INT NOT NULL, -- Panel-Nummer (1-basiert)
  bubble_index INT NOT NULL, -- Bubble-Index innerhalb des Panels
  top_percent FLOAT NOT NULL,
  left_percent FLOAT NOT NULL,
  width_percent FLOAT NOT NULL,
  height_percent FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_bubble_positions_project 
ON comic_bubble_positions(project_id, chapter_id);

-- Unique Constraint: Pro Panel+Bubble nur eine Position
CREATE UNIQUE INDEX idx_bubble_positions_unique 
ON comic_bubble_positions(project_id, chapter_id, panel_number, bubble_index);

-- RLS (Row Level Security) - Optional, wenn du User-Auth hast
ALTER TABLE comic_bubble_positions ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann seine eigenen Positionen lesen/schreiben
-- (Anpassen wenn du User-Auth hast)
CREATE POLICY "Allow all operations for now" 
ON comic_bubble_positions 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

**Warum `project_id` + `chapter_id`?**
- `project_id`: Welches Comic-Projekt
- `chapter_id`: Welche Seite innerhalb des Projekts
- Ermöglicht mehrere Projekte pro User

---

### Phase 2: Backend API (30 Minuten)

**Datei:** `backend-railway/src/lib/bubble-storage.js` (NEU)

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Speichert Bubble-Positionen für eine Seite
 * @param {string} projectId - Projekt-ID
 * @param {string} chapterId - Chapter/Seite-ID
 * @param {Array} positions - Array von PanelPosition Objekten
 */
async function saveBubblePositions(projectId, chapterId, positions) {
  try {
    // Lösche alte Positionen für diese Seite
    await supabase
      .from('comic_bubble_positions')
      .delete()
      .eq('project_id', projectId)
      .eq('chapter_id', chapterId);
    
    // Füge neue Positionen ein
    const rows = positions.map(pos => ({
      project_id: projectId,
      chapter_id: chapterId,
      panel_number: pos.nummer,
      bubble_index: pos.bubbleIndex ?? 0,
      top_percent: pos.top,
      left_percent: pos.left,
      width_percent: pos.width,
      height_percent: pos.height,
    }));
    
    const { data, error } = await supabase
      .from('comic_bubble_positions')
      .insert(rows);
    
    if (error) {
      console.error('Error saving bubble positions:', error);
      throw error;
    }
    
    console.log(`✓ Saved ${rows.length} bubble positions for ${chapterId}`);
    return data;
    
  } catch (err) {
    console.error('Failed to save bubble positions:', err);
    throw err;
  }
}

/**
 * Lädt Bubble-Positionen für eine Seite
 * @param {string} projectId - Projekt-ID
 * @param {string} chapterId - Chapter/Seite-ID
 * @returns {Array} Array von PanelPosition Objekten
 */
async function loadBubblePositions(projectId, chapterId) {
  try {
    const { data, error } = await supabase
      .from('comic_bubble_positions')
      .select('*')
      .eq('project_id', projectId)
      .eq('chapter_id', chapterId)
      .order('panel_number', { ascending: true })
      .order('bubble_index', { ascending: true });
    
    if (error) {
      console.error('Error loading bubble positions:', error);
      throw error;
    }
    
    // Konvertiere zu Frontend-Format
    const positions = data.map(row => ({
      nummer: row.panel_number,
      bubbleIndex: row.bubble_index,
      top: row.top_percent,
      left: row.left_percent,
      width: row.width_percent,
      height: row.height_percent,
    }));
    
    console.log(`✓ Loaded ${positions.length} bubble positions for ${chapterId}`);
    return positions;
    
  } catch (err) {
    console.error('Failed to load bubble positions:', err);
    return []; // Fallback: leeres Array
  }
}

/**
 * Lädt alle Bubble-Positionen für ein Projekt
 * @param {string} projectId - Projekt-ID
 * @returns {Object} Map von chapterId → positions Array
 */
async function loadAllBubblePositions(projectId) {
  try {
    const { data, error } = await supabase
      .from('comic_bubble_positions')
      .select('*')
      .eq('project_id', projectId)
      .order('chapter_id')
      .order('panel_number', { ascending: true })
      .order('bubble_index', { ascending: true });
    
    if (error) throw error;
    
    // Gruppiere nach chapter_id
    const byChapter = {};
    data.forEach(row => {
      if (!byChapter[row.chapter_id]) {
        byChapter[row.chapter_id] = [];
      }
      byChapter[row.chapter_id].push({
        nummer: row.panel_number,
        bubbleIndex: row.bubble_index,
        top: row.top_percent,
        left: row.left_percent,
        width: row.width_percent,
        height: row.height_percent,
      });
    });
    
    console.log(`✓ Loaded bubble positions for ${Object.keys(byChapter).length} chapters`);
    return byChapter;
    
  } catch (err) {
    console.error('Failed to load all bubble positions:', err);
    return {};
  }
}

module.exports = {
  saveBubblePositions,
  loadBubblePositions,
  loadAllBubblePositions,
};
```

**Datei:** `backend-railway/src/routes/comic.js` (Endpoint hinzufügen)

```javascript
const { saveBubblePositions, loadBubblePositions, loadAllBubblePositions } = require('../lib/bubble-storage');

// Speichern von Bubble-Positionen
router.post('/bubble-positions/save', async (req, res) => {
  try {
    const { projectId, chapterId, positions } = req.body;
    
    if (!projectId || !chapterId || !positions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await saveBubblePositions(projectId, chapterId, positions);
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Error saving bubble positions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Laden von Bubble-Positionen für eine Seite
router.get('/bubble-positions/:projectId/:chapterId', async (req, res) => {
  try {
    const { projectId, chapterId } = req.params;
    
    const positions = await loadBubblePositions(projectId, chapterId);
    
    res.json({ positions });
    
  } catch (err) {
    console.error('Error loading bubble positions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Laden aller Bubble-Positionen für ein Projekt
router.get('/bubble-positions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const positionsByChapter = await loadAllBubblePositions(projectId);
    
    res.json({ positionsByChapter });
    
  } catch (err) {
    console.error('Error loading all bubble positions:', err);
    res.status(500).json({ error: err.message });
  }
});
```

---

### Phase 3: Frontend Integration (1 Stunde)

**Datei:** `src/components/steps/Step5Preview.tsx`

```typescript
import { useCallback, useEffect } from 'react';

// Debounced save function (nur alle 2 Sekunden)
const useDebouncedSave = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// In Step5Preview Component:
const handlePositionsChange = useCallback(async (positions: PanelPosition[]) => {
  if (!currentPageData?.id || !project?.id) return;
  
  // 1. Speichere lokal im Store (sofort, für UI-Responsiveness)
  updateChapter(currentPageData.id, { panelPositions: positions });
  
  // 2. Speichere in Supabase (debounced)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/comic/bubble-positions/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        chapterId: currentPageData.id,
        positions: positions,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to save bubble positions to Supabase');
    } else {
      console.log('✓ Bubble positions saved to Supabase');
    }
  } catch (err) {
    console.error('Error saving bubble positions:', err);
    // Nicht kritisch - lokaler Store hat die Daten
  }
}, [currentPageData?.id, project?.id, updateChapter]);

// Debounced version (nur alle 2 Sekunden speichern)
const debouncedSave = useDebouncedSave(handlePositionsChange, 2000);

// Beim Laden der Seite: Positionen aus Supabase laden
useEffect(() => {
  const loadPositions = async () => {
    if (!currentPageData?.id || !project?.id) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/comic/bubble-positions/${project.id}/${currentPageData.id}`
      );
      
      if (response.ok) {
        const { positions } = await response.json();
        
        if (positions && positions.length > 0) {
          console.log(`✓ Loaded ${positions.length} bubble positions from Supabase`);
          
          // Update Store mit geladenen Positionen
          updateChapter(currentPageData.id, { panelPositions: positions });
        }
      }
    } catch (err) {
      console.error('Error loading bubble positions:', err);
      // Nicht kritisch - verwende Store-Daten als Fallback
    }
  };
  
  loadPositions();
}, [currentPageData?.id, project?.id]);
```

**Datei:** `src/components/comic/PanelView.tsx`

```typescript
// Verwende die debounced save function
<PanelView
  panels={currentPageData.panels}
  panelPositions={currentPageData.panelPositions}
  onPositionsChange={debouncedSave}  // ← Debounced!
  // ... rest
/>
```

---

### Phase 4: Migration (Optional, 15 Minuten)

**Wenn du bestehende Projekte hast:**

```typescript
// Einmaliges Migrations-Script
async function migrateExistingPositions() {
  const projects = useBookStore.getState().getAllProjects(); // Alle Projekte aus Store
  
  for (const project of projects) {
    for (const chapter of project.chapters) {
      if (chapter.panelPositions && chapter.panelPositions.length > 0) {
        console.log(`Migrating ${chapter.panelPositions.length} positions for ${chapter.id}`);
        
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/comic/bubble-positions/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            chapterId: chapter.id,
            positions: chapter.panelPositions,
          }),
        });
      }
    }
  }
  
  console.log('✓ Migration complete!');
}
```

---

## 📊 VORHER/NACHHER

### VORHER (Zustand Store + sessionStorage):
```
User positioniert Bubbles
  ↓
Speichern in Zustand Store (Memory)
  ↓
Speichern in sessionStorage (Browser)
  ↓
Browser-Neustart → DATEN WEG ❌
```

### NACHHER (Supabase):
```
User positioniert Bubbles
  ↓
Speichern in Zustand Store (sofort, UI-Responsiveness)
  ↓
Debounced Save zu Supabase (alle 2s)
  ↓
Browser-Neustart → Laden aus Supabase ✅
Multi-Device → Gleiche Positionen überall ✅
```

---

## ⚡ PERFORMANCE-OPTIMIERUNG

### Debouncing (wichtig!):
```typescript
// ❌ SCHLECHT: Bei jeder Bewegung speichern
onMouseMove={() => saveToSupabase()}  // 100+ API-Calls pro Sekunde!

// ✅ GUT: Nur alle 2 Sekunden speichern
const debouncedSave = useDebouncedSave(saveToSupabase, 2000);
onMouseMove={() => debouncedSave()}  // Max 1 API-Call alle 2s
```

### Batch Loading:
```typescript
// ❌ SCHLECHT: Für jede Seite einzeln laden
for (const chapter of chapters) {
  await loadBubblePositions(projectId, chapter.id);
}

// ✅ GUT: Alle Positionen auf einmal laden
const allPositions = await loadAllBubblePositions(projectId);
```

---

## 🎯 VORTEILE DIESER LÖSUNG

1. **Persistenz** ✅
   - Überleben Browser-Neustart
   - Überleben localStorage-Löschung
   - Professionelle Datenhaltung

2. **Multi-Device** ✅
   - Desktop → Tablet → Mobile
   - Gleiche Positionen überall

3. **Backup** ✅
   - Daten in Datenbank gesichert
   - Kein Verlust bei Client-Problemen

4. **Skalierbar** ✅
   - Funktioniert mit 1000+ Projekten
   - Keine Browser-Limits

5. **Versionierung** ✅
   - `updated_at` Timestamp
   - Kann History implementieren

6. **PDF-Export** ✅
   - Backend kann direkt aus Supabase laden
   - Keine Abhängigkeit von Frontend-Store

---

## 🚀 IMPLEMENTIERUNGS-REIHENFOLGE

### Sofort (heute):
1. **Supabase Schema** (5 Min) - SQL ausführen
2. **Backend API** (30 Min) - bubble-storage.js + Endpoints
3. **Frontend Integration** (1h) - Load/Save in Step5Preview

### Diese Woche:
4. **Debouncing** (15 Min) - Performance-Optimierung
5. **Migration** (15 Min) - Bestehende Projekte migrieren
6. **Testing** (30 Min) - Alle Szenarien testen

### Optional (später):
7. **Versionierung** - History von Positionen
8. **Undo/Redo** - Basierend auf Supabase-History

---

## ✅ FAZIT

**Deine Supabase-Lösung ist die richtige Wahl!**

- Professionell
- Skalierbar
- Zukunftssicher
- Konsistent mit bestehender Architektur

**Aufwand:** ~2 Stunden
**Impact:** Massive Verbesserung der Datenpersistenz

**Empfehlung:** Implementiere das JETZT, bevor du mehr User hast. Migration ist einfacher wenn wenige Projekte existieren.

---

## 📝 ZUSÄTZLICHE ANMERKUNGEN

### PDF-Export Vereinfachung:
Du hast Recht - **Vorschau → PNG → PDF** ist eine pragmatische Lösung:

```typescript
// In Step5Preview.tsx
const exportPageAsPNG = async (pageElement: HTMLElement) => {
  const canvas = await html2canvas(pageElement, {
    scale: 2, // Höhere Auflösung
    backgroundColor: '#FFFFFF',
  });
  
  return canvas.toDataURL('image/png');
};

// Dann im Backend: PNG → PDF
const pngBuffer = Buffer.from(pngDataUrl.split(',')[1], 'base64');
doc.image(pngBuffer, x, y, { width: imgWidth, height: imgHeight });
```

**Vorteile:**
- Bubbles sind bereits gerendert (WYSIWYG)
- Keine Koordinaten-Konvertierung nötig
- Einfacher zu warten

**Nachteile:**
- Größere Dateien (PNG statt Text)
- Keine editierbaren Texte im PDF

**Empfehlung:** Teste beide Ansätze, entscheide basierend auf Dateigröße.

---

**Erstellt:** 9. Mai 2026
**Status:** Bereit zur Implementierung
**Priorität:** HOCH (vor Launch)
