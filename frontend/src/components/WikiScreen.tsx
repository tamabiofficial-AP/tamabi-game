import React, { useState, useEffect } from 'react';
import { ChevronLeft, Book, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

import { SPECIES_EMOJI } from '../engine/petData';
import { makeSkills } from '../engine/battleEngine';

const SPECIES_RANGED = ['Eagle', 'Bat'];

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff6b6b', water: '#54a0ff', earth: '#c8a96e',
  nature: '#1dd1a1', light: '#feca57', dark: '#5f27cd'
};

interface WikiScreenProps {
  playerPets: any[];
  onBack: () => void;
}

export default function WikiScreen({ playerPets, onBack }: WikiScreenProps) {
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract array of species_ids that the player owns
  const unlockedSpeciesIds = new Set(playerPets.map(pet => pet.species_id));

  useEffect(() => {
    async function loadSpecies() {
      const { data, error } = await supabase
        .from('species_base_stats')
        .select('*')
        .order('id', { ascending: true });

      if (data) {
        setSpeciesList(data);
      } else if (error) {
        console.error('Error fetching species:', error);
      }
      setIsLoading(false);
    }

    loadSpecies();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflowY: 'auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Book size={20} /> Tamabi Wiki
        </h2>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      {/* Element Chart */}
      <section className="glass-panel" style={{ padding: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={18} color="var(--primary-color)" /> Element Advantages
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <span>🔥 Fire {'>'} 🍃 Nature</span>
          <span>💧 Water {'>'} 🔥 Fire</span>
          <span>🍃 Nature {'>'} 🪨 Earth</span>
          <span>🪨 Earth {'>'} 💧 Water</span>
          <span style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '0.5rem', color: 'var(--stat-aura)' }}>☀️ Light ⚔️ 🌑 Dark (สู้กันเองแรงขึ้น 1.5x)</span>
        </div>
      </section>

      {/* Species Grid */}
      <h3 style={{ marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
        Collection ({unlockedSpeciesIds.size} / {speciesList.length})
      </h3>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading Wiki...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {speciesList.map((species) => {
            const isUnlocked = unlockedSpeciesIds.has(species.id);
            const color = ELEMENT_COLORS[species.element] || '#ccc';
            const emoji = SPECIES_EMOJI[species.name] || '❓';

            return (
              <div key={species.id} className="glass-panel" style={{ 
                padding: '1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                opacity: isUnlocked ? 1 : 0.6,
                border: isUnlocked ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Element Glow Background */}
                {isUnlocked && (
                  <div style={{ 
                    position: 'absolute', top: '-20px', right: '-20px', 
                    width: '60px', height: '60px', borderRadius: '50%', 
                    background: color, filter: 'blur(30px)', opacity: 0.3 
                  }} />
                )}

                {/* Avatar */}
                <div style={{ 
                  fontSize: '3rem', 
                  marginBottom: '0.5rem',
                  filter: isUnlocked ? 'none' : 'grayscale(100%) brightness(0.2)',
                  transition: 'all 0.3s'
                }}>
                  {emoji}
                </div>

                {/* Info */}
                <h4 style={{ margin: 0, fontSize: '1rem', color: isUnlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {isUnlocked ? species.name : '???'}
                </h4>
                
                <span style={{ 
                  fontSize: '0.7rem', 
                  textTransform: 'capitalize', 
                  background: isUnlocked ? `${color}33` : 'rgba(255,255,255,0.1)', 
                  color: isUnlocked ? color : 'var(--text-muted)',
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  marginTop: '0.3rem'
                }}>
                  {isUnlocked ? species.element : 'Unknown'}
                </span>

                {/* Stats (Only if unlocked) */}
                {isUnlocked ? (
                  <div style={{ marginTop: '0.8rem', width: '100%', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', marginBottom: '0.5rem' }}>
                      <span>HP: {species.base_hp}</span>
                      <span>ATK: {species.base_atk}</span>
                      <span>DEF: {species.base_def}</span>
                      <span>SPD: {species.base_spd}</span>
                    </div>
                    {/* Skills */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px', textAlign: 'left' }}>
                      <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Skills:</span>
                      {(() => {
                        const skills = makeSkills(species.element, SPECIES_RANGED.includes(species.name));
                        return skills.map(skill => (
                          <div key={skill.id} style={{ marginTop: '0.3rem' }}>
                            <strong style={{ color: 'white' }}>{skill.icon} {skill.name}</strong>
                            <div style={{ fontSize: '0.65rem' }}>{skill.description}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.8rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    🔒 Not Unlocked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
