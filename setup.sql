-- =========================================================
-- TAMABI PROTOTYPE SETUP SCRIPT
-- Copy and run this entire script in Supabase SQL Editor
-- =========================================================

-- 1. Profiles Table (Users and Currencies)
-- Note: Removed REFERENCES auth.users(id) temporarily for prototyping without Auth
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    pet_coins INTEGER DEFAULT 0 NOT NULL,
    star_points INTEGER DEFAULT 0 NOT NULL,
    gems INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Species Base Stats Table
CREATE TABLE IF NOT EXISTS species_base_stats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    element VARCHAR(20) NOT NULL, -- fire, water, earth, nature, light, dark
    base_hp INTEGER NOT NULL,
    base_atk INTEGER NOT NULL,
    base_def INTEGER NOT NULL,
    base_spd INTEGER NOT NULL,
    description TEXT
);

-- 3. Pets Table (Core Pet Data and Care Stats)
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species_base_stats(id),
    name VARCHAR(50) NOT NULL,
    
    -- Care Stats (0-100)
    happiness INTEGER DEFAULT 50 NOT NULL,
    hunger INTEGER DEFAULT 50 NOT NULL,
    health INTEGER DEFAULT 100 NOT NULL,
    energy INTEGER DEFAULT 100 NOT NULL,
    hygiene INTEGER DEFAULT 100 NOT NULL,
    aura INTEGER DEFAULT 0 NOT NULL, -- SP Exclusive Stat
    
    -- Progress Stats
    bond INTEGER DEFAULT 30 NOT NULL, -- Minimum 30
    mastery INTEGER DEFAULT 0 NOT NULL, -- Permanent Skill Unlock
    
    -- Metadata
    last_interaction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Temporarily disabled for easy prototype testing, enable later)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE species_base_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE pets DISABLE ROW LEVEL SECURITY;


-- ==========================================
-- LOGIC FUNCTIONS (RPC)
-- ==========================================

-- Calculate Battle Readiness
CREATE OR REPLACE FUNCTION get_pet_battle_stats(p_pet_id UUID)
RETURNS TABLE (
    hp INTEGER,
    atk INTEGER,
    def INTEGER,
    spd INTEGER,
    readiness_percentage INTEGER
) AS $$
DECLARE
    v_base_hp INTEGER;
    v_base_atk INTEGER;
    v_base_def INTEGER;
    v_base_spd INTEGER;
    v_happiness INTEGER;
    v_hunger INTEGER;
    v_health INTEGER;
    v_aura INTEGER;
    v_eff_hunger_pct FLOAT;
    v_eff_happiness_pct FLOAT;
    v_eff_health_pct FLOAT;
BEGIN
    SELECT 
        s.base_hp, s.base_atk, s.base_def, s.base_spd,
        p.happiness, p.hunger, p.health, p.aura
    INTO 
        v_base_hp, v_base_atk, v_base_def, v_base_spd,
        v_happiness, v_hunger, v_health, v_aura
    FROM pets p
    JOIN species_base_stats s ON p.species_id = s.id
    WHERE p.id = p_pet_id;

    v_eff_hunger_pct := GREATEST(50, v_hunger) / 100.0;
    v_eff_happiness_pct := GREATEST(50, v_happiness) / 100.0;
    v_eff_health_pct := GREATEST(50, v_health) / 100.0;

    hp := ROUND(v_base_hp * v_eff_hunger_pct);
    def := ROUND(v_base_def * v_eff_hunger_pct);
    atk := ROUND(v_base_atk * v_eff_happiness_pct);
    spd := ROUND(v_base_spd * v_eff_health_pct);
    readiness_percentage := ROUND((v_happiness + v_hunger + v_health) / 3.0);

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- SEED DATA (MOCK DATA FOR TESTING)
-- ==========================================

-- Clear old data if running multiple times
TRUNCATE TABLE pets CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE species_base_stats CASCADE;

-- Insert Species
INSERT INTO species_base_stats (id, name, element, base_hp, base_atk, base_def, base_spd, description) VALUES
(1, 'Dragon', 'fire', 500, 120, 60, 85, 'มังกรไฟโจมตีรุนแรง'),
(2, 'Eagle', 'nature', 380, 100, 40, 110, 'นกอินทรีความเร็วสูง'),
(3, 'Turtle', 'earth', 700, 70, 100, 50, 'เต่าดินถึกทน'),
(4, 'Snake', 'nature', 420, 110, 50, 95, 'งูพิษสายธรรมชาติ'),
(5, 'Bat', 'dark', 350, 130, 35, 120, 'ค้างคาวแห่งความมืด'),
(6, 'Wolf', 'water', 550, 90, 80, 70, 'หมาป่าวารี');

-- Insert Dummy Profiles
INSERT INTO profiles (id, username, pet_coins, star_points) VALUES 
('00000000-0000-0000-0000-000000000000', 'Player1', 1000, 50),
('11111111-1111-1111-1111-111111111111', 'EnemyBoss', 9999, 999);

-- Insert Dummy Pets (Player1)
INSERT INTO pets (id, owner_id, species_id, name, happiness, hunger, health, energy) VALUES 
('aaaa0001-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1, 'Ignis', 100, 100, 100, 100),
('aaaa0002-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 2, 'Gale', 100, 100, 100, 100),
('aaaa0003-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 3, 'Terra', 100, 100, 100, 100);

-- Insert Dummy Pets (EnemyBoss)
INSERT INTO pets (id, owner_id, species_id, name, happiness, hunger, health, energy) VALUES 
('bbbb0001-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 4, 'Venom', 100, 100, 100, 100),
('bbbb0002-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 5, 'Shadow', 100, 100, 100, 100),
('bbbb0003-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 6, 'Fenrir', 100, 100, 100, 100);

-- Update Sequence for species_base_stats to prevent future insert errors
SELECT setval('species_base_stats_id_seq', (SELECT MAX(id) FROM species_base_stats));
