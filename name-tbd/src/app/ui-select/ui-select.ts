import { Component, ElementRef, HostListener, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { LucideCheck, LucideChevronDown, LucideIcon } from '@lucide/angular';

export interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Dropdown in the style of the component list: soft rounded cards instead of the native select.
 * The list opens in an overlay on <body>, so it isn't clipped or scaled by zoomed canvases.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgComponentOutlet, CdkConnectedOverlay, CdkOverlayOrigin, LucideCheck, LucideChevronDown],
  templateUrl: './ui-select.html',
  styleUrl: './ui-select.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelect), multi: true }],
  host: { '[class.compact]': "size() === 'sm'" },
})
export class UiSelect implements ControlValueAccessor {
  options = input.required<SelectOption[]>();
  placeholder = input('Select…');
  /** 'sm' for tight spots like workflow nodes. */
  size = input<'sm' | 'md'>('md');
  /** Icon shown in front of the value (falls back to the selected option's own icon). */
  icon = input<LucideIcon | null>(null);

  private trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly value = signal<string>('');
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly activeIndex = signal(-1);
  readonly panelWidth = signal(0);

  readonly selected = computed(() => this.options().find((o) => o.value === this.value()) ?? null);
  readonly leadingIcon = computed(() => this.selected()?.icon ?? this.icon());

  readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // ─── ControlValueAccessor ───────────────────────────────────────────────
  writeValue(v: unknown): void { this.value.set(v == null ? '' : String(v)); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); }

  // ─── Behaviour ──────────────────────────────────────────────────────────
  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  show(): void {
    if (this.disabled()) return;
    this.panelWidth.set(this.trigger().nativeElement.getBoundingClientRect().width);
    this.activeIndex.set(Math.max(0, this.options().findIndex((o) => o.value === this.value())));
    this.open.set(true);
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  choose(option: SelectOption): void {
    if (option.value !== this.value()) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
    this.close();
    this.trigger().nativeElement.focus();
  }

  /** Clicks on the trigger itself are handled by toggle(), not as "outside". */
  onOutsideClick(e: MouseEvent): void {
    if (!this.trigger().nativeElement.contains(e.target as Node)) this.close();
  }

  onKeydown(e: KeyboardEvent): void {
    const options = this.options();
    // Keep the keys to ourselves (e.g. Space would otherwise start panning a canvas)
    if ([' ', 'Enter', 'ArrowDown', 'ArrowUp', 'Escape', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.open()) {
      if ([' ', 'Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) this.show();
      return;
    }
    switch (e.key) {
      case 'ArrowDown': this.activeIndex.update((i) => Math.min(options.length - 1, i + 1)); break;
      case 'ArrowUp': this.activeIndex.update((i) => Math.max(0, i - 1)); break;
      case 'Home': this.activeIndex.set(0); break;
      case 'End': this.activeIndex.set(options.length - 1); break;
      case 'Enter':
      case ' ': {
        const option = options[this.activeIndex()];
        if (option) this.choose(option);
        break;
      }
      case 'Escape': this.close(); break;
      case 'Tab': this.close(); break;
    }
  }

  /** A scroll/pan anywhere else would leave the list floating in the wrong place. */
  @HostListener('document:wheel', ['$event'])
  onDocumentWheel(e: WheelEvent): void {
    if (this.open() && !(e.target as HTMLElement | null)?.closest?.('.ui-select-panel')) this.close();
  }
}
