import { supabase } from '../lib/supabaseClient';

export interface GachaResult {
  success: boolean;
  message: string;
  pet?: any;
  newBalance?: number;
}

export async function rollGacha(playerId: string, cost: number): Promise<GachaResult> {
  try {
    // 1. Fetch current profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('pet_coins')
      .eq('id', playerId)
      .single();

    if (profileErr || !profile) {
      return { success: false, message: 'ไม่พบข้อมูลโปรไฟล์ผู้เล่น' };
    }

    // 2. Check balance
    if (profile.pet_coins < cost) {
      return { success: false, message: 'เหรียญไม่พอ! กรุณาไปต่อสู้เพื่อหาเหรียญเพิ่ม' };
    }

    // 3. Fetch all available species
    const { data: speciesList, error: speciesErr } = await supabase
      .from('species_base_stats')
      .select('*');

    if (speciesErr || !speciesList || speciesList.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลสายพันธุ์ในระบบ' };
    }

    // 4. Randomly pick a species
    const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];

    // 5. Deduct coins and Mint Pet (We should ideally do this in a Postgres RPC for atomicity, but frontend-driven is fine for prototype)
    const newBalance = profile.pet_coins - cost;
    
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ pet_coins: newBalance })
      .eq('id', playerId);

    if (updateErr) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการตัดเหรียญ' };
    }

    // Mint the new pet
    const newPetData = {
      owner_id: playerId,
      species_id: randomSpecies.id,
      name: randomSpecies.name,
      happiness: 50,
      hunger: 50,
      health: 100,
      energy: 100,
    };

    const { data: insertedPet, error: insertErr } = await supabase
      .from('pets')
      .insert(newPetData)
      .select('*, species_base_stats(name, element)')
      .single();

    if (insertErr) {
      // Rollback is skipped for simple prototype
      console.error("Gacha Insert Error:", insertErr);
      return { success: false, message: 'เกิดข้อผิดพลาดในการรับสัตว์เลี้ยง' };
    }

    return {
      success: true,
      message: 'ยินดีด้วย! คุณได้รับสัตว์เลี้ยงใหม่',
      pet: insertedPet,
      newBalance
    };

  } catch (error) {
    console.error('Error rolling gacha:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดของระบบ' };
  }
}
