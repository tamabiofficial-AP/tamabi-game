import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Move, Target } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import '../battle.css';
import type { PetUnit, Skill, Phase, BattleLog, DamagePopup } from '../engine/battleEngine';
import {
  getTurnOrder, tickCooldowns,
  getReachableCells, getTargetableCells,
  calculateDamage, calculateHeal,
  enemyDecide, checkBattleEnd, hexDistance,
  getElementBonus, makeSkills, applySkillStatus
} from '../engine/battleEngine';
import { processBattleResult } from '../engine/rewardSystem';
import type { BattleReward } from '../engine/rewardSystem';

const GRID_ROWS = 5;
const GRID_COLS = 4;

// Element color map
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ff6b6b', water: '#54a0ff', earth: '#c8a96e',
  nature: '#1dd1a1', light: '#feca57', dark: '#a55eea',
};

// Hardcoded Prototype IDs
const ENEMY_ID = '11111111-1111-1111-1111-111111111111';

import { SPECIES_EMOJI, SPECIES_IMAGES, TRAITS } from '../engine/petData';
import type { TraitName } from '../engine/petData';
const SPECIES_RANGED = ['Eagle', 'Bat'];

const getBackgroundForMode = (mode: string) => {
  if (mode === 'pve') return '/assets/bg_forest.jpg';
  if (mode === 'boss') return '/assets/bg_volcano.jpg';
  if (mode === 'pvp') return '/assets/bg_arena.jpg';
  return '/assets/bg_island.jpg';
};

interface OnlineBattleScreenProps {
  playerId: string;
  activePetIds: string[];
  opponentId: string;
  opponentActivePetIds: string[];
  roomChannel: any;
  isHost: boolean;
  onBack: () => void;
}

export default function OnlineBattleScreen({ playerId, activePetIds, opponentId, opponentActivePetIds, roomChannel, isHost, onBack }: OnlineBattleScreenProps) {
  const [units, setUnits] = useState<PetUnit[]>([]);
  useEffect(() => { console.log("[DEBUG] Units updated:", units); }, [units]);
  const [isLoading, setIsLoading] = useState(true);
  const [turnOrderIds, setTurnOrderIds] = useState<string[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('select_action');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [targetablePets, setTargetablePets] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isAuto, setIsAuto] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  // --- Refs to fix stale closures in setTimeouts ---
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const hasSavedRef = useRef(false);

  const [reward, setReward] = useState<BattleReward | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Initialize & Fetch Data ---
  useEffect(() => {
    async function loadPets() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pets')
        .select(`
          id, owner_id, name, trait, happiness, hunger, health, energy, bond,
          species_base_stats (
            name, element, base_hp, base_atk, base_def, base_spd
          )
        `)
        .in('owner_id', [playerId, opponentId]);

      if (error) {
        console.error('Error fetching pets:', error);
        addLog('❌ Database Error: ' + error.message, 'info');
        setIsLoading(false);
        return;
      }

      if (data) {
        let playerIndex = 0;
        let enemyIndex = 0;

        const filteredData = data.filter((pet: any) => 
          (pet.owner_id === playerId && activePetIds.includes(pet.id)) ||
          (pet.owner_id === opponentId && opponentActivePetIds.includes(pet.id))
        );

        const fetchedUnits: PetUnit[] = filteredData.map((pet: any) => {
          const s = pet.species_base_stats;
          
          // Battle Readiness (Care = Power)
          const readiness = ((pet.hunger || 0) + (pet.happiness || 0) + (pet.health || 0)) / 300; // 0.0 to 1.0
          const eff_multiplier = Math.max(0.5, readiness); // Minimum 50%

          // Apply trait multipliers
          const traitDef = TRAITS[(pet.trait as TraitName) || 'Normal'] || TRAITS['Normal'];

          const isPlayer = pet.owner_id === playerId;
          const bondValue = pet.bond || 0; // Both players use real bond
          
          // Positioning: Player on left (col 0), Enemy on right (col 3)
          let row = 0, col = 0;
          if (isPlayer) {
            col = 0;
            // Center the party based on number of pets
            if (activePetIds.length === 1) row = 2;
            else if (activePetIds.length === 2) row = playerIndex === 0 ? 1 : 3;
            else row = playerIndex + 1; // 1, 2, 3
            
            playerIndex++;
          } else {
            col = GRID_COLS - 1; // 3
            row = enemyIndex + 1; // simple stack
            enemyIndex++;
          }

          return {
            id: pet.id,
            name: pet.name,
            species: s.name,
            emoji: SPECIES_EMOJI[s.name] || '❓',
            element: s.element,
            team: isPlayer ? 'player' : 'enemy',
            maxHp: Math.round(s.base_hp * eff_multiplier),
            hp: Math.round(s.base_hp * eff_multiplier),
            atk: Math.round(s.base_atk * eff_multiplier * traitDef.bonusAtk),
            def: Math.round(s.base_def * eff_multiplier * traitDef.bonusDef),
            spd: Math.round(s.base_spd * eff_multiplier * traitDef.bonusSpd),
            skills: makeSkills(s.element, SPECIES_RANGED.includes(s.name), bondValue),
            cooldowns: {},
            statusEffects: [],
            row, col,
            hasMoved: false,
            hasActed: false,
            isDead: false
          };
        });

        setUnits(fetchedUnits);
        
        // Initialize turn order
        const order = getTurnOrder(fetchedUnits).map(u => u.id);
        setTurnOrderIds(order);
        setCurrentTurnIdx(0);
        
        setLogs([{ message: '⚔️ Battle Start! Fetching stats from Supabase...', type: 'info', timestamp: Date.now() }]);
      }
      setIsLoading(false);
    }
    loadPets();
  }, []);

  // --- Current Active Unit ---
  const activeUnitId = turnOrderIds[currentTurnIdx];
  const activeUnit = units.find(u => u.id === activeUnitId);
  const isPlayerTurn = activeUnit?.team === 'player';

  // --- Auto Battle Logic ---
  useEffect(() => {
    if (!isPlayerTurn || phase === 'animating' || phase === 'victory' || phase === 'defeat') return;
    if (isAuto) {
      const delay = setTimeout(() => {
        handleAutoAttack();
      }, 1000);
      return () => clearTimeout(delay);
    }
  }, [isAuto, isPlayerTurn, phase]);

  // --- Centralized Win/Lose Check ---
  useEffect(() => {
    if (phase === 'victory' || phase === 'defeat') return;
    if (units.length === 0) return; // Skip while loading
    const endResult = checkBattleEnd(units);
    
    if (endResult && !hasSavedRef.current) {
      hasSavedRef.current = true; // Prevent double saving
      setPhase(endResult);
      addLog(endResult === 'victory' ? '🏆 VICTORY! คุณชนะแล้ว!' : '💔 DEFEAT... คุณแพ้...', 'info');
      
      // Save results to Supabase
      setIsSaving(true);
      const playerUnits = units.filter(u => u.team === 'player');
      processBattleResult(endResult, playerId, playerUnits, undefined, 'pvp_online').then(res => {
        if (res) setReward(res);
        setIsSaving(false);
      });
    }
  }, [units, phase]);

  // --- Online Multiplayer Listeners ---
  useEffect(() => {
    if (!roomChannel) return;
    
    // We only attach the listener once, and use unitsRef to access latest state.
    roomChannel.on('broadcast', { event: 'battle_move' }, (payload: any) => {
      const data = payload.payload;
      const unit = unitsRef.current.find(u => u.id === data.unitId);
      if (!unit) return;
      
      if (data.action === 'move') {
        const flippedCol = (GRID_COLS - 1) - data.col; // Flip col for symmetry
        setUnits(prev => prev.map(u =>
          u.id === data.unitId ? { ...u, row: data.row, col: flippedCol, hasMoved: true } : u
        ));
        addLog(`${unit.emoji} ${unit.name} เคลื่อนที่ไปช่อง (${data.row},${flippedCol})`, 'info');
      } else if (data.action === 'guard') {
        addLog(`${unit.emoji} ${unit.name} ตั้งรับ! DEF +50% เทิร์นนี้`, 'info');
        setUnits(prev => prev.map(u => u.id === data.unitId ? { ...u, hasActed: true } : u));
        setTimeout(() => advanceTurn(), 400);
      } else if (data.action === 'skill') {
        const targetUnit = unitsRef.current.find(u => u.id === data.targetId);
        const skill = unit.skills.find((s: Skill) => s.id === data.skillId);
        if (targetUnit && skill) {
          if (skill.heal) {
            executeHeal(unit, targetUnit, skill);
          } else if (skill.type === 'utility' && !skill.damage) {
            executeUtility(unit, targetUnit, skill);
          } else {
            executeAttack(unit, targetUnit, skill);
          }
          setTimeout(() => advanceTurn(), 600);
        }
      } else if (data.action === 'skip') {
        addLog(`${unit.emoji} ${unit.name} จบเทิร์น`, 'info');
        setTimeout(() => advanceTurn(), 300);
      }
    });

    // Note: We don't unsubscribe because we are using an already subscribed channel from props.
    // If we call .on again it might stack, but we ensure it only runs once by depending only on roomChannel
  }, [roomChannel]);

  // --- Auto-scroll log ---
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // --- Cleanup old damage popups ---
  useEffect(() => {
    const interval = setInterval(() => {
      setDamagePopups(prev => prev.filter(p => Date.now() - p.timestamp < 1200));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // --- Helper: Add Log ---
  function addLog(message: string, type: BattleLog['type']) {
    setLogs(prev => [...prev.slice(-20), { message, type, timestamp: Date.now() }]);
  }

  // --- Helper: Add Damage Popup ---
  function addPopup(row: number, col: number, amount: number, type: DamagePopup['type']) {
    setDamagePopups(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, row, col, amount, type, timestamp: Date.now() }]);
  }

  // --- Advance to Next Turn ---
  function advanceTurn() {
    // GUARD: Never advance if game is over (using Ref for latest state)
    if (phaseRef.current === 'victory' || phaseRef.current === 'defeat') return;
    if (checkBattleEnd(unitsRef.current)) return;

    let nextIdx = currentTurnIdx + 1;

    // If we've gone through all units, start a new round
    if (nextIdx >= turnOrderIds.length) {
      nextIdx = 0;
      setTurnNumber(t => t + 1);

      let updatedUnits = [...unitsRef.current];

      // Process End of Round Effects (Poison) and tick cooldowns
      updatedUnits = updatedUnits.map(u => {
        if (u.isDead) return u;
        let finalU = { ...u };
        
        // Take poison damage
        const poisonEffect = finalU.statusEffects.find(e => e.type === 'poison');
        if (poisonEffect && poisonEffect.damagePerTurn) {
          const dmg = poisonEffect.damagePerTurn;
          finalU.hp = Math.max(0, finalU.hp - dmg);
          addLog(`☠️ ${finalU.emoji} ${finalU.name} โดนพิษลด ${dmg} HP!`, 'damage');
          addPopup(finalU.row, finalU.col, dmg, 'damage');
          if (finalU.hp <= 0) {
            finalU.isDead = true;
            addLog(`💀 ${finalU.emoji} ${finalU.name} สิ้นใจเพราะพิษ!`, 'death');
          }
        }
        
        return finalU;
      });

      const newOrder = getTurnOrder(updatedUnits).map(u => u.id);
      setTurnOrderIds(newOrder);
      setUnits(updatedUnits);
      // Wait for next cycle to update order
      setTimeout(() => {
        setUnits(prev => prev.map(u => u.id === newOrder[0] && !u.isDead ? tickCooldowns(u) : u));
      }, 0);
    } else {
      const nextUnitId = turnOrderIds[nextIdx];
      setUnits(prev => prev.map(u => u.id === nextUnitId && !u.isDead ? tickCooldowns(u) : u));
    }

    setCurrentTurnIdx(nextIdx);

    setSelectedSkill(null);
    setHighlightedCells(new Set());
    setTargetablePets(new Set());
    setPhase('select_action');
  }

  // --- Handle Auto-Attack (Time ran out) ---
  function handleAutoAttack() {
    if (!activeUnit || phaseRef.current === 'victory' || phaseRef.current === 'defeat') return;
    const enemies = unitsRef.current.filter(u => u.team !== activeUnit.team && !u.isDead);
    if (enemies.length === 0) return;

    // Find closest enemy
    let closest = enemies[0];
    let minDist = hexDistance(activeUnit.row, activeUnit.col, closest.row, closest.col);
    for (const e of enemies) {
      const d = hexDistance(activeUnit.row, activeUnit.col, e.row, e.col);
      if (d < minDist) { closest = e; minDist = d; }
    }

    const basicSkill = activeUnit.skills[0];
    if (minDist <= basicSkill.range) {
      executeAttack(activeUnit, closest, basicSkill);
    } else {
      addLog(`${activeUnit.emoji} ${activeUnit.name} ไม่มีเป้าหมายในระยะ!`, 'info');
    }
    setTimeout(() => advanceTurn(), 600);
  }

  // --- Execute Attack ---
  function executeAttack(attacker: PetUnit, mainTarget: PetUnit, skill: Skill) {
    // Calculate targets first outside state updater
    const targets = skill.aoe > 0
      ? units.filter(u => u.team !== attacker.team && !u.isDead && hexDistance(mainTarget.row, mainTarget.col, u.row, u.col) <= skill.aoe)
      : [mainTarget];

    // Compute all changes before updating state (prevents React Strict Mode double-firing side effects)
    let updatedUnits = [...units];
    
    // Seed Math.random so both clients calculate the exact same crits/dodges
    let seed = turnNumber * 1000 + currentTurnIdx + (attacker.id.charCodeAt(0) || 0);
    const originalRandom = Math.random;
    Math.random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    
    targets.forEach(target => {
      const result = calculateDamage(attacker, target, skill);
      const elBonus = getElementBonus(attacker.element, target.element);
      let logMsg = `${attacker.emoji} ${attacker.name} ใช้ ${skill.icon} ${skill.name} → ${target.emoji} ${target.name}: -${result.damage} HP`;
      if (result.isCritical) logMsg += ' 💥 CRITICAL!';
      if (elBonus > 1) logMsg += ' 🔺 ได้เปรียบธาตุ!';
      if (elBonus < 1) logMsg += ' 🔻 เสียเปรียบธาตุ';

      addLog(logMsg, result.isCritical ? 'critical' : 'damage');
      addPopup(target.row, target.col, result.damage, 'damage');

      updatedUnits = updatedUnits.map(u => {
        if (u.id === target.id) {
          const newHp = Math.max(0, u.hp - result.damage);
          const dead = newHp <= 0;
          if (dead) addLog(`💀 ${u.emoji} ${u.name} ถูกกำจัด!`, 'death');
          return { ...u, hp: newHp, isDead: dead };
        }
        return u;
      });
    });

    // Restore Math.random
    Math.random = originalRandom;

    // Apply cooldown to attacker
    updatedUnits = updatedUnits.map(u => {
      if (u.id === attacker.id) {
        return { ...u, cooldowns: { ...u.cooldowns, [skill.id]: skill.cooldown }, hasActed: true };
      }
      return u;
    });

    // Apply Status Effects (if any)
    if (skill.applyStatus) {
      updatedUnits = applySkillStatus(skill, attacker, mainTarget, updatedUnits);
      if (skill.applyStatus.type === 'poison') {
        addLog(`☠️ ${mainTarget.emoji} ${mainTarget.name} ติดพิษ! (${skill.applyStatus.damagePerTurn} dmg/${skill.applyStatus.duration} เทิร์น)`, 'damage');
      } else if (skill.applyStatus.type === 'buff') {
        const targetName = skill.applyStatus.target === 'self' ? attacker.name : mainTarget.name;
        addLog(`✨ ${targetName} ได้รับบัฟ ${skill.applyStatus.name}!`, 'info');
      } else if (skill.applyStatus.type === 'debuff') {
        addLog(`🔻 ${mainTarget.emoji} ${mainTarget.name} ถูกลดสถานะ ${skill.applyStatus.name}!`, 'info');
      }
    }

    setUnits(updatedUnits);
  }

  // --- Execute Heal ---
  function executeHeal(healer: PetUnit, mainTarget: PetUnit, skill: Skill) {
    const targets = skill.aoe > 0
      ? units.filter(u => u.team === healer.team && !u.isDead && hexDistance(mainTarget.row, mainTarget.col, u.row, u.col) <= skill.aoe)
      : [mainTarget];

    let updatedUnits = [...units];
    targets.forEach(target => {
      const healAmount = calculateHeal(healer, target, skill);
      addLog(`${healer.emoji} ${healer.name} ใช้ ${skill.icon} ${skill.name} → ${target.emoji} ${target.name}: +${healAmount} HP`, 'heal');
      addPopup(target.row, target.col, healAmount, 'heal');

      updatedUnits = updatedUnits.map(u => u.id === target.id ? { ...u, hp: Math.min(u.maxHp, u.hp + healAmount) } : u);
    });

    updatedUnits = updatedUnits.map(u => u.id === healer.id ? { ...u, cooldowns: { ...u.cooldowns, [skill.id]: skill.cooldown }, hasActed: true } : u);

    // Apply Status Effects
    updatedUnits = applySkillStatus(skill, healer, mainTarget, updatedUnits);

    setUnits(updatedUnits);
  }

  // --- Execute Utility ---
  function executeUtility(caster: PetUnit, mainTarget: PetUnit, skill: Skill) {
    let updatedUnits = [...units];
    addLog(`${caster.emoji} ${caster.name} ใช้ ${skill.icon} ${skill.name}!`, 'info');

    // Put skill on cooldown
    updatedUnits = updatedUnits.map(u => u.id === caster.id ? { ...u, cooldowns: { ...u.cooldowns, [skill.id]: skill.cooldown }, hasActed: true } : u);

    // Apply Status Effects
    updatedUnits = applySkillStatus(skill, caster, mainTarget, updatedUnits);

    // Log the status effect
    if (skill.applyStatus) {
      if (skill.applyStatus.type === 'buff') {
        const targetName = skill.applyStatus.target === 'self' ? caster.name : mainTarget.name;
        addLog(`✨ ${targetName} ได้รับบัฟ ${skill.applyStatus.name}!`, 'info');
      }
    }

    setUnits(updatedUnits);
  }

  // --- Enemy AI Execution (Removed for Online Multiplayer) ---
  // We no longer execute AI, we wait for broadcast events.

  // --- Player Click on Hex Cell ---
  function handleCellClick(row: number, col: number) {
    if (!isPlayerTurn || phase === 'animating' || phase === 'victory' || phase === 'defeat') return;

    const key = `${row},${col}`;

    // Phase: Select Move Target
    if (phase === 'select_move' && highlightedCells.has(key)) {
      if (roomChannel) {
        roomChannel.send({ type: 'broadcast', event: 'battle_move', payload: { action: 'move', row, col, unitId: activeUnit.id } });
      }
      setUnits(prev => prev.map(u =>
        u.id === activeUnit.id ? { ...u, row, col, hasMoved: true } : u
      ));
      addLog(`${activeUnit.emoji} ${activeUnit.name} เคลื่อนที่ไปช่อง (${row},${col})`, 'info');
      setPhase('select_action');
      setHighlightedCells(new Set());
      return;
    }

    // Phase: Select Target (Attack or Heal)
    if (phase === 'select_target' && selectedSkill) {
      const targetUnit = units.find(u => u.row === row && u.col === col && !u.isDead);
      if (targetUnit && targetablePets.has(targetUnit.id)) {
        if (roomChannel) {
          roomChannel.send({ type: 'broadcast', event: 'battle_move', payload: { action: 'skill', targetId: targetUnit.id, skillId: selectedSkill.id, unitId: activeUnit.id } });
        }
        if (selectedSkill.heal) {
          executeHeal(activeUnit, targetUnit, selectedSkill);
        } else if (selectedSkill.type === 'utility' && !selectedSkill.damage) {
          executeUtility(activeUnit, targetUnit, selectedSkill);
        } else {
          executeAttack(activeUnit, targetUnit, selectedSkill);
        }
        setSelectedSkill(null);
        setTargetablePets(new Set());
        setTimeout(() => advanceTurn(), 600);
        return;
      }
    }
  }

  // --- Player: Select "Move" ---
  function handleSelectMove() {
    if (!activeUnit || activeUnit.hasMoved) return;
    const cells = getReachableCells(activeUnit, units, GRID_ROWS, GRID_COLS, 2);
    setHighlightedCells(new Set(cells.map(c => `${c.row},${c.col}`)));
    setPhase('select_move');
    setSelectedSkill(null);
    setTargetablePets(new Set());
  }

  // --- Player: Select a Skill ---
  function handleSelectSkill(skill: Skill) {
    if (!activeUnit || activeUnit.hasActed) return;
    if (skill.type === 'passive') {
      if (roomChannel) {
        roomChannel.send({ type: 'broadcast', event: 'battle_move', payload: { action: 'guard', unitId: activeUnit.id, skillId: skill.id } });
      }
      // Guard: boost DEF this turn
      addLog(`${activeUnit.emoji} ${activeUnit.name} ตั้งรับ! DEF +50% เทิร์นนี้`, 'info');
      setUnits(prev => prev.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u));
      setTimeout(() => advanceTurn(), 400);
      return;
    }

    const cd = activeUnit.cooldowns[skill.id] || 0;
    if (cd > 0) return; // On cooldown

    const targets = getTargetableCells(activeUnit, skill, units);
    if (targets.length === 0) {
      addLog(`❌ ไม่มีเป้าหมายในระยะสำหรับ ${skill.name}!`, 'info');
      return;
    }

    setSelectedSkill(skill);
    setTargetablePets(new Set(targets.map(t => t.id)));
    setHighlightedCells(new Set(targets.map(t => `${t.row},${t.col}`)));
    setPhase('select_target');
  }

  // --- Render Loading ---
  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h2 style={{ marginBottom: '1rem' }}>🔄 Loading from Supabase...</h2>
        <p style={{ opacity: 0.7 }}>ดึงข้อมูลสัตว์เลี้ยงและคำนวณค่า Care Stats</p>
      </div>
    );
  }

  // --- Render Helpers ---
  function getUnitAt(row: number, col: number): PetUnit | undefined {
    return units.find(u => u.row === row && u.col === col && !u.isDead);
  }

  function getCellClass(row: number, col: number): string {
    const unit = getUnitAt(row, col);
    const key = `${row},${col}`;
    let cls = 'hex-cell';
    if (unit) cls += ` ${unit.team}`;
    if (unit && activeUnit && unit.id === activeUnit.id && isPlayerTurn) cls += ' active-unit';
    if (highlightedCells.has(key)) cls += ' highlight';
    if (targetablePets.size > 0 && unit && targetablePets.has(unit.id)) cls += ' target-glow';
    return cls;
  }

  // --- Victory / Defeat Overlay ---
  if (phase === 'victory' || phase === 'defeat') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.85)' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: phase === 'victory' ? '#feca57' : '#ff6b6b' }}>
          {phase === 'victory' ? 'VICTORY!' : 'DEFEAT'}
        </h1>
        
        {isSaving ? (
          <p style={{ fontSize: '1.2rem', margin: '2rem 0' }}>⏳ กำลังบันทึกผลการต่อสู้ลงฐานข้อมูล...</p>
        ) : reward ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', minWidth: '300px', animation: 'popup 0.5s ease-out' }}>
            <h3 style={{ marginBottom: '1rem', color: '#1dd1a1' }}>รางวัลที่ได้รับ</h3>
            {true ? (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: phase === 'victory' ? '#feca57' : '#ff6b6b' }}>
                  🏆 Rating: {reward?.eloChange! > 0 ? '+' : ''}{reward?.eloChange} (รวม: {reward?.newElo})
                </p>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1dd1a1' }}>
                  ⭐ +{reward?.expGained} Battle EXP
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🪙 +{reward?.coins} Pet Coins</p>
                {reward?.expGained && <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1dd1a1' }}>⭐ +{reward?.expGained} Battle EXP</p>}
                {reward?.starPoints && <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#feca57' }}>⭐ +{reward?.starPoints} Star Points</p>}
                {reward?.couponId && <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ff9f43' }}>🎟️ ได้รับคูปองพิเศษ!</p>}
              </>
            )}
            <hr style={{ margin: '1.5rem 0', opacity: 0.2 }} />
            <h3 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>สถานะสัตว์เลี้ยงที่เสียไป</h3>
            <p>⚡ Energy: -{reward?.energyCost}</p>
            <p>💖 Happiness: -{reward?.happinessCost}</p>
          </div>
        ) : (
          <p style={{ color: '#ff6b6b', margin: '2rem 0' }}>❌ บันทึกผลการต่อสู้ล้มเหลว</p>
        )}

        <button 
          className="btn" 
          style={{ marginTop: '2rem', padding: '1rem 3rem', fontSize: '1.2rem', background: 'var(--primary-gradient)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.4)' }}
          onClick={onBack}
          disabled={isSaving}
        >
          {isSaving ? 'กำลังบันทึก...' : 'กลับหน้าหลัก'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem',
      backgroundImage: `url('${getBackgroundForMode('pvp')}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      {/* Overlay for text readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))', zIndex: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 1, position: 'relative', gap: '0.5rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-icon" onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1rem' }}>Ranked PvP — Turn {turnNumber}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {isPlayerTurn
              ? `🎮 Your Turn: ${activeUnit?.emoji} ${activeUnit?.name}`
              : `🤖 Enemy Turn: ${activeUnit?.emoji} ${activeUnit?.name}`
            }
          </span>
        </div>
        {/* Auto Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setIsAuto(!isAuto)}
            style={{ 
              background: isAuto ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
              color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '12px',
              fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {isAuto ? '▶ AUTO ON' : '⏸ AUTO OFF'}
          </button>
        </div>
      </header>

      {/* Turn Order Bar */}
      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', padding: '0.3rem 0' }}>
        {turnOrderIds.map((id, i) => {
          const u = units.find(unit => unit.id === id);
          if (!u || u.isDead) return null;
          return (
            <div key={u.id} style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: i === currentTurnIdx ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${i === currentTurnIdx ? 'var(--accent-color)' : ELEMENT_COLORS[u.element]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', transition: 'all 0.3s',
                transform: i === currentTurnIdx ? 'scale(1.2)' : 'scale(1)',
                overflow: 'hidden'
              }}>
                <img 
                  src={SPECIES_IMAGES[u.species] || '/assets/pets/dragon.jpg'} 
                  alt={u.species}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            );
        })}
      </div>

      {/* Hex Grid Board */}
      <div className="hex-grid glass-panel" style={{ flex: 1, padding: '0.8rem 0.5rem', overflow: 'visible', position: 'relative' }}>
        {Array.from({ length: GRID_ROWS }, (_, r) => (
          <div key={r} className="hex-row">
            {Array.from({ length: GRID_COLS }, (_, c) => {
              const unit = getUnitAt(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  className={getCellClass(r, c)}
                  onClick={() => handleCellClick(r, c)}
                >
                  <div className="hex-cell-bg" />
                  {unit && (
                    <>
                      {/* Status Effects */}
                      {unit.statusEffects.length > 0 && (
                        <div style={{ position: 'absolute', top: '-25px', left: '-20%', width: '140%', display: 'flex', justifyContent: 'center', gap: '4px', zIndex: 999, pointerEvents: 'none' }}>
                          {unit.statusEffects.map((se, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', alignItems: 'center', gap: '2px',
                              fontSize: '0.85rem', 
                              background: se.type === 'poison' ? 'rgba(200,0,0,0.85)' : 'rgba(29,209,161,0.85)', 
                              borderRadius: '6px', 
                              padding: '2px 6px', 
                              border: `1px solid ${se.type === 'poison' ? '#ff6b6b' : '#1dd1a1'}`,
                              animation: se.type === 'poison' ? 'poison-pulse 1s infinite alternate' : 'none',
                              color: 'white',
                              fontWeight: 'bold',
                              textShadow: '0 1px 2px black',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                            }}>
                              <span>{se.type === 'poison' ? '☠️' : se.statModifier?.atk ? '⚔️' : se.statModifier?.def ? '🛡️' : '💨'}</span>
                              <span style={{ fontSize: '0.7rem' }}>{se.turnsRemaining}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Element Icon */}
                      <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.65rem', zIndex: 3, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                        {
                          unit.element === 'fire' ? '🔥' :
                          unit.element === 'water' ? '💧' :
                          unit.element === 'earth' ? '🪨' :
                          unit.element === 'nature' ? '🍃' :
                          unit.element === 'light' ? '✨' :
                          unit.element === 'dark' ? '🌑' : '⚡'
                        }
                      </span>
                      <div className="pet-token" style={{ overflow: 'hidden', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={SPECIES_IMAGES[unit.species] || '/assets/pets/dragon.jpg'} 
                          alt={unit.species}
                          style={{ width: '90%', height: '90%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      </div>
                      <div className="hp-bar-mini" style={{ position: 'relative' }}>
                        <div
                          className={`hp-bar-fill ${(unit.hp / unit.maxHp) < 0.3 ? 'danger' : ''}`}
                          style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                        />
                        <span style={{ position: 'absolute', left: '-50%', width: '200%', textAlign: 'center', fontSize: '0.65rem', top: '4px', color: 'white', textShadow: '1px 1px 2px black, 0 0 4px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>
                          {unit.hp}/{unit.maxHp}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Damage Popups — Rendered as overlay OUTSIDE hex cells to avoid clip-path */}
        {damagePopups.map(p => {
          // Calculate approximate pixel position from grid row/col
          const xBase = p.col * 64 + (p.row % 2 === 1 ? 32 : 0) + 30;
          const yBase = p.row * 52 + 30;
          return (
            <span
              key={p.id}
              className={`damage-popup ${p.type}`}
              style={{
                left: `${xBase}px`,
                top: `${yBase}px`,
              }}
            >
              {p.type === 'heal' ? `+${p.amount}` : `-${p.amount}`}
            </span>
          );
        })}
      </div>

      {/* Battle Log */}
      <div ref={logRef} className="glass-panel" style={{
        padding: '0.5rem 0.8rem', maxHeight: '60px', overflowY: 'auto',
        fontSize: '0.7rem', lineHeight: '1.4',
      }}>
        {logs.slice(-5).map((log, i) => (
          <div key={i} style={{
            color: log.type === 'damage' ? '#ff6b6b'
              : log.type === 'heal' ? '#1dd1a1'
              : log.type === 'critical' ? '#feca57'
              : log.type === 'death' ? '#a55eea'
              : 'var(--text-muted)',
            opacity: i === logs.slice(-5).length - 1 ? 1 : 0.6,
          }}>
            {log.message}
          </div>
        ))}
      </div>

      {/* Action Bar (Always Show Player's Box) */}
      {(() => {
        // Find which player's skills to display
        const displayUnit = isPlayerTurn && activeUnit?.team === 'player'
          ? activeUnit
          : units.find(u => turnOrderIds.includes(u.id) && u.team === 'player' && !u.isDead);

        return (
          <div className="glass-panel" style={{ padding: '0.8rem', opacity: isPlayerTurn ? 1 : 0.7 }}>
            {/* Move & End Turn Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
              <button
                className={`skill-btn ${phase === 'select_move' ? 'selected' : ''}`}
                onClick={handleSelectMove}
                disabled={!isPlayerTurn || activeUnit?.hasMoved}
                style={{ width: 'auto', padding: '0.4rem 1rem', opacity: (!isPlayerTurn || activeUnit?.hasMoved) ? 0.4 : 1, fontSize: '0.8rem', gap: '0.3rem' }}
                title="เดิน (1-2 ช่อง)"
              >
                <Move size={16} /> Move
              </button>
              <button
                className="skill-btn"
                onClick={() => {
                  if (!activeUnit || !isPlayerTurn) return;
                  if (roomChannel) {
                    roomChannel.send({ type: 'broadcast', event: 'battle_move', payload: { action: 'skip', unitId: activeUnit.id } });
                  }
                  addLog(`${activeUnit.emoji} ${activeUnit.name} จบเทิร์น`, 'info');
                  setSelectedSkill(null);
                  setHighlightedCells(new Set());
                  setTargetablePets(new Set());
                  setTimeout(() => advanceTurn(), 300);
                }}
                disabled={!isPlayerTurn}
                style={{ width: 'auto', padding: '0.4rem 1rem', opacity: !isPlayerTurn ? 0.4 : 1, fontSize: '0.8rem', gap: '0.3rem', background: 'rgba(255,107,107,0.2)', borderColor: 'rgba(255,107,107,0.4)' }}
                title="จบเทิร์นโดยไม่ทำอะไร"
              >
                ⏭️ จบเทิร์น
              </button>
            </div>

            {/* Skills */}
            <div className="skill-bar">
              {displayUnit?.skills.map(skill => {
                const cd = displayUnit.cooldowns[skill.id] || 0;
                const isDisabled = !isPlayerTurn || activeUnit?.hasActed || (cd > 0) || skill.locked;
                return (
                  <button
                    key={skill.id}
                    className={`skill-btn ${skill.type === 'ultimate' ? 'ultimate' : ''} ${selectedSkill?.id === skill.id ? 'selected' : ''}`}
                    onClick={() => !isDisabled && handleSelectSkill(skill)}
                    title={skill.locked ? `🔒 ${skill.name} — ปลดล็อคที่ Bond ${skill.type === 'ultimate' ? 80 : 40}` : `${skill.name} — ${skill.description}${cd > 0 ? ` (CD: ${cd})` : ''}`}
                    style={{ opacity: isDisabled ? 0.35 : 1, position: 'relative' }}
                  >
                    <span>{skill.locked ? '🔒' : skill.icon}</span>
                    {cd > 0 && !skill.locked && (
                      <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        background: '#ff6b6b', color: 'white', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '0.6rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800,
                      }}>{cd}</span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Skill Details Panel */}
            {selectedSkill && (
              <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', textAlign: 'center', animation: 'fadeIn 0.2s' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                  {selectedSkill.icon} {selectedSkill.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'white' }}>
                  {selectedSkill.description}
                </div>
                {selectedSkill.damage ? <div style={{ fontSize: '0.7rem', color: '#ff6b6b', marginTop: '0.2rem' }}>ดาเมจ: {selectedSkill.damage}%</div> : null}
                {selectedSkill.heal ? <div style={{ fontSize: '0.7rem', color: '#1dd1a1', marginTop: '0.2rem' }}>ฟื้นฟู: {selectedSkill.heal}%</div> : null}
              </div>
            )}
          </div>
        );
      })()}

      {/* Enemy Turn Indicator Overlay */}
      {!isPlayerTurn && phase === 'enemy_turn' && (
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#ff6b6b' }}>
            🤖 {activeUnit?.emoji} {activeUnit?.name} กำลังคิด...
          </span>
        </div>
      )}
    </div>
    </div>
  );
}
