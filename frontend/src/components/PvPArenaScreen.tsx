import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trophy, Search, Shield, Zap, Swords } from 'lucide-react';

interface PvPArenaScreenProps {
  playerId: string;
  playerProfile: any;
  onMatchFound: () => void;
  onBack: () => void;
}

export default function PvPArenaScreen({ playerId, playerProfile, onMatchFound, onBack }: PvPArenaScreenProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const pvpRating = playerProfile?.pvp_rating || 1000;
  
  // Calculate Rank based on ELO
  const getRank = (rating: number) => {
    if (rating < 1100) return { name: 'Bronze', color: '#cd7f32', emoji: '🥉' };
    if (rating < 1300) return { name: 'Silver', color: '#c0c0c0', emoji: '🥈' };
    if (rating < 1600) return { name: 'Gold', color: '#ffd700', emoji: '🥇' };
    if (rating < 2000) return { name: 'Platinum', color: '#e5e4e2', emoji: '💎' };
    return { name: 'Diamond', color: '#b9f2ff', emoji: '👑' };
  };

  const rank = getRank(pvpRating);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime(prev => {
          if (prev >= 2) {
            clearInterval(timer);
            onMatchFound();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearching, onMatchFound]);

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchTime(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }} disabled={isSearching}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#feca57' }}>
          <Trophy size={20} /> PvP Arena
        </h2>
        <div style={{ width: '40px' }} />
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '2rem' }}>
        
        {/* Rank Display */}
        <div className="glass-panel" style={{ width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: `2px solid ${rank.color}` }}>
          <div style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}>
            {rank.emoji}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', color: rank.color, textTransform: 'uppercase', letterSpacing: '2px' }}>
              {rank.name}
            </h1>
            <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              Rating: {pvpRating}
            </p>
          </div>
        </div>

        {/* Info */}
        <div style={{ marginTop: '2rem', width: '100%', display: 'flex', justifyContent: 'space-around', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '15px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Swords size={24} color="#ff6b6b" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wins</div>
            <div style={{ fontWeight: 'bold' }}>--</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Shield size={24} color="#1dd1a1" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Losses</div>
            <div style={{ fontWeight: 'bold' }}>--</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Zap size={24} color="#feca57" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win Rate</div>
            <div style={{ fontWeight: 'bold' }}>--%</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Action Button */}
        <button 
          className="btn" 
          onClick={handleStartSearch}
          disabled={isSearching}
          style={{ 
            width: '100%', padding: '1.5rem', fontSize: '1.2rem', 
            background: isSearching ? 'var(--bg-glass)' : 'linear-gradient(135deg, #feca57, #ff9f43)',
            color: isSearching ? 'white' : 'black',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
            animation: isSearching ? 'pulse-glow 1.5s infinite' : 'none'
          }}
        >
          {isSearching ? (
            <>
              <Search size={28} className="animate-spin" />
              <span>กำลังหาคู่ต่อสู้... {searchTime}s</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>FIND MATCH</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>เล่นฟรี ไม่จำกัดจำนวนครั้ง</span>
            </>
          )}
        </button>

      </main>
    </div>
  );
}
