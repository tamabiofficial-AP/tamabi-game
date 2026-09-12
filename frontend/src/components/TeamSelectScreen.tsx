import React, { useState } from 'react';
import { ChevronLeft, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

const SPECIES_EMOJI: Record<string, string> = {
  Dragon: '🐉', Eagle: '🦅', Turtle: '🐢',
  Snake: '🐍', Bat: '🦇', Wolf: '🐺'
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff6b6b', water: '#54a0ff', earth: '#c8a96e',
  nature: '#1dd1a1', light: '#feca57', dark: '#5f27cd'
};

interface TeamSelectScreenProps {
  playerPets: any[];
  onStartBattle: (selectedIds: string[]) => void;
  onBack: () => void;
}

export default function TeamSelectScreen({ playerPets, onStartBattle, onBack }: TeamSelectScreenProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (petId: string) => {
    if (selectedIds.includes(petId)) {
      setSelectedIds(selectedIds.filter(id => id !== petId));
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, petId]);
      }
    }
  };

  const handleStart = () => {
    if (selectedIds.length > 0) {
      onStartBattle(selectedIds);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflowY: 'auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1 }}>
          จัดทีมต่อสู้ ({selectedIds.length}/3)
        </h2>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      {/* Info Panel */}
      <section className="glass-panel" style={{ padding: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={16} color="var(--primary-color)" /> เลือกมอนสเตอร์
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          คุณสามารถเลือกมอนสเตอร์ลงสนามได้สูงสุด 3 ตัวเพื่อสร้างคอมโบธาตุที่แข็งแกร่งที่สุด
        </p>
      </section>

      {/* Pet Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {playerPets.map((pet) => {
          const isSelected = selectedIds.includes(pet.id);
          const color = ELEMENT_COLORS[pet.species_base_stats.element] || '#ccc';
          const emoji = SPECIES_EMOJI[pet.species_base_stats.name] || '❓';
          const selectionIndex = selectedIds.indexOf(pet.id) + 1;

          return (
            <div 
              key={pet.id} 
              className="glass-panel" 
              onClick={() => toggleSelection(pet.id)}
              style={{ 
                padding: '1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                border: isSelected ? '2px solid ' + color : '1px solid rgba(255,255,255,0.05)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {isSelected && (
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: color, color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                  {selectionIndex}
                </div>
              )}

              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {emoji}
              </div>

              <h4 style={{ margin: 0, fontSize: '1rem' }}>{pet.name}</h4>
              <span style={{ 
                fontSize: '0.7rem', 
                textTransform: 'capitalize', 
                background: color + '33', 
                color: color,
                padding: '2px 8px', 
                borderRadius: '10px',
                marginTop: '0.3rem'
              }}>
                {pet.species_base_stats.element}
              </span>

              <div style={{ marginTop: '0.8rem', width: '100%', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>HP: {pet.health}%</span>
                <span>ATK: {pet.happiness}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <div style={{ position: 'sticky', bottom: '1rem', zIndex: 10, marginTop: 'auto' }}>
        <button 
          className="btn" 
          disabled={selectedIds.length === 0}
          onClick={handleStart}
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            padding: '1rem', 
            fontSize: '1.1rem',
            background: selectedIds.length > 0 ? 'var(--primary-color)' : 'var(--bg-glass)',
            opacity: selectedIds.length > 0 ? 1 : 0.5
          }}
        >
          <Play fill="currentColor" size={20} style={{ marginRight: '8px' }} />
          เริ่มการต่อสู้ ({selectedIds.length}/3)
        </button>
      </div>
    </div>
  );
}
