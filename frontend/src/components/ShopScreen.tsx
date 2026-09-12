import React, { useState } from 'react';
import { ChevronLeft, ShoppingBag, Gift, Sparkles } from 'lucide-react';
import { rollGacha } from '../engine/gachaSystem';
import type { GachaResult } from '../engine/gachaSystem';

const SPECIES_EMOJI: Record<string, string> = {
  Dragon: '🐉', Eagle: '🦅', Turtle: '🐢',
  Snake: '🐍', Bat: '🦇', Wolf: '🐺'
};

const GACHA_COST = 500;

interface ShopScreenProps {
  playerId: string;
  currentCoins: number;
  onUpdateCoins: (newBalance: number) => void;
  onBack: () => void;
}

export default function ShopScreen({ playerId, currentCoins, onUpdateCoins, onBack }: ShopScreenProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);

  const handleRoll = async () => {
    if (currentCoins < GACHA_COST) {
      setResult({ success: false, message: 'เหรียญไม่พอ! กรุณาไปต่อสู้เพื่อหาเหรียญเพิ่ม' });
      return;
    }

    setIsRolling(true);
    setResult(null);

    // Simulate anticipation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const res = await rollGacha(playerId, GACHA_COST);
    
    if (res.success && res.newBalance !== undefined) {
      onUpdateCoins(res.newBalance);
    }
    
    setResult(res);
    setIsRolling(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={20} /> Tamabi Shop
        </h2>
        <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#feca57', fontWeight: 'bold' }}>🪙 {currentCoins}</span>
        </div>
      </header>

      {/* Main Gacha Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        {!result && (
          <div className="glass-panel" style={{ width: '100%', maxWidth: '300px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            
            {/* Ambient Background Glow */}
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '150px', height: '150px', borderRadius: '50%', 
              background: 'radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, rgba(0,0,0,0) 70%)',
              animation: 'pulse-glow 2s infinite'
            }} />

            <div className={isRolling ? 'animate-shake' : 'animate-float'} style={{ fontSize: '5rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
              🎁
            </div>
            
            <h3 style={{ marginBottom: '0.5rem', zIndex: 1, position: 'relative' }}>ตู้สุ่มมอนสเตอร์</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem', zIndex: 1, position: 'relative' }}>
              ใช้ {GACHA_COST} เหรียญเพื่อสุ่มรับมอนสเตอร์ใหม่เข้าคอลเล็กชัน!
            </p>

            <button 
              className="btn" 
              onClick={handleRoll}
              disabled={isRolling}
              style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', zIndex: 1, position: 'relative', background: 'linear-gradient(135deg, #feca57, #ff9f43)', color: '#2d3436' }}
            >
              {isRolling ? 'กำลังสุ่ม...' : `หมุนกาชา (🪙 ${GACHA_COST})`}
            </button>
          </div>
        )}

        {/* Scan Result */}
        {result && result.success && result.pet && (
          <div className="glass-panel" style={{ textAlign: 'center', animation: 'popup 0.5s ease-out', width: '100%', maxWidth: '300px' }}>
            <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)' }}>
              <Sparkles color="#feca57" size={40} className="animate-float" />
            </div>

            <h2 style={{ color: '#feca57', marginBottom: '1rem', marginTop: '1rem' }}>🎉 ยินดีด้วย!</h2>
            <div className="animate-float" style={{ 
              width: '120px', height: '120px', 
              background: 'var(--bg-main)', 
              borderRadius: '50%', 
              margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(254, 202, 87, 0.5)',
              border: '2px solid #feca57',
              fontSize: '4rem'
            }}>
              {SPECIES_EMOJI[result.pet.species_base_stats.name] || '❓'}
            </div>
            <h3>{result.pet.name}</h3>
            <p style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{result.pet.species_base_stats.element} Element</p>
            
            <button className="btn" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={() => setResult(null)}>
              หมุนอีกครั้ง
            </button>
            <button style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer' }} onClick={onBack}>
              กลับหน้าหลัก
            </button>
          </div>
        )}

        {result && !result.success && (
          <div className="glass-panel" style={{ textAlign: 'center', width: '100%', maxWidth: '300px' }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>❌ ไม่สำเร็จ</h2>
            <p>{result.message}</p>
            <button className="btn" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={() => setResult(null)}>
              กลับ
            </button>
          </div>
        )}

      </main>
      
      {/* Keyframes for shake animation */}
      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(5px) rotate(5deg); }
            50% { transform: translateX(-5px) rotate(-5deg); }
            75% { transform: translateX(5px) rotate(5deg); }
            100% { transform: translateX(0) rotate(0deg); }
          }
          .animate-shake {
            animation: shake 0.3s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
