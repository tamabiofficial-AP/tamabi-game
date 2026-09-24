import React, { useState, useEffect } from 'react';
import { ChevronLeft, Users, Play, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface OnlinePvPLobbyScreenProps {
  playerId: string;
  onBack: () => void;
  onStartBattle: (roomPin: string, isHost: boolean, opponentId: string, opponentActivePetIds: string[], channel: any) => void;
  activePetIds: string[];
}

export default function OnlinePvPLobbyScreen({ playerId, onBack, onStartBattle, activePetIds }: OnlinePvPLobbyScreenProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [pin, setPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentId, setOpponentId] = useState('');
  const [opponentActivePetIds, setOpponentActivePetIds] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateRoom = () => {
    const newPin = generatePin();
    setPin(newPin);
    setMode('create');
    setStatus('กำลังรอเพื่อนเข้าร่วมห้อง...');

    const newChannel = supabase.channel(`pvp_room_${newPin}`, {
      config: { broadcast: { self: false } },
    });

    newChannel
      .on('broadcast', { event: 'join_room' }, (payload) => {
        setStatus('เพื่อนเข้าร่วมแล้ว! กำลังเชื่อมต่อข้อมูล...');
        setOpponentReady(true);
        setOpponentId(payload.payload.playerId);
        setOpponentActivePetIds(payload.payload.activePetIds);
        // Reply with host's team
        newChannel.send({
          type: 'broadcast',
          event: 'host_ready',
          payload: { playerId, activePetIds },
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Room created successfully');
        }
      });

    setChannel(newChannel);
  };

  const handleJoinRoom = () => {
    if (inputPin.length !== 6) {
      alert('กรุณากรอก PIN 6 หลัก');
      return;
    }
    setMode('join');
    setStatus('กำลังเชื่อมต่อ...');

    const newChannel = supabase.channel(`pvp_room_${inputPin}`, {
      config: { broadcast: { self: false } },
    });

    newChannel
      .on('broadcast', { event: 'host_ready' }, (payload) => {
        setStatus('เชื่อมต่อสำเร็จ! เริ่มเกม...');
        setOpponentReady(true);
        setOpponentId(payload.payload.playerId);
        setOpponentActivePetIds(payload.payload.activePetIds);
        // Add a slight delay before transitioning
        setTimeout(() => {
          onStartBattle(inputPin, false, payload.payload.playerId, payload.payload.activePetIds, newChannel);
        }, 1000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Tell host we joined
          newChannel.send({
            type: 'broadcast',
            event: 'join_room',
            payload: { playerId, activePetIds },
          });
        }
      });

    setChannel(newChannel);
  };

  const startGameAsHost = () => {
    if (opponentReady) {
      onStartBattle(pin, true, opponentId, opponentActivePetIds, channel);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn-icon" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Online PvP Room</h2>
        <div style={{ width: 24 }} />
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
            <button className="btn-primary" onClick={handleCreateRoom} style={{ padding: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Users size={20} /> สร้างห้องใหม่
            </button>
            <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)' }}>หรือ</div>
            <input 
              type="number" 
              placeholder="กรอกรหัส PIN 6 หลัก" 
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value.slice(0, 6))}
              style={{ padding: '1rem', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: '1.2rem' }}
            />
            <button className="btn-primary" onClick={handleJoinRoom} style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--accent)' }}>
              เข้าร่วมห้อง
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '300px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>รหัสห้องของคุณ</p>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '5px', marginBottom: '1rem', color: 'var(--primary)' }}>
              {pin}
            </div>
            <button onClick={copyPin} className="btn-icon" style={{ padding: '0.5rem 1rem', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0 auto 2rem' }}>
              {copied ? <Check size={16} color="#1dd1a1" /> : <Copy size={16} />} 
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก PIN'}
            </button>

            <div style={{ minHeight: '60px', marginBottom: '2rem' }}>
              <p style={{ color: opponentReady ? '#1dd1a1' : 'var(--text-muted)' }}>{status}</p>
            </div>

            <button 
              className="btn-primary" 
              onClick={startGameAsHost}
              disabled={!opponentReady}
              style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: opponentReady ? 1 : 0.5 }}
            >
              <Play size={20} /> เริ่มเกม
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '300px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>กำลังเข้าร่วมห้อง</p>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '3px', marginBottom: '2rem' }}>
              {inputPin}
            </div>
            <p style={{ color: 'var(--primary)' }}>{status}</p>
          </div>
        )}

      </div>
    </div>
  );
}
