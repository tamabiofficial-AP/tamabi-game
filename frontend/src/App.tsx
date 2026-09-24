import React, { useState, useEffect } from 'react';
import { Heart, Activity, Play, Settings, Map, ChevronRight, Zap, Target, BookOpen, Clock, Gift, Shield, Compass, Camera, Sparkles, Book, ShoppingBag, X, CheckCircle, Skull, Swords, LogOut, ChevronLeft, Utensils, Star } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './index.css';
import BattleScreen from './components/BattleScreen';
import ScannerScreen from './components/ScannerScreen';
import WikiScreen from './components/WikiScreen';
import AuthScreen from './components/AuthScreen';
import ShopScreen from './components/ShopScreen';
import TeamSelectScreen from './components/TeamSelectScreen';
import QuestScreen, { MOCK_QUESTS } from './components/QuestScreen';
import BossSelectScreen from './components/BossSelectScreen';
import type { BossDef } from './components/BossSelectScreen';
import BattleMenuScreen from './components/BattleMenuScreen';
import PvPArenaScreen from './components/PvPArenaScreen';
import { ITEMS } from './engine/itemSystem';

import { SPECIES_EMOJI, SPECIES_IMAGES, TRAITS } from './engine/petData';
import type { TraitName } from './engine/petData';

const COUPONS: Record<string, {name: string, emoji: string, id: string}> = {
  'coupon_33backyard_15': { id: 'coupon_33backyard_15', name: 'The 33 Backyard - ส่วนลด 15%', emoji: '☕' },
  'coupon_secretcafe_cake': { id: 'coupon_secretcafe_cake', name: 'Secret Cafe - ฟรีขนมเค้ก 1 ชิ้น', emoji: '🍰' },
  'coupon_nomongko_free': { id: 'coupon_nomongko_free', name: 'นมองโก๋ - ฟรีท็อปปิ้ง 1 อย่าง', emoji: '🧋' },
  'coupon_gacha_ticket': { id: 'coupon_gacha_ticket', name: 'ตั๋วสุ่มกาชาพิเศษ 1 ใบ', emoji: '🎟️' }
};

// Stat Bar Component
const StatBar = ({ label, value, colorVar, icon: Icon }: any) => (
  <div className="stat-bar-container" style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
        <Icon size={16} color={`var(${colorVar})`} /> {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{value}%</span>
    </div>
    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
      <div 
        style={{ 
          width: `${value}%`, 
          height: '100%', 
          background: `var(${colorVar})`,
          borderRadius: '4px',
          transition: 'width 0.5s ease-out'
        }} 
      />
    </div>
  </div>
);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'battle' | 'team_setup' | 'scanner' | 'wiki' | 'shop' | 'quest' | 'boss_select' | 'battle_menu' | 'pvp_arena'>('home');
  const [battleMode, setBattleMode] = useState<'pve' | 'boss' | 'pvp'>('pve');
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('tamabi_user_id'));

  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [selectedBoss, setSelectedBoss] = useState<BossDef | null>(null);
  const [readiness, setReadiness] = useState(0);
  const [targetQuestId, setTargetQuestId] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);

  // Inventory Modal State
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'food' | 'toy' | 'medicine' | 'coupon'>('food');

  const pet = pets[activePetIndex];

  // --- Fetch Data ---
  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      setIsLoading(true);
      
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser)
        .single();
        
      if (profileData) setProfile(profileData);

      // Fetch Pets
      const { data: petsData } = await supabase
        .from('pets')
        .select(`*, species_base_stats(name, element, base_hp, base_atk, base_def, base_spd)`)
        .eq('owner_id', currentUser)
        .order('created_at', { ascending: true });

      if (petsData && petsData.length > 0) setPets(petsData);

      setIsLoading(false);
    }
    
    // Only load data if we're on the home screen
    if (currentScreen === 'home' && currentUser) {
      loadData();
    }
  }, [currentScreen, currentUser]);

  useEffect(() => {
    if (pet) {
      const avg = (pet.happiness + pet.hunger + pet.health) / 3;
      setReadiness(Math.max(50, Math.round(avg)));
    }
  }, [pet]);

  const handleUseItem = async (itemId: string) => {
    if (!pet || !profile || !profile.inventory) return;
    
    const qty = profile.inventory[itemId] || 0;
    if (qty <= 0) return;

    const itemDef = ITEMS[itemId];
    if (!itemDef) return;

    // 1. Optimistic UI Update (Pet Stats)
    const newPets = [...pets];
    const newPet = { ...pet };
    
    if (itemDef.type === 'food') {
      newPet.hunger = Math.min(100, pet.hunger + itemDef.effectValue);
      // Food slightly restores energy too
      newPet.energy = Math.min(100, pet.energy + Math.floor(itemDef.effectValue / 2));
      newPet.bond = Math.min(100, (pet.bond || 0) + 1); // +1 Bond for feeding
    } else if (itemDef.type === 'toy') {
      newPet.happiness = Math.min(100, pet.happiness + itemDef.effectValue);
      // Playing reduces energy
      newPet.energy = Math.max(0, pet.energy - 10);
      newPet.hunger = Math.max(0, pet.hunger - 10);
      newPet.bond = Math.min(100, (pet.bond || 0) + 2); // +2 Bond for playing
    } else if (itemDef.type === 'medicine') {
      newPet.health = Math.min(100, pet.health + itemDef.effectValue);
      newPet.bond = Math.min(100, (pet.bond || 0) + 1); // +1 Bond for healing
    }
    
    newPets[activePetIndex] = newPet;
    setPets(newPets);

    // 2. Optimistic UI Update (Inventory)
    const newInventory = { ...profile.inventory, [itemId]: qty - 1 };
    setProfile({ ...profile, inventory: newInventory });

    // 3. DB Update
    await supabase.from('pets').update({
      hunger: newPet.hunger,
      happiness: newPet.happiness,
      health: newPet.health,
      energy: newPet.energy,
      bond: newPet.bond
    }).eq('id', pet.id);
    
    await supabase.from('profiles').update({
      inventory: newInventory
    }).eq('id', profile.id);

    setInventoryModalOpen(false);
  };

  const handleUseCoupon = async (couponId: string) => {
    if (!window.confirm(`ยืนยันการใช้คูปอง ${COUPONS[couponId].name}?\n\n(สำหรับให้พนักงานร้านค้ากดยืนยันเท่านั้น)`)) return;
    
    const currentInv = profile.inventory || {};
    const newInv = { ...currentInv, [couponId]: Math.max(0, (currentInv[couponId] || 1) - 1) };
    
    const { error } = await supabase.from('profiles').update({ inventory: newInv }).eq('id', profile.id);
    if (!error) {
      setProfile({ ...profile, inventory: newInv });
      alert('ใช้งานคูปองสำเร็จ! 🎉');
      if (newInv[couponId] === 0) setInventoryModalOpen(false);
    }
  };

  const openInventory = (type: 'food' | 'toy' | 'medicine' | 'coupon') => {
    setInventoryFilter(type);
    setInventoryModalOpen(true);
  };

  if (!currentUser) {
    return (
      <AuthScreen onLogin={(playerId) => {
        localStorage.setItem('tamabi_user_id', playerId);
        setCurrentUser(playerId);
      }} />
    );
  }

  if (currentScreen === 'battle_menu') {
    return (
      <BattleMenuScreen 
        onSelectMode={(mode) => {
          setBattleMode(mode);
          if (mode === 'pve') {
            setSelectedBoss(null);
            setCurrentScreen('team_setup');
          } else if (mode === 'boss') {
            setCurrentScreen('boss_select');
          } else if (mode === 'pvp') {
            setCurrentScreen('pvp_arena');
          }
        }}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'pvp_arena') {
    return (
      <PvPArenaScreen 
        playerId={currentUser}
        playerProfile={profile}
        onMatchFound={() => {
          setBattleMode('pvp');
          setCurrentScreen('team_setup');
        }}
        onBack={() => setCurrentScreen('battle_menu')}
      />
    );
  }

  if (currentScreen === 'boss_select') {
    return (
      <BossSelectScreen 
        onSelectBoss={(boss) => {
          setSelectedBoss(boss);
          setBattleMode('boss');
          setCurrentScreen('team_setup');
        }}
        onBack={() => setCurrentScreen('battle_menu')}
      />
    );
  }

  if (currentScreen === 'team_setup') {
    return (
      <TeamSelectScreen 
        playerPets={pets} 
        onBack={() => setCurrentScreen(battleMode === 'boss' ? 'boss_select' : battleMode === 'pvp' ? 'pvp_arena' : 'battle_menu')}
        bossMode={!!selectedBoss}
        onStartBattle={(selectedIds) => {
          setSelectedPartyIds(selectedIds);
          setCurrentScreen('battle');
        }} 
      />
    );
  }

  if (currentScreen === 'battle') {
    return (
      <BattleScreen 
        playerId={currentUser} 
        activePetIds={selectedPartyIds} 
        bossData={selectedBoss} 
        mode={battleMode}
        onBack={() => { 
          setSelectedBoss(null); 
          // After battle ends, force reload profile to see updated ELO/EXP
          supabase.from('profiles').select('*').eq('id', currentUser).single().then(({data}) => {
            if (data) setProfile(data);
          });
          setCurrentScreen('home'); 
        }} 
      />
    );
  }

  if (currentScreen === 'scanner') {
    return (
      <ScannerScreen 
        playerId={currentUser} 
        questTargetId={targetQuestId}
        onQuestComplete={async (questId) => {
          setCompletedQuests(prev => [...prev, questId]);
          
          const quest = MOCK_QUESTS.find(q => q.id === questId);
          if (quest && profile) {
            const rewards = quest.rewards;
            const currentInv = profile.inventory || {};
            const newInv = { 
              ...currentInv, 
              star_points: (currentInv.star_points || 0) + rewards.starPoints 
            };
            const newCoins = profile.pet_coins + rewards.coins;

            // Save to DB
            const { error: updateErr } = await supabase
              .from('profiles')
              .update({ pet_coins: newCoins, inventory: newInv })
              .eq('id', currentUser);

            if (!updateErr) {
              setProfile({ ...profile, pet_coins: newCoins, inventory: newInv });
            }
          }

          setTargetQuestId(null);
          setCurrentScreen('quest');
        }}
        onBack={() => {
          setTargetQuestId(null);
          setCurrentScreen(targetQuestId ? 'quest' : 'home');
        }} 
      />
    );
  }

  if (currentScreen === 'wiki') {
    return <WikiScreen playerPets={pets} onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'shop') {
    return (
      <ShopScreen 
        playerId={currentUser} 
        currentCoins={profile?.pet_coins || 0}
        inventory={profile?.inventory || {}}
        onUpdateCoins={(newBalance) => setProfile(profile ? { ...profile, pet_coins: newBalance } : null)}
        onUpdateInventory={(newInv) => setProfile(profile ? { ...profile, inventory: newInv } : null)}
        onBack={() => setCurrentScreen('home')} 
      />
    );
  }

  if (currentScreen === 'quest') {
    return (
      <QuestScreen 
        playerId={currentUser}
        completedQuests={completedQuests}
        onUpdateStats={(newCoins, newInventory) => setProfile(profile ? { ...profile, pet_coins: newCoins, inventory: newInventory } : null)}
        onOpenScanner={(questId) => {
          setTargetQuestId(questId);
          setCurrentScreen('scanner');
        }}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (isLoading || !profile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h2 style={{ marginBottom: '1rem' }}>🔄 Loading Tamabi...</h2>
        <p style={{ opacity: 0.7 }}>ดึงข้อมูลโปรไฟล์และสัตว์เลี้ยงจาก Supabase</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>{profile.username}</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#feca57' }}>⭐ {profile.inventory?.star_points || 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#ff9f43' }}>🪙 {profile.pet_coins}</span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => {
            localStorage.removeItem('tamabi_user_id');
            setCurrentUser(null);
            setProfile(null);
            setPets([]);
          }}>
            <LogOut size={20} color="#ff6b6b" />
          </button>
        </header>

        <main className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥚</div>
          <h2>ยังไม่มีมอนสเตอร์</h2>
          <p style={{ marginTop: '0.5rem', marginBottom: '2rem', opacity: 0.8 }}>ไปสุ่มกาชา หรือสแกน QR Code เพื่อรับมอนสเตอร์ตัวแรกกันเลย!</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '300px' }}>
            <button className="btn" style={{ flex: '1 1 45%', padding: '0.8rem 0.5rem', justifyContent: 'center' }} onClick={() => setCurrentScreen('shop')}>🎁 สุ่มกาชา</button>
            <button className="btn" style={{ flex: '1 1 45%', padding: '0.8rem 0.5rem', justifyContent: 'center', background: 'linear-gradient(135deg, #1dd1a1, #0fb9b1)' }} onClick={() => setCurrentScreen('scanner')}>📷 สแกน QR</button>
            <button className="btn" style={{ flex: '1 1 100%', padding: '0.8rem 0.5rem', justifyContent: 'center', background: 'var(--primary-color)' }} onClick={() => setCurrentScreen('quest')}>🎯 ทำเควสรับเหรียญเพิ่ม</button>
          </div>
        </main>
      </div>
    );
  }

  const speciesName = pet.species_base_stats?.name || 'Unknown';
  const element = pet.species_base_stats?.element || 'Unknown';
  const emoji = SPECIES_EMOJI[speciesName] || '❓';

  // Compute combat stats with trait bonus
  const s = pet.species_base_stats || {};
  const traitDef = TRAITS[(pet.trait as TraitName) || 'Normal'] || TRAITS['Normal'];
  
  // Model D: Care = Power
  const readinessValue = ((pet.hunger || 0) + (pet.happiness || 0) + (pet.health || 0)) / 3; // 0-100
  const eff_multiplier = Math.max(0.5, readinessValue / 100); // 50% min cap
  
  const combatHP = Math.round((s.base_hp || 0) * eff_multiplier) || 1;
  const combatATK = Math.round((s.base_atk || 0) * eff_multiplier * traitDef.bonusAtk) || 1;
  const combatDEF = Math.round((s.base_def || 0) * eff_multiplier * traitDef.bonusDef) || 1;
  const combatSPD = Math.round((s.base_spd || 0) * eff_multiplier * traitDef.bonusSpd) || 1;

  // Filter inventory items based on current tab
  const availableItems = inventoryFilter === 'coupon'
    ? Object.keys(COUPONS).filter(itemId => profile.inventory && profile.inventory[itemId] > 0)
    : Object.keys(ITEMS).filter(itemId => ITEMS[itemId].type === inventoryFilter && profile.inventory && profile.inventory[itemId] > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header / Top Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem' }}>{profile.username}</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#feca57' }}>🪙 {profile.pet_coins}</span>
            <span style={{ fontSize: '0.8rem', color: '#5f27cd' }}>⭐ {profile.star_points}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-icon" onClick={() => {
            localStorage.removeItem('tamabi_user_id');
            setCurrentUser(null);
            setProfile(null);
            setPets([]);
          }}>
            <LogOut size={20} color="#ff6b6b" />
          </button>
        </div>
      </header>

      {/* Main Pet Display Area */}
      <main className="glass-panel" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', width: '200px', height: '200px', 
          background: 'radial-gradient(circle, rgba(255, 107, 107, 0.2) 0%, rgba(0,0,0,0) 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0
        }} />
        
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1 }}>
          Readiness: <strong style={{ color: readiness >= 80 ? 'var(--stat-health)' : 'var(--stat-hunger)' }}>{readiness}%</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', zIndex: 1 }}>
          <button 
            className="btn-icon" 
            onClick={() => setActivePetIndex(prev => Math.max(0, prev - 1))}
            disabled={activePetIndex === 0}
            style={{ opacity: activePetIndex === 0 ? 0.3 : 1, padding: '0.5rem' }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="animate-float" style={{ 
            width: '180px', height: '180px', 
            background: 'var(--bg-main)', 
            borderRadius: '50%', 
            border: '3px solid var(--stat-happiness)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(255, 107, 107, 0.4)',
            overflow: 'hidden',
            padding: '10px'
          }}>
            <img 
              src={SPECIES_IMAGES[speciesName] || '/assets/pets/dragon.jpg'} 
              alt={speciesName}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
            />
          </div>

          <button 
            className="btn-icon" 
            onClick={() => setActivePetIndex(prev => Math.min(pets.length - 1, prev + 1))}
            disabled={activePetIndex === pets.length - 1}
            style={{ opacity: activePetIndex === pets.length - 1 ? 0.3 : 1, padding: '0.5rem' }}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', zIndex: 1 }}>
          {pets.map((_, idx) => (
            <div key={idx} style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: idx === activePetIndex ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        <h1 style={{ zIndex: 1, textAlign: 'center' }}>{pet.name}</h1>
        <p style={{ zIndex: 1, textTransform: 'capitalize' }}>{speciesName} • {element}</p>
        <span style={{ zIndex: 1, marginTop: '0.5rem', padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.2)' }}>
          Trait: {pet.trait || 'Normal'}
        </span>
      </main>

      {/* Care Dashboard */}
      <section className="glass-panel" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Care Status</h3>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            ⚔️ Readiness: <strong style={{ color: readinessValue >= 80 ? '#1dd1a1' : readinessValue >= 50 ? '#feca57' : '#ff6b6b' }}>{Math.round(readinessValue)}%</strong>
          </div>
        </div>
        
        <StatBar label="Happiness" value={pet.happiness} colorVar="--stat-happiness" icon={Heart} />
        <StatBar label="Hunger" value={pet.hunger} colorVar="--stat-hunger" icon={Utensils} />
        <StatBar label="Health" value={pet.health} colorVar="--stat-health" icon={Activity} />
        <StatBar label="Energy" value={pet.energy} colorVar="--stat-energy" icon={Zap} />
        
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem' }}>
          <StatBar label="Bond (Skill Unlock)" value={pet.bond || 0} colorVar="--accent-color" icon={Sparkles} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
            {(pet.bond || 0) < 40 ? `🔒 สกิล 2 ปลดล็อคที่ 40` : (pet.bond || 0) < 80 ? `🔒 ไม้ตายปลดล็อคที่ 80` : `✨ ปลดล็อคครบแล้ว`}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="btn" style={{ flex: '1 1 30%', padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center' }} onClick={() => openInventory('food')}>
            <Utensils size={18} /> Feed
          </button>
          <button className="btn" style={{ flex: '1 1 30%', padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #ff6b6b, #e84393)' }} onClick={() => openInventory('toy')}>
            <Heart size={18} /> Play
          </button>
          <button className="btn" style={{ flex: '1 1 30%', padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }} onClick={() => openInventory('medicine')}>
            <Activity size={18} /> Heal
          </button>
          <button className="btn" style={{ flex: '1 1 100%', padding: '0.8rem', fontSize: '1rem', justifyContent: 'center', background: 'linear-gradient(135deg, #feca57, #ff9f43)', color: '#000' }} onClick={() => openInventory('coupon')}>
            <Star size={18} /> My Coupons (คูปองส่วนลด)
          </button>
        </div>
      </section>

      {/* Combat Stats (with Trait bonus) */}
      <section className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ marginBottom: '0.8rem', fontSize: '1rem' }}>⚔️ Combat Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.8rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>❤️ HP</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{combatHP}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.8rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⚔️ ATK</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: traitDef.bonusAtk > 1 ? '#1dd1a1' : traitDef.bonusAtk < 1 ? '#ff6b6b' : 'inherit' }}>
              {combatATK}
              {traitDef.bonusAtk > 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#1dd1a1' }}>(+{Math.round((traitDef.bonusAtk - 1) * 100)}%)</span>}
              {traitDef.bonusAtk < 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#ff6b6b' }}>({Math.round((traitDef.bonusAtk - 1) * 100)}%)</span>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.8rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🛡️ DEF</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: traitDef.bonusDef > 1 ? '#1dd1a1' : traitDef.bonusDef < 1 ? '#ff6b6b' : 'inherit' }}>
              {combatDEF}
              {traitDef.bonusDef > 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#1dd1a1' }}>(+{Math.round((traitDef.bonusDef - 1) * 100)}%)</span>}
              {traitDef.bonusDef < 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#ff6b6b' }}>({Math.round((traitDef.bonusDef - 1) * 100)}%)</span>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.8rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>💨 SPD</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: traitDef.bonusSpd > 1 ? '#1dd1a1' : traitDef.bonusSpd < 1 ? '#ff6b6b' : 'inherit' }}>
              {combatSPD}
              {traitDef.bonusSpd > 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#1dd1a1' }}>(+{Math.round((traitDef.bonusSpd - 1) * 100)}%)</span>}
              {traitDef.bonusSpd < 1 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: '#ff6b6b' }}>({Math.round((traitDef.bonusSpd - 1) * 100)}%)</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          🧠 Trait: <strong style={{ color: 'var(--accent-color)' }}>{pet.trait || 'Normal'}</strong>
          {traitDef.name !== 'Normal' && <span> — {traitDef.description}</span>}
        </div>
      </section>

      {/* Bottom Navigation Area */}
      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('battle_menu')}
          style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem 0.4rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Swords size={20} color="#ff6b6b" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Battle</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('quest')}
          style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem 0.4rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Target size={20} color="#1dd1a1" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Quest</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('scanner')}
          style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem 0.4rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Sparkles size={20} color="var(--stat-health)" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Scan</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('shop')}
          style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem 0.4rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <ShoppingBag size={20} color="#feca57" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Shop</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('wiki')}
          style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem 0.4rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Book size={20} color="var(--stat-energy)" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Wiki</span>
        </button>
      </nav>

      {/* INVENTORY MODAL */}
      {inventoryModalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="glass-panel" style={{ margin: '1rem', padding: '1.5rem', animation: 'slide-up 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {inventoryFilter === 'food' ? <Utensils /> : inventoryFilter === 'toy' ? <Heart /> : inventoryFilter === 'coupon' ? <Star /> : <Activity />}
                {inventoryFilter === 'coupon' ? 'คูปองของฉัน' : `คลังไอเทม (${inventoryFilter})`}
              </h3>
              <button className="btn-icon" onClick={() => setInventoryModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {availableItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <p>คุณไม่มีไอเทมประเภทนี้เลย</p>
                <button className="btn" style={{ marginTop: '1rem', background: '#feca57', color: 'black' }} onClick={() => { setInventoryModalOpen(false); setCurrentScreen('shop'); }}>
                  ไปซื้อที่ร้านค้า
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxHeight: '40vh', overflowY: 'auto' }}>
                {availableItems.map(itemId => (
                  <div key={itemId} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{inventoryFilter === 'coupon' ? COUPONS[itemId].emoji : ITEMS[itemId].emoji}</div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{inventoryFilter === 'coupon' ? COUPONS[itemId].name : ITEMS[itemId].name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>มีอยู่: {profile.inventory[itemId]} ชิ้น</div>
                    <button 
                      className="btn" 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center', background: inventoryFilter === 'coupon' ? '#ff6b6b' : 'var(--primary-color)', color: inventoryFilter === 'coupon' ? '#fff' : 'inherit' }}
                      onClick={() => inventoryFilter === 'coupon' ? handleUseCoupon(itemId) : handleUseItem(itemId)}
                    >
                      {inventoryFilter === 'coupon' ? 'ใช้คูปอง (Staff)' : 'ใช้งาน'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
