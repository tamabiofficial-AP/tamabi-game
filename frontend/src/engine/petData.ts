export const SPECIES_EMOJI: Record<string, string> = {
  // Fire
  Dragon: '🐉', Phoenix: '🪶', Fox: '🦊', Lion: '🦁',
  // Water
  Turtle: '🐢', Shark: '🦈', Penguin: '🐧', Dolphin: '🐬',
  // Earth
  Bear: '🐻', Golem: '🪨', Rhino: '🦏', Mole: '🦦', // Using otter as mole isn't standard
  // Wind
  Eagle: '🦅', Falcon: '🪶', Bat: '🦇', Butterfly: '🦋',
  // Light
  Unicorn: '🦄', Owl: '🦉', Pegasus: '🐎', Swan: '🦢',
  // Dark
  Snake: '🐍', Spider: '🕷️', Panther: '🐆', Crow: '🐦‍⬛'
};

export const SPECIES_IMAGES: Record<string, string> = {
  // Fire
  Dragon: '/assets/pets/dragon_pixel.png', Phoenix: '/assets/pets/phoenix_pixel.png', Fox: '/assets/pets/fox_pixel.png', Lion: '/assets/pets/lion_pixel.png',
  // Water
  Turtle: '/assets/pets/turtle_pixel.png', Shark: '/assets/pets/shark_pixel.png', Penguin: '/assets/pets/penguin_pixel.png', Dolphin: '/assets/pets/dolphin_pixel.png',
  // Earth
  Bear: '/assets/pets/bear_pixel.png', Golem: '/assets/pets/golem_pixel.png', Rhino: '/assets/pets/rhino_pixel.png', Mole: '/assets/pets/mole_pixel.png',
  // Wind
  Eagle: '/assets/pets/eagle_pixel.png', Falcon: '/assets/pets/falcon_pixel.png', Bat: '/assets/pets/bat_pixel.png', Butterfly: '/assets/pets/butterfly_pixel.png',
  // Light
  Unicorn: '/assets/pets/unicorn_pixel.png', Owl: '/assets/pets/owl_pixel.png', Pegasus: '/assets/pets/pegasus_pixel.png', Swan: '/assets/pets/swan_pixel.jpg',
  // Dark
  Snake: '/assets/pets/snake_pixel.jpg', Spider: '/assets/pets/spider_pixel.jpg', Panther: '/assets/pets/panther_pixel.jpg', Crow: '/assets/pets/crow_pixel.jpg'
};

export type TraitName = 'Normal' | 'Brave' | 'Lazy' | 'Gluttonous' | 'Energetic' | 'Smart';

export interface TraitDef {
  name: TraitName;
  description: string;
  bonusAtk: number;
  bonusDef: number;
  bonusSpd: number;
}

export const TRAITS: Record<TraitName, TraitDef> = {
  Normal: {
    name: 'Normal',
    description: 'นิสัยปกติทั่วไป',
    bonusAtk: 1.0,
    bonusDef: 1.0,
    bonusSpd: 1.0,
  },
  Brave: {
    name: 'Brave',
    description: 'กล้าหาญ (ตีแรงขึ้น 15%, ป้องกันลดลง 10%)',
    bonusAtk: 1.15,
    bonusDef: 0.90,
    bonusSpd: 1.0,
  },
  Lazy: {
    name: 'Lazy',
    description: 'ขี้เกียจ (ป้องกันเพิ่ม 20%, ความเร็วลดลง 20%)',
    bonusAtk: 1.0,
    bonusDef: 1.20,
    bonusSpd: 0.80,
  },
  Gluttonous: {
    name: 'Gluttonous',
    description: 'ตะกละ (เลือดเยอะขึ้น/อ้วนง่าย ความเร็วลดลง)',
    // In BattleScreen, this will just be a display trait or we map to DEF
    bonusAtk: 1.0,
    bonusDef: 1.10,
    bonusSpd: 0.90,
  },
  Energetic: {
    name: 'Energetic',
    description: 'ร่าเริง (ความเร็วเพิ่ม 15%)',
    bonusAtk: 1.0,
    bonusDef: 1.0,
    bonusSpd: 1.15,
  },
  Smart: {
    name: 'Smart',
    description: 'ฉลาด (หลบหลีก/แม่นยำ ทุกอย่างสมดุล +5%)',
    bonusAtk: 1.05,
    bonusDef: 1.05,
    bonusSpd: 1.05,
  }
};

export function getRandomTrait(): TraitName {
  const traits = Object.keys(TRAITS) as TraitName[];
  // 30% chance for Normal, otherwise random
  if (Math.random() < 0.3) return 'Normal';
  const randomIndex = Math.floor(Math.random() * traits.length);
  return traits[randomIndex];
}
