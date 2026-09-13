import React, { useState, useEffect } from 'react';
import { Heart, Utensils, Activity, Sparkles, Play, Zap, ChevronLeft, ChevronRight, Book, LogOut, ShoppingBag, X } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './index.css';
import BattleScreen from './components/BattleScreen';
import ScannerScreen from './components/ScannerScreen';
import WikiScreen from './components/WikiScreen';
import AuthScreen from './components/AuthScreen';
import ShopScreen from './components/ShopScreen';
import TeamSelectScreen from './components/TeamSelectScreen';
import { ITEMS } from './engine/itemSystem';

import { SPECIES_EMOJI } from './engine/petData';

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
  const [currentScreen, setCurrentScreen] = useState<'home' | 'battle' | 'team_setup' | 'scanner' | 'wiki' | 'shop'>('home');
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('tamabi_user_id'));

  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [readiness, setReadiness] = useState(0);

  // Inventory Modal State
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'food' | 'toy' | 'medicine'>('food');

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
        .select(`*, species_base_stats(name, element)`)
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
    } else if (itemDef.type === 'toy') {
      newPet.happiness = Math.min(100, pet.happiness + itemDef.effectValue);
      // Playing reduces energy
      newPet.energy = Math.max(0, pet.energy - 10);
      newPet.hunger = Math.max(0, pet.hunger - 10);
    } else if (itemDef.type === 'medicine') {
      newPet.health = Math.min(100, pet.health + itemDef.effectValue);
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
      energy: newPet.energy
    }).eq('id', pet.id);
    
    await supabase.from('profiles').update({
      inventory: newInventory
    }).eq('id', profile.id);

    setInventoryModalOpen(false);
  };

  const openInventory = (type: 'food' | 'toy' | 'medicine') => {
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

  if (currentScreen === 'team_setup') {
    return (
      <TeamSelectScreen 
        playerPets={pets} 
        onBack={() => setCurrentScreen('home')}
        onStartBattle={(selectedIds) => {
          setSelectedPartyIds(selectedIds);
          setCurrentScreen('battle');
        }} 
      />
    );
  }

  if (currentScreen === 'battle') {
    return <BattleScreen playerId={currentUser} activePetIds={selectedPartyIds} onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'scanner') {
    return <ScannerScreen playerId={currentUser} onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'wiki') {
    return <WikiScreen playerPets={pets} onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'shop') {
    return (
      <ShopScreen 
        playerId={currentUser} 
        currentCoins={profile?.pet_coins || 0}
        onUpdateCoins={(newBalance) => setProfile(profile ? { ...profile, pet_coins: newBalance } : null)}
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
              <span style={{ fontSize: '0.8rem', color: '#feca57' }}>🪙 {profile.pet_coins}</span>
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
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" onClick={() => setCurrentScreen('shop')}>🎁 สุ่มกาชา (500 🪙)</button>
            <button className="btn" style={{ background: 'linear-gradient(135deg, #1dd1a1, #0fb9b1)' }} onClick={() => setCurrentScreen('scanner')}>📷 สแกน QR (ฟรี)</button>
          </div>
        </main>
      </div>
    );
  }

  const speciesName = pet.species_base_stats?.name || 'Unknown';
  const element = pet.species_base_stats?.element || 'Unknown';
  const emoji = SPECIES_EMOJI[speciesName] || '❓';

  // Filter inventory items based on current tab
  const availableItems = Object.keys(ITEMS).filter(itemId => ITEMS[itemId].type === inventoryFilter && profile.inventory && profile.inventory[itemId] > 0);

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
      <main className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
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
            width: '150px', height: '150px', 
            background: 'var(--bg-main)', 
            borderRadius: '50%', 
            border: '2px solid var(--stat-happiness)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)',
          }}>
            <span style={{ fontSize: '4rem' }}>{emoji}</span>
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
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Care Status</h3>
        
        <StatBar label="Happiness (ATK)" value={pet.happiness} colorVar="--stat-happiness" icon={Heart} />
        <StatBar label="Hunger (HP/DEF)" value={pet.hunger} colorVar="--stat-hunger" icon={Utensils} />
        <StatBar label="Health (SPD)" value={pet.health} colorVar="--stat-health" icon={Activity} />
        <StatBar label="Energy (Stamina)" value={pet.energy} colorVar="--stat-energy" icon={Zap} />

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
          <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center' }} onClick={() => openInventory('food')}>
            <Utensils size={18} /> Feed
          </button>
          <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #ff6b6b, #e84393)' }} onClick={() => openInventory('toy')}>
            <Heart size={18} /> Play
          </button>
          <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }} onClick={() => openInventory('medicine')}>
            <Activity size={18} /> Heal
          </button>
        </div>
      </section>

      {/* Bottom Navigation Area */}
      <nav style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('team_setup')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Play size={24} color="var(--primary-color)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Battle</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('scanner')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Sparkles size={24} color="var(--stat-health)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Scanner</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('shop')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <ShoppingBag size={24} color="#feca57" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Shop</span>
        </button>
        <button 
          className="glass-panel" 
          onClick={() => setCurrentScreen('wiki')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
        >
          <Book size={24} color="var(--stat-energy)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wiki</span>
        </button>
      </nav>

      {/* INVENTORY MODAL */}
      {inventoryModalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="glass-panel" style={{ margin: '1rem', padding: '1.5rem', animation: 'slide-up 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {inventoryFilter === 'food' ? <Utensils /> : inventoryFilter === 'toy' ? <Heart /> : <Activity />}
                คลังไอเทม ({inventoryFilter})
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
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{ITEMS[itemId].emoji}</div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{ITEMS[itemId].name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>มีอยู่: {profile.inventory[itemId]} ชิ้น</div>
                    <button 
                      className="btn" 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', justifyContent: 'center' }}
                      onClick={() => handleUseItem(itemId)}
                    >
                      ใช้งาน
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
