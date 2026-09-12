import React, { useState } from 'react';
import { Play, User, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLogin: (playerId: string) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('กรุณากรอกชื่อผู้เล่น');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Check if user exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        // User exists, log them in
        onLogin(existingProfile.id);
        return;
      }

      // 2. User doesn't exist -> Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ username: username.trim() })
        .select('id')
        .single();

      if (insertError || !newProfile) {
        throw new Error('ไม่สามารถสร้างบัญชีได้');
      }

      // 3. Mint Starter Pet for new user
      const { data: speciesData } = await supabase
        .from('species_base_stats')
        .select('id, name');
        
      if (speciesData && speciesData.length > 0) {
        // Randomly give them one of the basic pets (e.g. fire, nature, water)
        const starterSpecies = speciesData[Math.floor(Math.random() * 3)]; // limit to first 3 basic types for now
        
        await supabase.from('pets').insert({
          owner_id: newProfile.id,
          species_id: starterSpecies.id,
          name: starterSpecies.name,
          happiness: 80,
          hunger: 80,
          health: 100,
          energy: 100
        });
      }

      // Log the new user in
      onLogin(newProfile.id);

    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      {/* Logo & Branding */}
      <div className="animate-float" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(138, 43, 226, 0.5))' }}>🐾</div>
        <h1>Tamabi</h1>
        <p style={{ color: 'var(--accent-color)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Monster Collecting PWA
        </p>
      </div>

      {/* Login Box */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '320px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem' }}>เข้าสู่ระบบ / สมัครใหม่</h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <User size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button 
            type="submit" 
            className="btn" 
            disabled={isLoading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '12px' }}
          >
            {isLoading ? (
              'กำลังตรวจสอบ...'
            ) : (
              <>
                <Play size={18} fill="currentColor" /> เข้าเล่นเกม
              </>
            )}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          ระบบจะสร้างไอดีให้ใหม่หากไม่พบชื่อนี้ในระบบ
        </div>
      </div>
      
    </div>
  );
}
