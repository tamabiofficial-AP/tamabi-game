import { applySkillStatus, makeSkills, createMockUnits, tickCooldowns } from './src/engine/battleEngine';

let units = createMockUnits();
const snake = units.find(u => u.name === 'Venom');
snake.element = 'dark';
snake.team = 'player';
snake.skills = makeSkills('dark', false);

const target = units.find(u => u.name === 'Ignis');
target.team = 'enemy';

const skill = snake.skills.find(s => s.name === 'Poison Strike');

// Simulate executeAttack
let updatedUnits = [...units];
updatedUnits = updatedUnits.map(u => u.id === target.id ? { ...u, hp: u.hp - 20 } : u);
updatedUnits = updatedUnits.map(u => u.id === snake.id ? { ...u, hasActed: true } : u);
updatedUnits = applySkillStatus(skill, snake, target, updatedUnits);

units = updatedUnits;
const t1 = units.find(u => u.id === target.id);
console.log("After attack, target status:", t1.statusEffects);

// Simulate advanceTurn for next unit (the enemy target)
units = units.map(u => u.id === target.id ? tickCooldowns(u) : u);

const t2 = units.find(u => u.id === target.id);
console.log("After tickCooldowns, target status:", t2.statusEffects);

