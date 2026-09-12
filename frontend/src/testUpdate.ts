import { supabase } from './lib/supabaseClient.js';

async function testUpdate() {
  const PLAYER_ID = '00000000-0000-0000-0000-000000000000';
  
  console.log("Fetching profile...");
  const { data: profile, error: fetchErr } = await supabase.from('profiles').select('*').eq('id', PLAYER_ID).single();
  console.log("Profile:", profile, "Error:", fetchErr);
  
  if (profile) {
    console.log("Updating profile...");
    const { data: updated, error: updateErr } = await supabase.from('profiles').update({ pet_coins: profile.pet_coins + 10 }).eq('id', PLAYER_ID).select();
    console.log("Updated:", updated, "Error:", updateErr);
  }
}

testUpdate();
