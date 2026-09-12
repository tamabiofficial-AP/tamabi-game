-- Tamabi Phase 1: Core Game Logic (PostgreSQL Functions / RPCs)

-- ==========================================
-- 1. Function: Calculate Battle Readiness
-- ==========================================
-- This function calculates the effective battle stats for a given pet based on its Care Stats.
-- It ensures that stats never drop below 50% of the base stats (Safety net).

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
    -- Fetch Base Stats and current Care Stats
    SELECT 
        s.base_hp, s.base_atk, s.base_def, s.base_spd,
        p.happiness, p.hunger, p.health, p.aura
    INTO 
        v_base_hp, v_base_atk, v_base_def, v_base_spd,
        v_happiness, v_hunger, v_health, v_aura
    FROM pets p
    JOIN species_base_stats s ON p.species_id = s.id
    WHERE p.id = p_pet_id;

    -- Calculate Multipliers (Max of 50% floor or actual care stat)
    -- E.g. Hunger 20 -> Max(50, 20) / 100 = 0.5 multiplier
    -- E.g. Hunger 80 -> Max(50, 80) / 100 = 0.8 multiplier
    v_eff_hunger_pct := GREATEST(50, v_hunger) / 100.0;
    v_eff_happiness_pct := GREATEST(50, v_happiness) / 100.0;
    v_eff_health_pct := GREATEST(50, v_health) / 100.0;

    -- Apply Formulas
    -- Hunger -> HP and DEF
    hp := ROUND(v_base_hp * v_eff_hunger_pct);
    def := ROUND(v_base_def * v_eff_hunger_pct);
    
    -- Happiness -> ATK
    atk := ROUND(v_base_atk * v_eff_happiness_pct);
    
    -- Health -> SPD
    spd := ROUND(v_base_spd * v_eff_health_pct);
    
    -- Readiness Percentage (Display purposes)
    readiness_percentage := ROUND((v_happiness + v_hunger + v_health) / 3.0);

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. Function: Interact with Pet (Feed, Play, Clean)
-- ==========================================
-- Safely increments stats without exceeding 100.

CREATE OR REPLACE FUNCTION interact_with_pet(p_pet_id UUID, p_action VARCHAR)
RETURNS void AS $$
BEGIN
    IF p_action = 'feed' THEN
        UPDATE pets 
        SET hunger = LEAST(100, hunger + 20),
            last_interaction_time = NOW()
        WHERE id = p_pet_id AND owner_id = auth.uid();
        
    ELSIF p_action = 'play' THEN
        UPDATE pets 
        SET happiness = LEAST(100, happiness + 20),
            energy = GREATEST(0, energy - 10), -- Playing costs energy
            last_interaction_time = NOW()
        WHERE id = p_pet_id AND owner_id = auth.uid();
        
    ELSIF p_action = 'clean' THEN
        UPDATE pets 
        SET hygiene = 100,
            health = LEAST(100, health + 10), -- Being clean slightly improves health
            last_interaction_time = NOW()
        WHERE id = p_pet_id AND owner_id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 3. Function: Decay Care Stats Over Time
-- ==========================================
-- This function simulates time passing. Usually called via cron or before a battle/login.
-- It calculates hours passed since last interaction and applies decay rules.

CREATE OR REPLACE FUNCTION apply_care_decay(p_pet_id UUID)
RETURNS void AS $$
DECLARE
    v_hours_passed INT;
    v_bond INT;
    v_happiness_decay INT;
    v_hunger_decay INT;
BEGIN
    -- Calculate hours passed since last interaction
    SELECT EXTRACT(EPOCH FROM (NOW() - last_interaction_time)) / 3600, bond 
    INTO v_hours_passed, v_bond
    FROM pets WHERE id = p_pet_id;

    -- Only decay if at least 1 hour has passed
    IF v_hours_passed >= 1 THEN
        -- Default decay rates
        v_hunger_decay := v_hours_passed * 4; -- Loses 4 hunger per hour
        
        -- Happiness decay depends on bond. High bond = slower decay.
        -- Base is 3 per hour. If bond is 100, reduces decay.
        v_happiness_decay := v_hours_passed * GREATEST(1, (3 - (v_bond / 50))); 

        UPDATE pets
        SET 
            hunger = GREATEST(0, hunger - v_hunger_decay),
            happiness = GREATEST(0, happiness - v_happiness_decay),
            last_interaction_time = NOW() -- Reset timer to prevent double decaying
        WHERE id = p_pet_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
