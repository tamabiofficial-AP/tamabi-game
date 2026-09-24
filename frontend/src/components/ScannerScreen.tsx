import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { processScanResult } from '../engine/scannerSystem';
import type { ScanResult } from '../engine/scannerSystem';
import { Scanner } from '@yudiel/react-qr-scanner';

import { SPECIES_EMOJI, SPECIES_IMAGES } from '../engine/petData';

interface ScannerScreenProps {
  playerId: string;
  questTargetId?: string | null;
  onQuestComplete?: (questId: string) => void;
  onBack: () => void;
}

export default function ScannerScreen({ playerId, questTargetId, onQuestComplete, onBack }: ScannerScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0 && !isProcessing && !result) {
      const qrData = detectedCodes[0].rawValue;
      setIsProcessing(true);
      
      const scanRes = await processScanResult(qrData, playerId, !!questTargetId);
      setResult(scanRes);
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: unknown) => {
    console.error('QR Scanner Error:', error);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1 }}>Tamabi Scanner</h2>
        <div style={{ width: '40px' }} />
      </header>

      {/* Main Scanner Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Viewfinder UI */}
        {!result && (
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
            <Scanner 
              onScan={handleScan}
              onError={handleScanError}
              components={{
                finder: true,
              }}
              styles={{
                container: { width: '100%' },
              }}
            />
            {isProcessing && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                กำลังตรวจสอบ...
              </div>
            )}
          </div>
        )}

        {/* Scan Result */}
        {result && result.success && result.pet && !result.pet.isQuest && (
          <div className="glass-panel" style={{ textAlign: 'center', animation: 'popup 0.5s ease-out' }}>
            <h2 style={{ color: '#feca57', marginBottom: '1rem' }}>🎉 ค้นพบมอนสเตอร์ใหม่!</h2>
            <div className="animate-float" style={{ 
              width: '120px', height: '120px', 
              background: 'var(--bg-main)', 
              borderRadius: '50%', 
              margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 202, 87, 0.4)',
              overflow: 'hidden'
            }}>
              <img 
                src={SPECIES_IMAGES[result.pet.species_base_stats.name] || '/assets/pets/dragon.jpg'} 
                alt={result.pet.species_base_stats.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h3>{result.pet.name}</h3>
            <p style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{result.pet.species_base_stats.element} Element</p>
            <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
              Trait: {result.pet.trait || 'Normal'}
            </span>
            
            <button className="btn" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={onBack}>
              รับเข้าคอลเล็กชัน
            </button>
          </div>
        )}

        {/* Quest Check-in Result */}
        {result && result.success && result.pet && result.pet.isQuest && (
          <div className="glass-panel" style={{ textAlign: 'center', animation: 'popup 0.5s ease-out', padding: '2rem' }}>
            {questTargetId && questTargetId !== result.pet.id ? (
              <h2 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>❌ เช็คอินไม่สำเร็จ!</h2>
            ) : (
              <h2 style={{ color: '#1dd1a1', marginBottom: '1rem' }}>📍 เช็คอินสำเร็จ!</h2>
            )}
            
            {questTargetId && questTargetId !== result.pet.id ? (
              <p style={{ color: '#ff6b6b' }}>คุณสแกน QR Code ไม่ตรงกับสถานที่ในเควสที่รับมา!</p>
            ) : (
              <p>ระบบยืนยันสถานที่เรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อรับรางวัล</p>
            )}

            <button 
              className="btn" 
              style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} 
              onClick={() => {
                if (questTargetId && questTargetId !== result.pet.id) {
                  setResult(null);
                } else {
                  if (onQuestComplete) onQuestComplete(result.pet.id);
                }
              }}
            >
              {questTargetId && questTargetId !== result.pet.id ? 'ลองสแกนใหม่' : 'รับรางวัลเควส'}
            </button>
          </div>
        )}

        {result && !result.success && (
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>❌ ข้อผิดพลาด</h2>
            <p>{result.message}</p>
            <button className="btn" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={() => setResult(null)}>
              สแกนอีกครั้ง
            </button>
          </div>
        )}

      </main>

      {/* Controls */}
      {!result && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            {isProcessing ? 'โปรดรอสักครู่...' : questTargetId ? 'กรุณาสแกน QR Code ประจำร้านเพื่อเช็คอิน!' : 'หันกล้องไปที่ QR Code ของเกม Tamabi เพื่อรับมอนสเตอร์!'}
          </p>
        </div>
      )}
      
    </div>
  );
}
