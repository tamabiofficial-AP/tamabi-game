import React, { useState } from 'react';
import { ChevronLeft, MapPin, Footprints, CheckCircle2, Star, Target } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface QuestScreenProps {
  playerId: string;
  onUpdateStats: (newCoins: number, newInventory: Record<string, number>) => void;
  onBack: () => void;
}

export default function QuestScreen({ playerId, onUpdateStats, onBack }: QuestScreenProps) {
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  const mockQuests = [
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
      id: 'q_health_park',
      title: 'สูดอากาศบริสุทธิ์',
      description: 'เช็คอินที่สวนสาธารณะเฉลิมพระเกียรติ',
      icon: <MapPin size={24} color="#48dbfb" />,
      rewards: { starPoints: 15, coins: 0 }
    }
  ];

  const handleCompleteQuest = async (questId: string, rewards: { starPoints: number, coins: number }) => {
    if (completedQuests.has(questId) || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Fetch current profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('pet_coins, inventory')
        .eq('id', playerId)
        .single();
        
      if (profileErr) throw profileErr;

      // 2. Add rewards
      const currentInv = profile.inventory || {};
      const newInv = { 
        ...currentInv, 
        star_points: (currentInv.star_points || 0) + rewards.starPoints 
      };
      const newCoins = profile.pet_coins + rewards.coins;

      // 3. Save to DB
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ pet_coins: newCoins, inventory: newInv })
        .eq('id', playerId);

      if (updateErr) throw updateErr;

      // 4. Update UI
      setCompletedQuests(prev => new Set(prev).add(questId));
      onUpdateStats(newCoins, newInv);
      
      let msg = 'ได้รับ ';
      if (rewards.starPoints > 0) msg += `${rewards.starPoints} ⭐ `;
      if (rewards.coins > 0) msg += `${rewards.coins} 🪙`;
      
      setRewardMessage(msg);
      setTimeout(() => setRewardMessage(null), 3000);

    } catch (err) {
      console.error('Error completing quest:', err);
      alert('เกิดข้อผิดพลาดในการรับรางวัล');
    } finally {
      setIsProcessing(false);
    }
  };

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

      {rewardMessage && (
        <div style={{ 
          background: 'rgba(46, 204, 113, 0.2)', border: '1px solid #2ecc71', 
          padding: '0.8rem', borderRadius: '8px', textAlign: 'center',
          animation: 'slide-down 0.3s ease-out'
        }}>
          🎉 เควสสำเร็จ! {rewardMessage}
        </div>
      )}

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ทำกิจกรรมในโลกจริงเพื่อรับ Star Points (⭐) ไปแลกคูปอง!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mockQuests.map(q => {
            const isDone = completedQuests.has(q.id);
            return (
              <div key={q.id} className="glass-panel" style={{ 
                padding: '1rem', 
                display: 'flex', alignItems: 'center', gap: '1rem',
                opacity: isDone ? 0.6 : 1,
                transition: 'all 0.3s'
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
                  onClick={() => handleCompleteQuest(q.id, q.rewards)}
                  disabled={isDone || isProcessing}
                  style={{ 
                    padding: '0.6rem', width: 'auto', minWidth: '80px',
                    background: isDone ? 'rgba(46, 204, 113, 0.2)' : 'var(--primary-color)',
                    borderColor: isDone ? '#2ecc71' : 'transparent',
                  }}
                >
                  {isDone ? <CheckCircle2 size={20} color="#2ecc71" /> : 'ทำเควส'}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
