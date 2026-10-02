import { TestBed } from '@angular/core/testing';
import { ColorField } from './color-field';

describe('ColorField', () => {
  const mount = (value: string, defaultValue = '') => {
    const fixture = TestBed.createComponent(ColorField);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('defaultValue', defaultValue);
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.changed.subscribe((v) => emitted.push(v));
    const [picker, hex] = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const type = (text: string) => {
      hex.value = text;
      hex.dispatchEvent(new Event('input'));
      hex.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
    };
    return { fixture, picker, hex, emitted, type };
  };

  it('takes a typed hex color, short or without #, and ignores anything else', () => {
    const { hex, emitted, type } = mount('#0f6cbd');
    type('ABC');
    type('not a color');
    expect(emitted).toEqual(['#aabbcc']);
    expect(hex.value).toBe('#0f6cbd'); // the invalid text went back to the value
  });

  it('takes the picker color, and resets to the default (or to none)', () => {
    const { fixture, picker, emitted } = mount('#ff0000', '#0f6cbd');
    picker.value = '#00ff00';
    picker.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('.ui-color-reset') as HTMLButtonElement).click();
    expect(emitted).toEqual(['#00ff00', '#0f6cbd']);
  });

  it('shows no color of its own as its empty label, and clearing the text means none', () => {
    const { hex, emitted, type } = mount('#123456');
    type('');
    expect(emitted).toEqual(['']);
    expect(hex.placeholder).toBe('Auto');
  });
});
