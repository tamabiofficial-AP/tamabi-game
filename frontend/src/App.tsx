import React, { useState, useEffect } from 'react';
import { Heart, Utensils, Activity, Sparkles, Play, Info, Zap, ChevronLeft, ChevronRight, Book, LogOut, ShoppingBag } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './index.css';
import BattleScreen from './components/BattleScreen';
import ScannerScreen from './components/ScannerScreen';
import WikiScreen from './components/WikiScreen';
import AuthScreen from './components/AuthScreen';
import ShopScreen from './components/ShopScreen';
import TeamSelectScreen from './components/TeamSelectScreen';

const SPECIES_EMOJI: Record<string, string> = {
  Dragon: '🐉', Eagle: '🦅', Turtle: '🐢',
  Snake: '🐍', Bat: '🦇', Wolf: '🐺'
};

// --- COMPONENTS ---

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

function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'battle' | 'team_setup' | 'scanner' | 'wiki' | 'shop'>('home');
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('tamabi_user_id'));

  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [readiness, setReadiness] = useState(0);

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
  }, [currentScreen, currentUser]); // Reload when returning from battle or logging in

  useEffect(() => {
    if (pet) {
      const avg = (pet.happiness + pet.hunger + pet.health) / 3;
      setReadiness(Math.max(50, Math.round(avg)));
    }
  }, [pet]);

  const handleInteract = async (type: string) => {
    if (!pet) return;
    
    // 1. Optimistic UI Update
    const newPets = [...pets];
    const newPet = { ...pet };
    if (type === 'feed' && newPet.hunger < 100) newPet.hunger = Math.min(100, pet.hunger + 15);
    if (type === 'play' && newPet.happiness < 100) newPet.happiness = Math.min(100, pet.happiness + 20);
    newPets[activePetIndex] = newPet;
    setPets(newPets);

    // 2. DB Update
    const updatePayload: any = {};
    if (type === 'feed') updatePayload.hunger = newPet.hunger;
    if (type === 'play') updatePayload.happiness = newPet.happiness;
    
    await supabase.from('pets').update(updatePayload).eq('id', pet.id);
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
        onBack={() => {
          setCurrentScreen('home');
          // We don't fetch new pets here automatically, but wait, if they roll a pet it should show up.
          // For prototype, we could let the user see it when they restart or we can refactor.
          // Actually, since currentScreen changes to 'home', the useEffect for 'home' will run and loadData() again!
        }} 
      />
    );
  }

  if (isLoading || !profile || !pet) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h2 style={{ marginBottom: '1rem' }}>🔄 Loading Tamabi...</h2>
        <p style={{ opacity: 0.7 }}>ดึงข้อมูลโปรไฟล์และสัตว์เลี้ยงจาก Supabase</p>
      </div>
    );
  }

  const speciesName = pet.species_base_stats?.name || 'Unknown';
  const element = pet.species_base_stats?.element || 'Unknown';
  const emoji = SPECIES_EMOJI[speciesName] || '❓';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
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
        {/* Background glow effect based on element */}
        <div style={{ 
          position: 'absolute', width: '200px', height: '200px', 
          background: 'radial-gradient(circle, rgba(255, 107, 107, 0.2) 0%, rgba(0,0,0,0) 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0
        }} />
        
        {/* Readiness Badge */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1 }}>
          Readiness: <strong style={{ color: readiness >= 80 ? 'var(--stat-health)' : 'var(--stat-hunger)' }}>{readiness}%</strong>
        </div>

        {/* Pet Avatar with Navigation */}
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

        {/* Pagination Dots */}
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
      </main>

      {/* Care Dashboard */}
      <section className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Care Status</h3>
        
        <StatBar label="Happiness (ATK)" value={pet.happiness} colorVar="--stat-happiness" icon={Heart} />
        <StatBar label="Hunger (HP/DEF)" value={pet.hunger} colorVar="--stat-hunger" icon={Utensils} />
        <StatBar label="Health (SPD)" value={pet.health} colorVar="--stat-health" icon={Activity} />
        <StatBar label="Energy (Stamina)" value={pet.energy} colorVar="--stat-energy" icon={Zap} />
        <StatBar label="Aura (PvE Bonus)" value={pet.aura} colorVar="--stat-aura" icon={Sparkles} />

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
          <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center' }} onClick={() => handleInteract('feed')}>
            <Utensils size={18} /> Feed
          </button>
          <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #ff6b6b, #e84393)' }} onClick={() => handleInteract('play')}>
            <Heart size={18} /> Play
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
          <Activity size={24} color="var(--stat-health)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Scan</span>
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
          <Book size={24} color="var(--stat-hunger)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wiki</span>
        </button>
      </nav>

    </div>
  );
}

export default App;
