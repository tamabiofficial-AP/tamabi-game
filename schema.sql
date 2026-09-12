-- Tamabi Phase 1 Database Schema

-- 1. Profiles Table (Users and Currencies)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    pet_coins INTEGER DEFAULT 0 NOT NULL,
    star_points INTEGER DEFAULT 0 NOT NULL,
    gems INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Species Base Stats Table
CREATE TABLE species_base_stats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    element VARCHAR(20) NOT NULL, -- Fire, Water, Earth, Nature, Light, Dark
    base_hp INTEGER NOT NULL,
    base_atk INTEGER NOT NULL,
    base_def INTEGER NOT NULL,
    base_spd INTEGER NOT NULL,
    description TEXT
);

-- 3. Pets Table (Core Pet Data and Care Stats)
CREATE TABLE pets (
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

-- 4. Pet Traits Table (3 Traits per Pet)
CREATE TABLE pet_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    trait_type VARCHAR(20) NOT NULL, -- INNATE, DEVELOPED, MASTERED
    trait_name VARCHAR(50) NOT NULL, -- e.g., 'Brave', 'Lazy', 'Genius'
    UNIQUE(pet_id, trait_type)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_base_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_traits ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Users can read/write their own data)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view species" ON species_base_stats FOR SELECT USING (true);

CREATE POLICY "Users can view own pets" ON pets FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own pets" ON pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own pets" ON pets FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own pet traits" ON pet_traits FOR SELECT USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_traits.pet_id AND pets.owner_id = auth.uid())
);
