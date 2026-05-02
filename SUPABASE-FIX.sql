-- ============================================================================
-- SUPABASE FIX: Unique Constraint für character_ref_image
-- ============================================================================
-- Problem: saveCharacterRefs schlägt fehl mit "no unique or exclusion constraint"
-- Lösung: UNIQUE constraint auf (project_id, character_name) hinzufügen
-- ============================================================================

-- Schritt 1: Prüfe ob Constraint bereits existiert
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'character_ref_image' 
  AND constraint_type = 'UNIQUE';

-- Wenn leer (keine Zeilen zurück) → Schritt 2 ausführen
-- Wenn Zeile mit "character_ref_image_project_character_unique" → bereits gefixt!

-- Schritt 2: Constraint hinzufügen
ALTER TABLE character_ref_image
ADD CONSTRAINT character_ref_image_project_character_unique
UNIQUE (project_id, character_name);

-- Schritt 3: Verifizieren
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'character_ref_image' 
  AND constraint_type = 'UNIQUE';

-- Erwartetes Ergebnis:
-- constraint_name                                  | constraint_type
-- ------------------------------------------------|----------------
-- character_ref_image_project_character_unique    | UNIQUE

-- ============================================================================
-- ANLEITUNG:
-- 1. Gehe zu Supabase Dashboard: https://supabase.com/dashboard
-- 2. Wähle dein Projekt
-- 3. Klicke auf "SQL Editor" in der linken Sidebar
-- 4. Kopiere Schritt 1 + 2 + 3 in den Editor
-- 5. Klicke "Run" (oder Strg+Enter)
-- 6. Fertig! saveCharacterRefs funktioniert jetzt korrekt
-- ============================================================================
