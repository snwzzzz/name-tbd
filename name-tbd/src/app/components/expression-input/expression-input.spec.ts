import { TestBed } from '@angular/core/testing';
import { ExpressionInput } from './expression-input';
import { ScopeEntry } from '../../../flow-engine';

const SCOPE: ScopeEntry[] = [
  { name: 'orderForm', kind: 'widget', type: 'form', members: [{ name: 'amount', kind: 'field' }, { name: 'customer', kind: 'field' }] },
  { name: 'approvalLimit', kind: 'variable', type: 'number variable', members: [] },
];

describe('ExpressionInput', () => {
  const mount = (mode: 'expression' | 'template', value = '') => {
    const fixture = TestBed.createComponent(ExpressionInput);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('scope', SCOPE);
    fixture.componentRef.setInput('value', value);
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    const typeText = (text: string) => {
      input.value = text;
      input.setSelectionRange(text.length, text.length);
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const key = (k: string) => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, el, input, typeText, key, emitted };
  };

  it("completes a form's fields after its name and a dot", () => {
    const { el, input, typeText, key, emitted } = mount('expression');
    typeText('orderForm.cu');
    expect([...el.querySelectorAll('li .name')].map((n) => n.textContent)).toEqual(['customer']);

    key('Enter');
    expect(input.value).toBe('orderForm.customer');
    expect(emitted.at(-1)).toBe('orderForm.customer');
    expect(el.querySelector('li')).toBeNull();
  });

  it('says what is wrong, right under the field', () => {
    const { el, typeText } = mount('expression');
    typeText('orderForm.amout > approvalLimit');
    expect(el.querySelector('.problem')?.textContent).toBe('orderForm has no "amout"');
    typeText('orderForm.amount > approvalLimit');
    expect(el.querySelector('.problem')).toBeNull();
  });

  it('treats plain text as fine in a template, and checks its {{ }} parts', () => {
    const { el, typeText } = mount('template');
    typeText('Hello there');
    expect(el.querySelector('.problem')).toBeNull();
    typeText('Hello {{ who }}');
    expect(el.querySelector('.problem')?.textContent).toBe('Unknown name "who"');
  });
});
