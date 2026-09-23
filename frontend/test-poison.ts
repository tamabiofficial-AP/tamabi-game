import { applySkillStatus, makeSkills, createMockUnits } from './src/engine/battleEngine';

const units = createMockUnits();
const snake = units.find(u => u.name === 'Venom');
snake.element = 'dark';
snake.skills = makeSkills('dark', false);

const target = units.find(u => u.name === 'Ignis');
const skill = snake.skills.find(s => s.name === 'Poison Strike');

console.log("Before:", target.statusEffects);
const newUnits = applySkillStatus(skill, snake, target, units);
const newTarget = newUnits.find(u => u.name === 'Ignis');
console.log("After:", newTarget.statusEffects);
