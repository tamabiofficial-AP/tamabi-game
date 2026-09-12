import React, { useState, useEffect } from 'react';
import { Camera, QrCode, Scan, ChevronLeft } from 'lucide-react';
import { processScanResult } from '../engine/scannerSystem';
import type { ScanResult } from '../engine/scannerSystem';

const SPECIES_EMOJI: Record<string, string> = {
  Dragon: '🐉', Eagle: '🦅', Turtle: '🐢',
  Snake: '🐍', Bat: '🦇', Wolf: '🐺'
};

interface ScannerScreenProps {
  playerId: string;
  onBack: () => void;
}

export default function ScannerScreen({ playerId, onBack }: ScannerScreenProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Handle Mock Scan
  const handleSimulateScan = async () => {
    setIsScanning(true);
    
    // Simulate camera/processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const scanRes = await processScanResult("mock_qr_code_123", playerId);
    setResult(scanRes);
    setIsScanning(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', flex: 1 }}>Tamabi Scanner</h2>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </header>

      {/* Main Scanner Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Viewfinder UI */}
        {!result && (
          <div style={{ position: 'relative', width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Viewfinder Corners */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '4px solid var(--primary-color)', borderLeft: '4px solid var(--primary-color)' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '4px solid var(--primary-color)', borderRight: '4px solid var(--primary-color)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--primary-color)', borderLeft: '4px solid var(--primary-color)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--primary-color)', borderRight: '4px solid var(--primary-color)' }} />
            
            {/* Center Icon */}
            <QrCode size={80} color="var(--border-glass)" style={{ animation: isScanning ? 'pulse-glow 1s infinite' : 'none' }} />
            
            {/* Scanning Line */}
            {isScanning && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'var(--primary-color)',
                boxShadow: '0 0 10px var(--primary-color)',
                animation: 'scan-line 1.5s linear infinite'
              }} />
            )}
          </div>
        )}

        {/* Scan Result */}
        {result && result.success && result.pet && (
          <div className="glass-panel" style={{ textAlign: 'center', animation: 'popup 0.5s ease-out' }}>
            <h2 style={{ color: '#feca57', marginBottom: '1rem' }}>🎉 ค้นพบมอนสเตอร์ใหม่!</h2>
            <div className="animate-float" style={{ 
              width: '120px', height: '120px', 
              background: 'var(--bg-main)', 
              borderRadius: '50%', 
              margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 202, 87, 0.4)',
              fontSize: '4rem'
            }}>
              {SPECIES_EMOJI[result.pet.species_base_stats.name] || '❓'}
            </div>
            <h3>{result.pet.name}</h3>
            <p style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{result.pet.species_base_stats.element} Element</p>
            
            <button className="btn" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={onBack}>
              รับเข้าคอลเล็กชัน
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
          <p style={{ marginBottom: '1.5rem' }}>
            {isScanning ? 'กำลังตรวจสอบคิวอาร์โค้ด...' : 'สแกน QR Code จากสินค้าเพื่อรับไอเทมหรือมอนสเตอร์ใหม่!'}
          </p>
          <button 
            className="btn" 
            onClick={handleSimulateScan}
            disabled={isScanning}
            style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}
          >
            <Scan size={24} /> {isScanning ? 'Scanning...' : 'Simulate Scan (จำลอง)'}
          </button>
        </div>
      )}
      
      {/* Inject animation keyframes for scan line */}
      <style>
        {`
          @keyframes scan-line {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
