const fs = require('fs');
let content = fs.readFileSync('name-tbd/src/app/canvas/canvas.ts', 'utf8');

content = content.replace(
  "const widgetNode = (parentGrid as any).addWidget({ el: div, id: item.id, x: item.x, y: item.y, w: item.w, h: item.h });",
  "const widgetNode = parentGrid.addWidget(div, { id: item.id, x: item.x, y: item.y, w: item.w, h: item.h });"
);

fs.writeFileSync('name-tbd/src/app/canvas/canvas.ts', content);
