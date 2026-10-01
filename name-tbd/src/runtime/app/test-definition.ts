import { AppDefinition } from '../../app/core/definition/app-definition';
import { CLICK_EVENT } from '../../app/_constants/widget-events.constants';

/**
 * A small app for the runtime's specs: Home with a button that changes a label and a link to
 * About, About with a table, and a layout page with a menu.
 */
export function testDefinition(): AppDefinition {
  return {
    version: 1,
    app: { id: 7, name: 'Shop' },
    dataRevision: 'r1',
    homePageId: 1,
    pages: [
      {
        id: 1, name: 'Home', path: '/', layout: false,
        components: [
          { id: 10, type: 'label', x: 0, y: 2, w: 4, h: 1, props: { text: 'Hello' } },
          { id: 11, type: 'button', x: 0, y: 3, w: 2, h: 1, props: { label: 'Greet' } },
          { id: 12, type: 'link', x: 0, y: 4, w: 2, h: 1, props: { text: 'About us', pageId: '2' } },
        ],
        workflow: {
          nodes: [
            { id: 100, type: 'Trigger', props: { triggerType: 'element_click', elementId: '11', eventName: CLICK_EVENT } },
            { id: 101, type: 'Action', props: { actionType: 'set_text', config: { targetId: '10', text: 'Clicked', resetEnabled: false } } },
          ],
          edges: [{ id: 200, sourceNodeId: 100, sourcePort: 'out', targetNodeId: 101 }],
        },
      },
      {
        id: 2, name: 'About', path: '/about', layout: false,
        components: [{ id: 20, type: 'table', x: 0, y: 2, w: 8, h: 4, props: { dataSourceId: '5', columns: '[]' } }],
        workflow: { nodes: [], edges: [] },
      },
      {
        id: 3, name: 'Layout', path: '/layout', layout: true,
        components: [{ id: 30, type: 'nav', x: 0, y: 0, w: 24, h: 1, props: { pages: '["1","2"]' } }],
        workflow: { nodes: [], edges: [] },
      },
    ],
    dataSources: [{ id: 5, name: 'People', columns: ['name'], rows: [['Alice'], ['Bob']] }],
  };
}
