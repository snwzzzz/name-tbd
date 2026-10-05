import { RichtextWidget } from './richtext-widget';
import { mountWidget } from '../../core/testing/widget-testing';

describe('RichtextWidget', () => {
  it('shows its Markdown as formatted text, never as markup', () => {
    const { el } = mountWidget(RichtextWidget, { content: '## Hours\n\n- **Mon** 9–5\n\n<img src=x onerror=alert(1)>' });
    expect(el.querySelector('h2')?.textContent).toBe('Hours');
    expect(el.querySelector('li strong')?.textContent).toBe('Mon');
    expect(el.querySelector('img')).toBeNull();
  });
});
