import React from 'react';
import { ChevronLeft, Map, Skull, Trophy, Swords, Users } from 'lucide-react';

interface BattleMenuScreenProps {
  onSelectMode: (mode: 'pve' | 'boss' | 'pvp' | 'pvp_online') => void;
  onBack: () => void;
}

export default function BattleMenuScreen({ onSelectMode, onBack }: BattleMenuScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Swords size={20} /> เลือกโหมดการเล่น
        </h2>
        <div style={{ width: '40px' }} />
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* PvE Mode */}
        <div 
          className="glass-panel" 
          onClick={() => onSelectMode('pve')}
          style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(29, 209, 161, 0.3)', transition: 'transform 0.1s' }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(29, 209, 161, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Map size={32} color="#1dd1a1" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1dd1a1' }}>Adventure (PvE)</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ตะลุยด่านเพื่อฟาร์มเหรียญ Pet Coins</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>🪙 ให้เหรียญ</span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>⚡ เสีย Energy</span>
            </div>
          </div>
        </div>

        {/* Boss Mode */}
        <div 
          className="glass-panel" 
          onClick={() => onSelectMode('boss')}
          style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255, 107, 107, 0.3)' }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(255, 107, 107, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Skull size={32} color="#ff6b6b" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ff6b6b' }}>Boss Hunt</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>รวมทีมปราบสปอนเซอร์บอสเพื่อล่าคูปอง</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255, 107, 107, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '8px', color: '#ff6b6b', fontWeight: 'bold' }}>🎟️ รางวัลพิเศษ</span>
            </div>
          </div>
        </div>

        {/* PvP Mode */}
        <div 
          className="glass-panel" 
          onClick={() => onSelectMode('pvp')}
          style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(254, 202, 87, 0.3)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05, transform: 'rotate(15deg)' }}>⚔️</div>
          <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(254, 202, 87, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={32} color="#feca57" />
          </div>
          <div style={{ flex: 1, zIndex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#feca57' }}>PvP Arena</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>จัดทีมประลองกับผู้เล่นจริงเพื่อไต่ Rank!</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(254, 202, 87, 0.2)', color: '#feca57', padding: '0.2rem 0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>⭐ แร็งค์ & EXP</span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>♾️ เล่นฟรีไม่จำกัด</span>
            </div>
          </div>
        </div>

        {/* Online PvP Mode */}
        <div 
          className="glass-panel" 
          onClick={() => onSelectMode('pvp_online')}
          style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(165, 94, 234, 0.3)' }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(165, 94, 234, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} color="#a55eea" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#a55eea' }}>Play with Friends</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>สร้างห้องต่อสู้กับเพื่อนแบบ Real-time</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', background: 'rgba(165, 94, 234, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '8px', color: '#a55eea', fontWeight: 'bold' }}>🎮 สร้างห้องด้วย PIN</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
