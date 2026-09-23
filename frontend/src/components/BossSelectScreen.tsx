import React from 'react';
import { ChevronLeft, Skull, Award, Swords } from 'lucide-react';

export interface BossDef {
  id: string;
  name: string;
  type: 'solo' | 'sponsored';
  element: string;
  trait: string;
  hp: number;
  emoji: string;
  description: string;
  rewards: {
    coins?: number;
    starPoints?: number;
    couponId?: string;
  };
}

export const AVAILABLE_BOSSES: BossDef[] = [
  {
    id: 'boss_slime_king',
    name: 'Slime King',
    type: 'solo',
    element: 'water',
    trait: 'tank',
    hp: 800,
    emoji: '💧',
    description: 'บอสสไลม์ยักษ์ประจำวัน ตีชนะเพื่อรับรางวัลทั่วไป',
    rewards: {
      coins: 50,
      starPoints: 10
    }
  },
  {
    id: 'boss_33backyard_dragon',
    name: 'The 33 Backyard Dragon',
    type: 'sponsored',
    element: 'fire',
    trait: 'attacker',
    hp: 1200,
    emoji: '🐉',
    description: 'มังกรไฟสุดโหดจากร้าน The 33 Backyard! ชนะเพื่อรับคูปองส่วนลดทันที',
    rewards: {
      couponId: 'coupon_33backyard_15'
    }
  }
];

interface BossSelectScreenProps {
  onSelectBoss: (boss: BossDef) => void;
  onBack: () => void;
}

export default function BossSelectScreen({ onSelectBoss, onBack }: BossSelectScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Skull size={20} /> ท้าทายบอส
        </h2>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          เลือกบอสที่คุณต้องการท้าทายเพื่อรับรางวัลสุดพิเศษ!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {AVAILABLE_BOSSES.map(boss => (
            <div key={boss.id} className="glass-panel" style={{ 
              padding: '1.2rem', 
              display: 'flex', flexDirection: 'column', gap: '0.8rem',
              border: boss.type === 'sponsored' ? '1px solid #feca57' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: boss.type === 'sponsored' ? '0 0 15px rgba(254, 202, 87, 0.2)' : 'none'
            }}>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ 
                  background: boss.type === 'sponsored' ? 'rgba(254, 202, 87, 0.2)' : 'rgba(255,255,255,0.1)', 
                  width: '60px', height: '60px', 
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {boss.emoji}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: boss.type === 'sponsored' ? '#feca57' : 'white' }}>
                      {boss.name}
                    </h3>
                    {boss.type === 'sponsored' && (
                      <span style={{ fontSize: '0.7rem', background: '#feca57', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '8px', fontWeight: 'bold' }}>
                        Sponsored
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ธาตุ: <span style={{ textTransform: 'capitalize' }}>{boss.element}</span> | HP: {boss.hp}
                  </p>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem' }}>
                    {boss.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Award size={14} color="#1dd1a1" /> รางวัล:</span>
                  {boss.rewards.couponId && <span style={{ color: '#feca57' }}>คูปองส่วนลด 15%</span>}
                  {boss.rewards.coins && <span style={{ color: '#ff9f43' }}>{boss.rewards.coins} 🪙</span>}
                  {boss.rewards.starPoints && <span style={{ color: '#feca57' }}>{boss.rewards.starPoints} ⭐</span>}
                </div>
                <button 
                  className="btn"
                  onClick={() => onSelectBoss(boss)}
                  style={{ 
                    padding: '0.5rem 1rem', width: 'auto',
                    background: boss.type === 'sponsored' ? 'linear-gradient(135deg, #feca57, #ff9f43)' : 'var(--primary-color)',
                    color: boss.type === 'sponsored' ? 'black' : 'white'
                  }}
                >
                  <Swords size={16} /> ท้าทาย
                </button>
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
