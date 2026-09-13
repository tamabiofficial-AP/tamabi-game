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
    trait VARCHAR(30) DEFAULT 'Normal' NOT NULL,
    
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

-- 5. Insert Base Species Data (24 Species, 4 for each element)
-- Make sure to clear old data if re-running
TRUNCATE TABLE species_base_stats CASCADE;
ALTER SEQUENCE species_base_stats_id_seq RESTART WITH 1;

INSERT INTO species_base_stats (name, element, base_hp, base_atk, base_def, base_spd, description) VALUES
-- Fire (ATK focused)
('Dragon', 'fire', 120, 30, 15, 10, 'มังกรเพลิงผู้เกรี้ยวกราด พลังโจมตีรุนแรง'),
('Phoenix', 'fire', 100, 25, 10, 20, 'วิหคเพลิงที่คืนชีพจากเถ้าถ่าน โจมตีและหลบหลีกได้ดี'),
('Fox', 'fire', 90, 22, 10, 25, 'จิ้งจอกเก้าหางพ่นไฟ ปราดเปรียวและดุดัน'),
('Lion', 'fire', 140, 28, 18, 12, 'ราชสีห์เพลิงผู้สง่างาม พลังทำลายล้างสูง'),
-- Water (Balanced / HP focused)
('Turtle', 'water', 150, 15, 30, 5, 'เต่าวารี เกราะหนาทนทานต่อทุกการโจมตี'),
('Shark', 'water', 110, 25, 15, 18, 'ฉลามนักล่า ดุร้ายและกัดเจ็บมาก'),
('Penguin', 'water', 100, 18, 20, 15, 'เพนกวินน้ำแข็ง น่ารักแต่ถึกทน'),
('Dolphin', 'water', 120, 20, 15, 22, 'โลมาแสนรู้ พลิ้วไหวและโจมตีต่อเนื่อง'),
-- Earth (DEF focused)
('Bear', 'earth', 180, 20, 25, 5, 'หมีภูเขา เลือดเยอะและอึดทน'),
('Golem', 'earth', 200, 15, 35, 2, 'หินผามีชีวิต พลังป้องกันสูงสุด'),
('Rhino', 'earth', 160, 22, 28, 8, 'แรดหินชนแหลก พุ่งชนทะลวงเกราะ'),
('Mole', 'earth', 90, 18, 20, 15, 'ตุ่นนักขุด มุดดินหลบการโจมตีได้ดี'),
-- Wind (SPD focused)
('Eagle', 'wind', 90, 22, 10, 30, 'นกอินทรีวายุ โจมตีรวดเร็วดั่งสายลม'),
('Falcon', 'wind', 80, 25, 8, 35, 'เหยี่ยวเวหา รวดเร็วที่สุดในหมู่นก'),
('Bat', 'wind', 70, 20, 12, 28, 'ค้างคาวดูดเลือด ดูดพลังชีวิตศัตรู'),
('Butterfly', 'wind', 60, 15, 8, 40, 'ผีเสื้อพายุ พลิ้วไหวจนโจมตียาก'),
-- Light (Balanced, Magic)
('Unicorn', 'light', 130, 20, 20, 20, 'ม้ามีเขาแห่งแสงสว่าง สมดุลในทุกด้าน'),
('Owl', 'light', 100, 25, 12, 18, 'นกฮูกนักปราชญ์ โจมตีด้วยแสงสว่าง'),
('Pegasus', 'light', 110, 22, 15, 25, 'ม้ามีปีก บินโฉบโจมตีจากฟากฟ้า'),
('Swan', 'light', 120, 18, 18, 22, 'หงส์ขาวผู้สง่างาม พลังเยียวยาสูง'),
-- Dark (High ATK/SPD, Low DEF)
('Snake', 'dark', 90, 28, 10, 25, 'งูพิษแห่งเงามืด โจมตีติดคริติคอลบ่อย'),
('Spider', 'dark', 100, 24, 15, 20, 'แมงมุมปีศาจ พ่นใยพิษรุนแรง'),
('Panther', 'dark', 110, 26, 12, 28, 'เสือดำนักฆ่า ซุ่มโจมตีในความมืด'),
('Crow', 'dark', 80, 22, 8, 32, 'อีกาแห่งลางร้าย รวดเร็วและอันตราย');

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
