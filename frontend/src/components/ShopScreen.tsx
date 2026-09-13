import React, { useState } from 'react';
import { ChevronLeft, ShoppingBag, Gift, Sparkles, PackageOpen } from 'lucide-react';
import { rollGacha } from '../engine/gachaSystem';
import type { GachaResult } from '../engine/gachaSystem';
import { ITEMS } from '../engine/itemSystem';
import { supabase } from '../lib/supabaseClient';

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
  const [activeTab, setActiveTab] = useState<'gacha' | 'items'>('items');
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [itemResult, setItemResult] = useState<{success: boolean, message: string} | null>(null);

  const handleRoll = async () => {
    if (currentCoins < GACHA_COST) {
      setResult({ success: false, message: 'เหรียญไม่พอ! กรุณาไปต่อสู้เพื่อหาเหรียญเพิ่ม' });
      return;
    }

    setIsRolling(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const res = await rollGacha(playerId, GACHA_COST);
    
    if (res.success && res.newBalance !== undefined) {
      onUpdateCoins(res.newBalance);
    }
    
    setResult(res);
    setIsRolling(false);
  };

  const handleBuyItem = async (itemId: string, price: number) => {
    if (currentCoins < price) {
      setItemResult({ success: false, message: 'เหรียญไม่พอซื้อไอเทมนี้' });
      setTimeout(() => setItemResult(null), 3000);
      return;
    }

    try {
      // 1. Fetch current profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('pet_coins, inventory')
        .eq('id', playerId)
        .single();
        
      if (profileErr) throw profileErr;

      // 2. Update inventory and coins
      const currentInv = profile.inventory || {};
      const newInv = { ...currentInv, [itemId]: (currentInv[itemId] || 0) + 1 };
      const newCoins = profile.pet_coins - price;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ pet_coins: newCoins, inventory: newInv })
        .eq('id', playerId);

      if (updateErr) throw updateErr;

      // 3. Success
      onUpdateCoins(newCoins);
      setItemResult({ success: true, message: `ซื้อ ${ITEMS[itemId].name} สำเร็จ!` });
      setTimeout(() => setItemResult(null), 2000);

    } catch (err) {
      console.error(err);
      setItemResult({ success: false, message: 'เกิดข้อผิดพลาดในการซื้อ' });
      setTimeout(() => setItemResult(null), 3000);
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
          <ShoppingBag size={20} /> Tamabi Shop
        </h2>
        <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#feca57', fontWeight: 'bold' }}>🪙 {currentCoins}</span>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => { setActiveTab('items'); setResult(null); }}
          style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: activeTab === 'items' ? 'var(--primary-color)' : 'var(--bg-glass)', color: activeTab === 'items' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <PackageOpen size={18} /> ร้านไอเทม
        </button>
        <button 
          onClick={() => { setActiveTab('gacha'); setItemResult(null); }}
          style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: activeTab === 'gacha' ? '#8a2be2' : 'var(--bg-glass)', color: activeTab === 'gacha' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Gift size={18} /> ตู้สุ่มกาชา
        </button>
      </div>

      {itemResult && (
        <div style={{ padding: '1rem', background: itemResult.success ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)', border: `1px solid ${itemResult.success ? '#2ecc71' : '#e74c3c'}`, borderRadius: '12px', textAlign: 'center', animation: 'fade-in 0.3s' }}>
          {itemResult.message}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
        
        {/* ITEM SHOP TAB */}
        {activeTab === 'items' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '2rem' }}>
            {Object.values(ITEMS).map(item => (
              <div key={item.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{item.emoji}</div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{item.name}</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem', minHeight: '32px' }}>{item.description}</p>
                <button 
                  className="btn" 
                  onClick={() => handleBuyItem(item.id, item.price)}
                  disabled={currentCoins < item.price}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', justifyContent: 'center', background: currentCoins >= item.price ? 'var(--primary-color)' : 'var(--bg-glass)' }}
                >
                  🪙 {item.price}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* GACHA TAB */}
        {activeTab === 'gacha' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            {!result && (
              <div style={{ position: 'relative', width: '250px', height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem', zIndex: 1, position: 'relative', textAlign: 'center' }}>
                  ใช้ {GACHA_COST} เหรียญเพื่อสุ่มรับมอนสเตอร์ใหม่!
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
          </div>
        )}

      </main>
      
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
