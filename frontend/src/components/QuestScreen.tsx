import React, { useState } from 'react';
import { ChevronLeft, MapPin, Footprints, Camera, Target } from 'lucide-react';

interface QuestScreenProps {
  playerId: string;
  onUpdateStats: (newCoins: number, newInventory: Record<string, number>) => void;
  onBack: () => void;
  onOpenScanner: (targetQuestId: string) => void;
  completedQuests: string[];
}

export const MOCK_QUESTS = [
  {
    id: 'q_walk_2k',
    title: 'ออกกำลังกายยามเช้า',
    description: 'เดินให้ครบ 2,000 ก้าว',
    icon: <Footprints size={24} color="#1dd1a1" />,
    rewards: { starPoints: 10, coins: 50 }
  },
  {
    id: 'q_cafe_33',
    title: 'แวะพักดื่มกาแฟ',
    description: 'เช็คอินที่ร้าน The 33 Backyard',
    icon: <MapPin size={24} color="#ff6b6b" />,
    rewards: { starPoints: 15, coins: 0 }
  },
  {
    id: 'q_cafe_secret',
    title: 'ของหวานยามบ่าย',
    description: 'เช็คอินที่ร้าน Secret Cafe',
    icon: <MapPin size={24} color="#a55eea" />,
    rewards: { starPoints: 15, coins: 0 }
  },
  {
    id: 'q_cafe_nomongko',
    title: 'เติมนมให้ร่างกาย',
    description: 'เช็คอินที่ร้านนมองโก๋',
    icon: <MapPin size={24} color="#ff9f43" />,
    rewards: { starPoints: 15, coins: 0 }
  }
];

export default function QuestScreen({ playerId, onUpdateStats, onBack, onOpenScanner, completedQuests }: QuestScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Target size={20} /> Real-World Quests
        </h2>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ทำกิจกรรมในโลกจริงเพื่อรับ Star Points (⭐) ไปแลกคูปอง!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {MOCK_QUESTS.map(q => {
            const isDone = completedQuests.includes(q.id);
            return (
              <div key={q.id} className="glass-panel" style={{ 
                padding: '1rem', 
                display: 'flex', alignItems: 'center', gap: '1rem',
                opacity: isDone ? 0.6 : 1,
                transition: 'all 0.3s',
                border: isDone ? '1px solid #1dd1a1' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  width: '50px', height: '50px', 
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {q.icon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{q.title}</h4>
                  <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {q.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {q.rewards.starPoints > 0 && <span style={{ color: '#feca57' }}>+{q.rewards.starPoints} ⭐</span>}
                    {q.rewards.coins > 0 && <span style={{ color: '#ff9f43' }}>+{q.rewards.coins} 🪙</span>}
                  </div>
                </div>

                <button 
                  className={`btn ${isDone ? 'success' : ''}`}
                  onClick={() => !isDone && onOpenScanner(q.id)}
                  disabled={isDone}
                  style={{ padding: '0.6rem', width: 'auto', background: isDone ? 'rgba(46, 204, 113, 0.2)' : 'var(--primary-gradient)', color: 'white' }}
                >
                  {isDone ? '✔ สำเร็จ' : <><Camera size={18} /> สแกน</>}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
