const QRCode = require('qrcode');
const fs = require('fs');

const codes = [
  { data: 'TAMABI_CATCH_RANDOM', filename: 'qr_catch_pet.png' },
  { data: 'TAMABI_QUEST_q_cafe_33', filename: 'qr_quest_33backyard.png' },
  { data: 'TAMABI_QUEST_q_cafe_secret', filename: 'qr_quest_secretcafe.png' },
  { data: 'TAMABI_QUEST_q_cafe_nomongko', filename: 'qr_quest_nomongko.png' },
];

const OUT_DIR = '/Users/anukanphetphanomkun/.gemini/antigravity-ide/brain/9a2e271c-3491-45ac-9725-ee0ddb67c527';

async function generate() {
  for (const code of codes) {
    const path = `${OUT_DIR}/${code.filename}`;
    await QRCode.toFile(path, code.data, {
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      width: 400
    });
    console.log(`Generated ${path}`);
  }
}

generate();
