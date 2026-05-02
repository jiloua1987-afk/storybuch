-- ══════════════════════════════════════════════════════════════════════════════
-- MULTI-PERSON PHOTO MATCHING FIX
-- ══════════════════════════════════════════════════════════════════════════════
-- Problem: Wenn 2 Fotos hochgeladen werden (Sally + Jil), wird nur 1 verwendet
-- Lösung: Speichere für jeden Charakter sein spezifisches Foto
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add photo_url column to character_ref_image table
ALTER TABLE character_ref_image 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_char_ref_photo 
ON character_ref_image(project_id, character_name, photo_url);

-- 3. Comment for documentation
COMMENT ON COLUMN character_ref_image.photo_url IS 
'Individual photo URL for this specific character (Supabase storage URL)';

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ══════════════════════════════════════════════════════════════════════════════

-- Check if column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'character_ref_image'
AND column_name = 'photo_url';

-- Check existing data structure
SELECT * FROM character_ref_image LIMIT 1;
