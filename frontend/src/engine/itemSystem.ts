export type ItemType = 'food' | 'toy' | 'medicine';

export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  effectValue: number;
  emoji: string;
  description: string;
}

export const ITEMS: Record<string, GameItem> = {
  'apple': {
    id: 'apple',
    name: 'แอปเปิ้ล (Apple)',
    type: 'food',
    price: 50,
    effectValue: 20, // Increases hunger/energy by 20
    emoji: '🍎',
    description: 'ผลไม้พื้นฐาน ช่วยลดความหิวได้เล็กน้อย'
  },
  'meat': {
    id: 'meat',
    name: 'เนื้อย่าง (Meat)',
    type: 'food',
    price: 150,
    effectValue: 50, // Increases hunger by 50
    emoji: '🍖',
    description: 'เนื้อย่างชิ้นโต อิ่มท้องสุดๆ'
  },
  'ball': {
    id: 'ball',
    name: 'ลูกบอล (Toy Ball)',
    type: 'toy',
    price: 100,
    effectValue: 30, // Increases happiness by 30
    emoji: '🎾',
    description: 'ของเล่นสุดคลาสสิก คลายเครียดได้ดีเยี่ยม'
  },
  'potion': {
    id: 'potion',
    name: 'ยารักษา (Potion)',
    type: 'medicine',
    price: 200,
    effectValue: 50, // Increases health by 50
    emoji: '🧪',
    description: 'ยารักษาโรค ฟื้นฟูค่า Health ได้อย่างรวดเร็ว'
  }
};
