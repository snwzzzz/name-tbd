const fs = require('fs');
let t = fs.readFileSync('src/app/canvas/canvas.ts', 'utf8');

t = t.replace('const AW = 1440;', "import { LayoutItem, LayoutStateService } from '../services/layout-state.service';\n\nconst AW = 1440;");
t = t.replace(/export interface LayoutItem \{[\s\S]*?\}/, '');

fs.writeFileSync('src/app/canvas/canvas.ts', t);
