// =============================================
// Tamabi Battle Engine — Core Game Logic
// =============================================

// --- Types ---
export interface PetUnit {
  id: string;
  name: string;
  emoji: string;
  element: 'fire' | 'water' | 'earth' | 'nature' | 'light' | 'dark';
  team: 'player' | 'enemy';
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  skills: Skill[];
  cooldowns: Record<string, number>; // skillId -> turns remaining
  statusEffects: StatusEffect[];
  row: number;
  col: number;
  hasMoved: boolean;
  hasActed: boolean;
  isDead: boolean;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  type: 'basic' | 'passive' | 'utility' | 'attack' | 'ultimate';
  damage?: number;       // Base damage multiplier (% of ATK)
  heal?: number;         // Base heal amount (% of max HP)
  range: number;         // How far it can reach (hex cells)
  aoe: number;           // 0 = single target, 1+ = area
  cooldown: number;      // Turns before reuse (0 = no cooldown)
  description: string;
  applyStatus?: Omit<StatusEffect, 'turnsRemaining'> & { duration: number; target: 'self' | 'enemy' | 'ally' };
  locked?: boolean;      // True if skill is locked due to low Bond
}

export interface StatusEffect {
  id: string;
  name: string;
  turnsRemaining: number;
  type: 'buff' | 'debuff' | 'poison';
  statModifier?: {
    atk?: number;
    def?: number;
    spd?: number;
  };
  damagePerTurn?: number; // For poison
}

export type Phase = 'select_pet' | 'select_action' | 'select_move' | 'select_target' | 'animating' | 'enemy_turn' | 'victory' | 'defeat';

export interface BattleLog {
  message: string;
  type: 'damage' | 'heal' | 'info' | 'critical' | 'death';
  timestamp: number;
}

export interface DamagePopup {
  id: string;
  row: number;
  col: number;
  amount: number;
  type: 'damage' | 'heal' | 'miss';
  timestamp: number;
}

// --- Element Advantage (+15% / -15%) ---
const ELEMENT_CHART: Record<string, string> = {
  fire: 'nature',
  nature: 'earth',
  earth: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
};

export function getElementBonus(attacker: string, defender: string): number {
  if (ELEMENT_CHART[attacker] === defender) return 1.15; // +15% advantage
  if (ELEMENT_CHART[defender] === attacker) return 0.85; // -15% disadvantage
  return 1.0; // Neutral
}

// --- Hex Distance ---
export function hexDistance(r1: number, c1: number, r2: number, c2: number): number {
  // Offset coordinates to cube coordinates for accurate distance
  const toC = (r: number, c: number) => {
    const x = c - (r - (r & 1)) / 2;
    const z = r;
    const y = -x - z;
    return { x, y, z };
  };
  const a = toC(r1, c1);
  const b = toC(r2, c2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

// --- Get Reachable Cells for Movement ---
export function getReachableCells(
  unit: PetUnit,
  allUnits: PetUnit[],
  gridRows: number,
  gridCols: number,
  maxMove: number = 2
): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = [];
  const occupied = new Set(allUnits.filter(u => !u.isDead).map(u => `${u.row},${u.col}`));

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (r === unit.row && c === unit.col) continue;
      if (occupied.has(`${r},${c}`)) continue;
      if (hexDistance(unit.row, unit.col, r, c) <= maxMove) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

// --- Get Targetable Cells for a Skill ---
export function getTargetableCells(
  unit: PetUnit,
  skill: Skill,
  allUnits: PetUnit[]
): PetUnit[] {
  return allUnits.filter(target => {
    if (target.isDead) return false;
    const dist = hexDistance(unit.row, unit.col, target.row, target.col);
    if (dist > skill.range) return false;

    if (skill.applyStatus) {
      const targetType = skill.applyStatus.target;
      if (targetType === 'self') return target.id === unit.id;
      if (targetType === 'enemy') return target.team !== unit.team;
      if (targetType === 'ally') return target.team === unit.team;
    }

    if (skill.heal) {
      return target.team === unit.team;
    } else {
      return target.team !== unit.team;
    }
  });
}

// --- Apply Status Effects from Skill ---
export function applySkillStatus(
  skill: Skill,
  caster: PetUnit,
  mainTarget: PetUnit,
  allUnits: PetUnit[]
): PetUnit[] {
  if (!skill.applyStatus) return allUnits;
  
  const status = skill.applyStatus;
  const newEffect: StatusEffect = {
    id: status.id,
    name: status.name,
    type: status.type,
    turnsRemaining: status.duration,
    statModifier: status.statModifier,
    damagePerTurn: status.damagePerTurn
  };

  return allUnits.map(u => {
    let shouldApply = false;
    if (status.target === 'self' && u.id === caster.id) shouldApply = true;
    else if (status.target === 'enemy' && u.id === mainTarget.id) shouldApply = true;
    else if (status.target === 'ally' && u.id === mainTarget.id) shouldApply = true;

    if (shouldApply) {
      // Remove existing status with same id if any, then add new one
      const filtered = u.statusEffects.filter(e => e.id !== status.id);
      return { ...u, statusEffects: [...filtered, newEffect] };
    }
    return u;
  });
}

// --- Get Effective Stat ---
export function getEffectiveStat(unit: PetUnit, stat: 'atk' | 'def' | 'spd'): number {
  let multiplier = 1;
  for (const effect of unit.statusEffects) {
    if (effect.statModifier && effect.statModifier[stat]) {
      multiplier *= effect.statModifier[stat]!;
    }
  }
  return unit[stat] * multiplier;
}

// --- Calculate Damage ---
export function calculateDamage(
  attacker: PetUnit,
  defender: PetUnit,
  skill: Skill
): { damage: number; isCritical: boolean; elementBonus: number } {
  const effAtk = getEffectiveStat(attacker, 'atk');
  const effDef = getEffectiveStat(defender, 'def');
  const baseDmg = effAtk * ((skill.damage || 100) / 100);
  const defense = Math.max(1, effDef * 0.5);
  const elementBonus = getElementBonus(attacker.element, defender.element);
  const isCritical = Math.random() < 0.15; // 15% crit chance
  const critMultiplier = isCritical ? 1.5 : 1;
  const randomFactor = 0.9 + Math.random() * 0.2; // ±10% variance

  if (skill.damage === 0) return { damage: 0, isCritical: false, elementBonus: 1 };

  const rawDamage = Math.round((baseDmg - defense) * elementBonus * critMultiplier * randomFactor);
  return {
    damage: Math.max(1, rawDamage),
    isCritical,
    elementBonus,
  };
}

// --- Calculate Heal ---
export function calculateHeal(healer: PetUnit, target: PetUnit, skill: Skill): number {
  const healAmount = Math.round(target.maxHp * ((skill.heal || 30) / 100));
  return Math.min(healAmount, target.maxHp - target.hp); // Don't overheal
}

// --- Turn Order (Speed based) ---
export function getTurnOrder(units: PetUnit[]): PetUnit[] {
  return [...units]
    .filter(u => !u.isDead)
    .sort((a, b) => getEffectiveStat(b, 'spd') - getEffectiveStat(a, 'spd')); // Fastest first
}

// --- Simple Enemy AI ---
export function enemyDecide(
  enemyUnit: PetUnit,
  allUnits: PetUnit[],
  gridRows: number,
  gridCols: number
): { action: 'attack' | 'move'; targetId?: string; skillId: string; moveTarget?: { row: number; col: number } } {
  const playerUnits = allUnits.filter(u => u.team === 'player' && !u.isDead);
  if (playerUnits.length === 0) return { action: 'attack', skillId: 's1' };

  // Find closest player unit
  let closestTarget = playerUnits[0];
  let minDist = hexDistance(enemyUnit.row, enemyUnit.col, closestTarget.row, closestTarget.col);
  for (const pu of playerUnits) {
    const d = hexDistance(enemyUnit.row, enemyUnit.col, pu.row, pu.col);
    if (d < minDist) { closestTarget = pu; minDist = d; }
  }

  // Try to use strongest available skill
  const availableSkills = enemyUnit.skills.filter(
    s => s.type !== 'passive' && (enemyUnit.cooldowns[s.id] || 0) <= 0
  );
  const bestSkill = availableSkills.sort((a, b) => (b.damage || 0) - (a.damage || 0))[0] || enemyUnit.skills[0];

  // If in range, attack
  if (minDist <= bestSkill.range) {
    return { action: 'attack', targetId: closestTarget.id, skillId: bestSkill.id };
  }

  // Otherwise, move closer then attack if possible
  const reachable = getReachableCells(enemyUnit, allUnits, gridRows, gridCols, 2);
  let bestMove = reachable[0];
  let bestMoveDist = Infinity;
  for (const cell of reachable) {
    const d = hexDistance(cell.row, cell.col, closestTarget.row, closestTarget.col);
    if (d < bestMoveDist) { bestMoveDist = d; bestMove = cell; }
  }

  if (bestMove && bestMoveDist <= bestSkill.range) {
    return { action: 'attack', targetId: closestTarget.id, skillId: bestSkill.id, moveTarget: bestMove };
  }

  if (bestMove) {
    return { action: 'move', skillId: bestSkill.id, moveTarget: bestMove };
  }

  return { action: 'attack', targetId: closestTarget.id, skillId: bestSkill.id };
}

// --- Check Win/Lose ---
export function checkBattleEnd(units: PetUnit[]): 'victory' | 'defeat' | null {
  const playerAlive = units.some(u => u.team === 'player' && !u.isDead);
  const enemyAlive = units.some(u => u.team === 'enemy' && !u.isDead);
  if (!enemyAlive) return 'victory';
  if (!playerAlive) return 'defeat';
  return null;
}

// --- Reduce Cooldowns at Start of Turn ---
export function tickCooldowns(unit: PetUnit): PetUnit {
  const newCooldowns: Record<string, number> = {};
  for (const [skillId, cd] of Object.entries(unit.cooldowns)) {
    newCooldowns[skillId] = Math.max(0, cd - 1);
  }

  // Tick status effects
  const newStatusEffects = unit.statusEffects
    .map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
    .filter(effect => effect.turnsRemaining > 0);

  return { ...unit, cooldowns: newCooldowns, statusEffects: newStatusEffects, hasMoved: false, hasActed: false };
}

// --- Mock Data Generators ---
export function makeSkills(element: string, isRanged: boolean = false, bond: number = 100): Skill[] {
  const elementEmoji: Record<string, string> = {
    fire: '🔥', water: '💧', earth: '🪨', nature: '🍃', wind: '🌪️', light: '✨', dark: '🌑',
  };
  const em = elementEmoji[element] || '⚡';
  const baseRange = isRanged ? 2 : 1;
  
  const skills: Skill[] = [
    { id: 's1', name: 'Basic Attack', icon: '⚔️', type: 'basic', damage: 100, range: baseRange, aoe: 0, cooldown: 0, description: `โจมตีปกติ ระยะ ${baseRange} ช่อง` }
  ];

  // Utility Skill (Skill 2)
  let skill2: Skill | null = null;
  if (element === 'fire') {
    skill2 = { id: 's2', name: `Ignite`, icon: '🔥', type: 'utility', damage: 0, range: 0, aoe: 0, cooldown: 2, description: `บัฟ ATK ให้ตัวเอง (CD: 2)`, applyStatus: { id: 'atk_up', name: 'ATK+', type: 'buff', statModifier: { atk: 1.3 }, duration: 2, target: 'self' } };
  } else if (element === 'water') {
    skill2 = { id: 's2', name: `Aqua Shield`, icon: '💧', type: 'utility', damage: 0, range: 0, aoe: 0, cooldown: 2, description: `บัฟ DEF ให้ตัวเอง (CD: 2)`, applyStatus: { id: 'def_up', name: 'DEF+', type: 'buff', statModifier: { def: 1.5 }, duration: 2, target: 'self' } };
  } else if (element === 'earth') {
    skill2 = { id: 's2', name: `Stone Wall`, icon: '🪨', type: 'utility', damage: 0, range: 0, aoe: 0, cooldown: 2, description: `เพิ่มเกราะป้องกันมหาศาล (CD: 2)`, applyStatus: { id: 'def_up_max', name: 'DEF++', type: 'buff', statModifier: { def: 2.0 }, duration: 1, target: 'self' } };
  } else if (element === 'wind' || element === 'nature') {
    skill2 = { id: 's2', name: `Tailwind`, icon: '🌪️', type: 'utility', damage: 0, range: 0, aoe: 0, cooldown: 2, description: `บัฟความเร็วให้ตัวเอง (CD: 2)`, applyStatus: { id: 'spd_up', name: 'SPD+', type: 'buff', statModifier: { spd: 1.5 }, duration: 2, target: 'self' } };
  } else if (element === 'light') {
    skill2 = { id: 's2', name: `Purify`, icon: '✨', type: 'utility', heal: 20, range: 2, aoe: 0, cooldown: 2, description: `ฮีลเดี่ยว 20% + เพิ่ม SPD (CD: 2)`, applyStatus: { id: 'spd_up', name: 'SPD+', type: 'buff', statModifier: { spd: 1.3 }, duration: 2, target: 'ally' } };
  } else if (element === 'dark') {
    skill2 = { id: 's2', name: `Poison Strike`, icon: '☠️', type: 'utility', damage: 20, range: 2, aoe: 0, cooldown: 2, description: `โจมตีและติดพิษศัตรู (CD: 2)`, applyStatus: { id: 'poison', name: 'Poison', type: 'poison', damagePerTurn: 40, duration: 3, target: 'enemy' } };
  }
  
  if (skill2) {
    if (bond < 40) skill2.locked = true;
    skills.push(skill2);
  }

  // Ultimate Skill (Skill 3)
  let skill3: Skill | null = null;
  if (element === 'light' || element === 'water') {
    skill3 = { id: 's3', name: `${em} Healing Wave`, icon: em, type: 'ultimate', heal: 40, range: 2, aoe: 1, cooldown: 3, description: `ฮีลเพื่อน 40% (ระยะ: 2 ช่อง) (CD: 3)` };
  } else if (element === 'dark' || element === 'fire') {
    skill3 = { id: 's3', name: `${em} Destructive Burst`, icon: em, type: 'ultimate', damage: 200, range: 2, aoe: 0, cooldown: 3, description: `ดาเมจ 200% (ระยะ: 2 ช่อง) (CD: 3)` };
  } else {
    skill3 = { id: 's3', name: `${em} Elemental Storm`, icon: em, type: 'ultimate', damage: 130, range: 2, aoe: 1, cooldown: 3, description: `ดาเมจหมู่ 130% (ระยะ: 2 ช่อง) (CD: 3)` };
  }

  if (skill3) {
    if (bond < 80) skill3.locked = true;
    skills.push(skill3);
  }

  return skills;
}

export function createMockUnits(): PetUnit[] {
  return [
    // Player Team
    { id: 'p1', name: 'Ignis', emoji: '🐉', element: 'fire', team: 'player', hp: 500, maxHp: 500, atk: 120, def: 60, spd: 85, skills: makeSkills('fire', false), cooldowns: {}, statusEffects: [], row: 3, col: 1, hasMoved: false, hasActed: false, isDead: false },
    { id: 'p2', name: 'Gale', emoji: '🦅', element: 'nature', team: 'player', hp: 380, maxHp: 380, atk: 100, def: 40, spd: 110, skills: makeSkills('nature', true), cooldowns: {}, statusEffects: [], row: 4, col: 0, hasMoved: false, hasActed: false, isDead: false },
    { id: 'p3', name: 'Terra', emoji: '🐢', element: 'earth', team: 'player', hp: 700, maxHp: 700, atk: 70, def: 100, spd: 50, skills: makeSkills('earth', false), cooldowns: {}, statusEffects: [], row: 4, col: 2, hasMoved: false, hasActed: false, isDead: false },

    // Enemy Team
    { id: 'e1', name: 'Venom', emoji: '🐍', element: 'nature', team: 'enemy', hp: 420, maxHp: 420, atk: 110, def: 50, spd: 95, skills: makeSkills('nature', false), cooldowns: {}, statusEffects: [], row: 0, col: 0, hasMoved: false, hasActed: false, isDead: false },
    { id: 'e2', name: 'Shadow', emoji: '🦇', element: 'dark', team: 'enemy', hp: 350, maxHp: 350, atk: 130, def: 35, spd: 120, skills: makeSkills('dark', true), cooldowns: {}, statusEffects: [], row: 0, col: 2, hasMoved: false, hasActed: false, isDead: false },
    { id: 'e3', name: 'Fenrir', emoji: '🐺', element: 'water', team: 'enemy', hp: 550, maxHp: 550, atk: 90, def: 80, spd: 70, skills: makeSkills('water', false), cooldowns: {}, statusEffects: [], row: 1, col: 1, hasMoved: false, hasActed: false, isDead: false },
  ];
}
