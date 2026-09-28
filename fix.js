const fs = require('fs');
let content = fs.readFileSync('name-tbd/src/app/canvas/canvas.ts', 'utf8');

content = content.replace(/\\n/g, '\n');

fs.writeFileSync('name-tbd/src/app/canvas/canvas.ts', content);
