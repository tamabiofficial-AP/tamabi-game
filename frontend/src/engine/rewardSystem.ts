import { supabase } from '../lib/supabaseClient';
import type { PetUnit } from './battleEngine';

export interface BattleReward {
  coins: number;
  energyCost: number;
  happinessCost: number;
  starPoints?: number;
  couponId?: string;
  eloChange?: number;
  newElo?: number;
  expGained?: number;
}

export async function processBattleResult(
  result: 'victory' | 'defeat',
  playerId: string,
  playerUnits: PetUnit[],
  customRewards?: { coins?: number; starPoints?: number; couponId?: string },
  mode: 'pve' | 'boss' | 'pvp' = 'pve'
): Promise<BattleReward | null> {
  try {
    // 1. Calculate Rewards & Costs
    const isWin = result === 'victory';
    
    // Default rewards (PvE / Boss)
    let coinsReward = isWin ? (customRewards?.coins ?? 50) : 10;
    let eloChange = 0;
    let expGained = 0;

    // PvP Mode specific logic
    if (mode === 'pvp') {
      coinsReward = 0; // PvP gives NO coins
      eloChange = isWin ? 25 : -15; // +25 for win, -15 for lose
      expGained = isWin ? 50 : 15;
    } else {
      // PvE / Boss give some EXP too
      expGained = isWin ? 20 : 5;
    }

    const energyCost = 20; // Every battle costs 20 energy
    const happinessCost = isWin ? 5 : 15; // Losing makes pets more unhappy

    let newElo = 1000; // default fallback

    // 2. Update Profile (Add Coins, Update Inventory, Update ELO)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('pet_coins, inventory, pvp_rating')
      .eq('id', playerId)
      .single();

    if (profileErr) console.error("Profile Fetch Error:", profileErr);

    if (profile) {
      let newInventory = profile.inventory || {};
      
      if (isWin && customRewards) {
        if (customRewards.starPoints) {
          newInventory = { ...newInventory, star_points: (newInventory.star_points || 0) + customRewards.starPoints };
        }
        if (customRewards.couponId) {
          newInventory = { ...newInventory, [customRewards.couponId]: (newInventory[customRewards.couponId] || 0) + 1 };
        }
      }

      newElo = Math.max(0, (profile.pvp_rating || 1000) + eloChange);

      const { error: updateProfileErr } = await supabase
        .from('profiles')
        .update({ 
          pet_coins: profile.pet_coins + coinsReward,
          inventory: newInventory,
          pvp_rating: newElo
        })
        .eq('id', playerId);
      if (updateProfileErr) console.error("Profile Update Error:", updateProfileErr);
    }

    // 3. Update Pets (Deduct Energy & Happiness, Add EXP)
    for (const unit of playerUnits) {
      const { data: pet, error: petErr } = await supabase
        .from('pets')
        .select('energy, happiness, battle_exp, level')
        .eq('id', unit.id)
        .single();

      if (petErr) console.error("Pet Fetch Error:", petErr);

      if (pet) {
        const currentExp = pet.battle_exp || 0;
        const currentLevel = pet.level || 1;
        const totalExp = currentExp + expGained;
        
        // Simple level up formula: level * 100 exp needed
        let newLevel = currentLevel;
        let remainingExp = totalExp;
        while (remainingExp >= newLevel * 100) {
          remainingExp -= newLevel * 100;
          newLevel++;
        }

        const { error: updatePetErr } = await supabase
          .from('pets')
          .update({
            energy: Math.max(0, pet.energy - energyCost),
            happiness: Math.max(0, pet.happiness - happinessCost),
            battle_exp: remainingExp,
            level: newLevel
          })
          .eq('id', unit.id);
        if (updatePetErr) console.error("Pet Update Error:", updatePetErr);
      }
    }

    return { 
      coins: coinsReward, 
      energyCost, 
      happinessCost,
      starPoints: isWin ? customRewards?.starPoints : undefined,
      couponId: isWin ? customRewards?.couponId : undefined,
      eloChange: mode === 'pvp' ? eloChange : undefined,
      newElo: mode === 'pvp' ? newElo : undefined,
      expGained
    };
  } catch (error) {
    console.error('Error processing battle results:', error);
    return null;
  }
}
