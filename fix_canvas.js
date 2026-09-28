const fs = require('fs');
let content = fs.readFileSync('name-tbd/src/app/canvas/canvas.ts', 'utf8');

content = content.replace(
  "grid.on('added', (_event: Event, nodes: GridStackNode[]) => {\n        if (this.isRestoring) return;\n        const tabId = this.tabsService.activeTabId();",
  "grid.on('added', (_event: Event, nodes: GridStackNode[]) => {\n        const tabId = this.tabsService.activeTabId();"
);

content = content.replace(
  "grid.on('change', (_event: Event, nodes: GridStackNode[]) => {\n        if (this.isRestoring) return;\n        const tabId = this.tabsService.activeTabId();",
  "grid.on('change', (_event: Event, nodes: GridStackNode[]) => {\n        const tabId = this.tabsService.activeTabId();"
);

content = content.replace(
  "if (tabId) {\n          nodes?.forEach(node => {\n            const id = node.id as string || node.el?.getAttribute('data-gs-id');\n            const type = node.el?.getAttribute('data-type') || 'unknown';\n            if (id) {\n              this.layoutStateService.updateComponent(tabId, {",
  "if (!this.isRestoring && tabId) {\n          nodes?.forEach(node => {\n            const id = node.id as string || node.el?.getAttribute('data-gs-id');\n            const type = node.el?.getAttribute('data-type') || 'unknown';\n            if (id) {\n              this.layoutStateService.updateComponent(tabId, {"
);

fs.writeFileSync('name-tbd/src/app/canvas/canvas.ts', content);
