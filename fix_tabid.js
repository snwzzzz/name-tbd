const fs = require('fs');
let content = fs.readFileSync('name-tbd/src/app/canvas/canvas.ts', 'utf8');

content = content.replace(
  "grid.on('added', (_event: Event, nodes: GridStackNode[]) => {\\n        nodes.forEach((node) => {",
  "grid.on('added', (_event: Event, nodes: GridStackNode[]) => {\\n        const tabId = this.tabsService.activeTabId();\\n        nodes.forEach((node) => {"
);

fs.writeFileSync('name-tbd/src/app/canvas/canvas.ts', content);
