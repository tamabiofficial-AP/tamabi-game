import { supabase } from '../lib/supabaseClient';
import type { PetUnit } from './battleEngine';

export interface BattleReward {
  coins: number;
  energyCost: number;
  happinessCost: number;
  starPoints?: number;
  couponId?: string;
}

export async function processBattleResult(
  result: 'victory' | 'defeat',
  playerId: string,
  playerUnits: PetUnit[],
  customRewards?: { coins?: number; starPoints?: number; couponId?: string }
): Promise<BattleReward | null> {
  try {
    // 1. Calculate Rewards & Costs
    const coinsReward = result === 'victory' ? (customRewards?.coins ?? 50) : 10;
    const energyCost = 20; // Every battle costs 20 energy
    const happinessCost = result === 'victory' ? 5 : 15; // Losing makes pets more unhappy

    // 2. Update Profile (Add Coins & Custom Rewards)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('pet_coins, inventory')
      .eq('id', playerId)
      .single();

    if (profileErr) console.error("Profile Fetch Error:", profileErr);

    if (profile) {
      let newInventory = profile.inventory || {};
      
      if (result === 'victory' && customRewards) {
        if (customRewards.starPoints) {
          newInventory = { ...newInventory, star_points: (newInventory.star_points || 0) + customRewards.starPoints };
        }
        if (customRewards.couponId) {
          newInventory = { ...newInventory, [customRewards.couponId]: (newInventory[customRewards.couponId] || 0) + 1 };
        }
      }

      const { error: updateProfileErr } = await supabase
        .from('profiles')
        .update({ 
          pet_coins: profile.pet_coins + coinsReward,
          inventory: newInventory
        })
        .eq('id', playerId);
      if (updateProfileErr) console.error("Profile Update Error:", updateProfileErr);
    }

    // 3. Update Pets (Deduct Energy & Happiness)
    for (const unit of playerUnits) {
      const { data: pet, error: petErr } = await supabase
        .from('pets')
        .select('energy, happiness')
        .eq('id', unit.id)
        .single();

      if (petErr) console.error("Pet Fetch Error:", petErr);

      if (pet) {
        const { error: updatePetErr } = await supabase
          .from('pets')
          .update({
            energy: Math.max(0, pet.energy - energyCost),
            happiness: Math.max(0, pet.happiness - happinessCost)
          })
          .eq('id', unit.id);
        if (updatePetErr) console.error("Pet Update Error:", updatePetErr);
      }
    }

    return { 
      coins: coinsReward, 
      energyCost, 
      happinessCost,
      starPoints: result === 'victory' ? customRewards?.starPoints : undefined,
      couponId: result === 'victory' ? customRewards?.couponId : undefined
    };
  } catch (error) {
    console.error('Error processing battle results:', error);
    return null;
  }
}
