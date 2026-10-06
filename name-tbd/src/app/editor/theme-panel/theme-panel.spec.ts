import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ThemePanel } from './theme-panel';
import { ApplicationControllerService } from '../../api/services/applicationController.service';
import { EditorContext } from '../../_services/editor-context.service';
import { AppThemeService } from '../../core/services/app-theme.service';
import { provideTestEditorContext } from '../../_testing/editor-context.testing';
import { AppTheme } from '../../core/rendering/app-theme';

describe('ThemePanel', () => {
  const mount = (update = vi.fn((_id: number, command: { theme?: AppTheme }) => of({ id: 1, theme: command.theme }))) => {
    TestBed.configureTestingModule({
      providers: [provideTestEditorContext(), { provide: ApplicationControllerService, useValue: { updateApplication: update } }],
    });
    const fixture = TestBed.createComponent(ThemePanel);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, update };
  };
  const presets = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')];

  it('offers the three presets and a custom theme, the current one checked', () => {
    const { el } = mount();
    expect(presets(el).map((b) => b.textContent?.trim())).toEqual(['AaDefault', 'AaFresh', 'AaElegant', 'AaCustom']);
    expect(presets(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('restyles at once when a preset is picked, and saves it on the app', async () => {
    const { el, fixture, update } = mount();
    presets(el)[1].click();
    fixture.detectChanges();

    expect(TestBed.inject(AppThemeService).variables()['--widget-brand']).toBe('#0f8a4f');
    expect(update).toHaveBeenCalledWith(TestBed.inject(EditorContext).appId(), { theme: { preset: 'Fresh' } });
    await fixture.whenStable();
    expect(presets(el)[1].getAttribute('aria-checked')).toBe('true');
  });

  it('makes a custom theme from the current one when a value is changed', () => {
    const { fixture, update } = mount();
    fixture.componentInstance.change('font', 'Serif');
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      theme: { preset: 'Custom', primary: '#2f89ff', font: 'Serif', radius: 'Small', spacing: 'Normal' },
    });
  });

  it('goes back to the theme it had when it cannot be saved', async () => {
    const { el, fixture } = mount(vi.fn(() => throwError(() => new Error('offline'))));
    presets(el)[2].click();
    await fixture.whenStable();
    expect(TestBed.inject(AppThemeService).resolved().preset).toBe('Default');
  });
});
