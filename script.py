with open('name-tbd/src/app/canvas/canvas.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''        this.ngZone.runOutsideAngular(() => {
          this.isRestoring = true;
          this.grid!.removeAll();
          
          const savedLayout = this.layoutStateService.getLayout(tabId);
          const loadNodes = (items: LayoutItem[], parentGrid: GridStack) => {''',
    '''        this.layoutStateService.loadLayoutForTab(tabId).subscribe((savedLayout: LayoutItem[]) => {
          this.ngZone.runOutsideAngular(() => {
            this.isRestoring = true;
            this.grid!.removeAll();
            
            const loadNodes = (items: LayoutItem[], parentGrid: GridStack) => {'''
)

content = content.replace(
    '''          if (savedLayout.length > 0) {
            loadNodes(savedLayout, this.grid!);
          }
          this.isRestoring = false;
        });''',
    '''          if (savedLayout.length > 0) {
              loadNodes(savedLayout, this.grid!);
            }
            this.isRestoring = false;
          });
        });'''
)

content = content.replace(
    '''              // Add right-click listener
              contentEl.addEventListener('contextmenu', (e: Event) => {
                const me = e as MouseEvent;
                me.preventDefault();
                me.stopPropagation();
                
                const currentItem = this.layout().find(i => i.id === id) || { id, type };
                this.contextMenuState.set({ x: me.clientX, y: me.clientY, item: currentItem });
              });
            }
          }

        });''',
    '''              // Add right-click listener
              contentEl.addEventListener('contextmenu', (e: Event) => {
                const me = e as MouseEvent;
                me.preventDefault();
                me.stopPropagation();
                
                const currentItem = this.layout().find(i => i.id === id) || { id, type };
                this.contextMenuState.set({ x: me.clientX, y: me.clientY, item: currentItem });
              });
            }
          }

          if (!this.isRestoring && tabId && (!node.id || !node.id.toString().match(/^\\d+$/))) {
            this.layoutStateService.addComponent(tabId, {
              id: node.id as string || node.el?.getAttribute('data-gs-id') as string,
              type: node.el?.getAttribute('data-type') || 'unknown',
              x: node.x || 0,
              y: node.y || 0,
              w: node.w || 100,
              h: node.h || 40
            }).subscribe(dto => {
              if (dto && dto.id) {
                const newId = dto.id.toString();
                if (node.el) node.el.setAttribute('data-gs-id', newId);
                node.id = newId;
              }
            });
          }
        });'''
)


content = content.replace(
    "      grid.on('change', () => syncLayout());",
    "      grid.on('change', (_event: Event, nodes: GridStackNode[]) => {\n        if (this.isRestoring) return;\n        const tabId = this.tabsService.activeTabId();\n        if (tabId) {\n          nodes?.forEach(node => {\n            const id = node.id as string || node.el?.getAttribute('data-gs-id');\n            const type = node.el?.getAttribute('data-type') || 'unknown';\n            if (id) {\n              this.layoutStateService.updateComponent(tabId, {\n                id, type, x: node.x || 0, y: node.y || 0, w: node.w || 100, h: node.h || 40\n              }).subscribe();\n            }\n          });\n        }\n        syncLayout();\n      });"
)


with open('name-tbd/src/app/canvas/canvas.ts', 'w', encoding='utf-8') as f:
    f.write(content)
