import { supabase } from '../lib/supabaseClient';
import { getRandomTrait } from './petData';

export interface ScanResult {
  success: boolean;
  message: string;
  pet?: any;
}

export async function processScanResult(qrCodeData: string, playerId: string): Promise<ScanResult> {
  try {
    // Validate the qrCodeData
    if (!qrCodeData || !qrCodeData.toUpperCase().includes('TAMABI')) {
      return { success: false, message: 'QR Code นี้ไม่สามารถใช้สแกนหามอนสเตอร์ได้' };
    }
    
    // Fetch all available species
    const { data: speciesList, error: speciesErr } = await supabase
      .from('species_base_stats')
      .select('*');
      
    if (speciesErr || !speciesList || speciesList.length === 0) {
      console.error("Species Fetch Error:", speciesErr);
      return { success: false, message: 'ไม่พบข้อมูลสายพันธุ์ในระบบ' };
    }

    // Randomly select one species
    const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];

    // 2. Mint (Insert) new pet into the database
    const trait = getRandomTrait();
    const newPetData = {
      owner_id: playerId,
      species_id: randomSpecies.id,
      name: `${randomSpecies.name}`,
      trait: trait,
      happiness: 50, // newly caught pets are neutral
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
      console.error("Pet Insert Error:", insertErr);
      return { success: false, message: 'ไม่สามารถจับสัตว์เลี้ยงได้ในขณะนี้' };
    }

    return { 
      success: true, 
      message: 'จับสัตว์เลี้ยงสำเร็จ!', 
      pet: insertedPet 
    };

  } catch (error) {
    console.error('Error processing scan:', error);
    return { success: false, message: 'เกิดข้อผิดพลาดของระบบ' };
  }
}
