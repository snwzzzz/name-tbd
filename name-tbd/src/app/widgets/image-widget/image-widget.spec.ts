import { ImageWidget } from './image-widget';
import { mountWidget } from '../../core/testing/widget-testing';

describe('ImageWidget', () => {
  it('shows its image, fitted, described for screen readers', () => {
    const { el } = mountWidget(ImageWidget, { src: 'https://example.com/a.png', alt: 'Our shop', fit: 'Contain' });
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
    expect(img.alt).toBe('Our shop');
    expect(img.style.objectFit).toBe('contain');
  });

  it('shows where it goes while editing without a URL, and nothing in the running app', () => {
    const { el, goLive } = mountWidget(ImageWidget, {});
    expect(el.textContent).toContain('Add an image URL');
    goLive();
    expect(el.textContent?.trim()).toBe('');
  });
});
