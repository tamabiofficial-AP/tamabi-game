const fs = require('fs');
const path = '/Users/anukanphetphanomkun/.gemini/antigravity-ide/scratch/tamabi/frontend/src/components/BattleScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

// Inject console.log for units state
code = code.replace(
  'const [units, setUnits] = useState<PetUnit[]>([]);',
  'const [units, setUnits] = useState<PetUnit[]>([]);\n  useEffect(() => { console.log("[DEBUG] Units updated:", units); }, [units]);'
);

fs.writeFileSync(path, code);
console.log("Injected debug log.");
