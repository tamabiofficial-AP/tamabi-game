import { supabase } from '../lib/supabaseClient';
import { getRandomTrait } from './petData';

export interface ScanResult {
  success: boolean;
  message: string;
  pet?: any;
}

export async function processScanResult(qrCodeData: string, playerId: string, isQuestMode: boolean = false): Promise<ScanResult> {
  try {
    if (!qrCodeData || !qrCodeData.toUpperCase().includes('TAMABI')) {
      return { success: false, message: 'QR Code นี้ไม่สามารถใช้สแกนในเกมนี้ได้' };
    }
    
    // 1. Handle Quest QR Codes (e.g. TAMABI_QUEST_q_cafe_33)
    if (qrCodeData.startsWith('TAMABI_QUEST_')) {
      if (!isQuestMode) {
        return { success: false, message: 'กรุณารับเควสจากหน้าต่าง Quest ก่อนทำการเช็คอิน' };
      }
      // The Quest UI will handle the reward giving, here we just return success
      // and the quest ID for the UI to process
      const questId = qrCodeData.replace('TAMABI_QUEST_', '');
      return {
        success: true,
        message: 'QUEST_COMPLETED',
        pet: { id: questId, isQuest: true } // Hacky way to pass questId
      };
    } else {
      if (isQuestMode) {
        return { success: false, message: 'คุณสแกน QR Code ผิดประเภท! กรุณาสแกน QR Code ประจำสถานที่เควส' };
      }
    }

    // 2. Handle Catch Pet QR Codes (e.g. TAMABI_CATCH_RANDOM)
    const { data: speciesList, error: speciesErr } = await supabase
      .from('species_base_stats')
      .select('*');
      
    if (speciesErr || !speciesList || speciesList.length === 0) {
      console.error("Species Fetch Error:", speciesErr);
      return { success: false, message: 'ไม่พบข้อมูลสายพันธุ์ในระบบ' };
    }

    const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
    const trait = getRandomTrait();
    const newPetData = {
      owner_id: playerId,
      species_id: randomSpecies.id,
      name: `${randomSpecies.name}`,
      trait: trait,
      happiness: 50,
      hunger: 50,
      health: 100,
      energy: 100,
      level: 1,
      battle_exp: 0
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
