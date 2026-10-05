import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';

/** The theme color each tone is drawn in. */
export const BADGE_TONES: Record<string, string> = {
  Brand: 'var(--widget-brand)',
  Neutral: 'var(--widget-fg-secondary)',
  Success: 'var(--widget-success)',
  Warning: 'var(--widget-warning)',
  Danger: 'var(--widget-danger)',
};

/** A short status or label in a pill (soft, solid or outlined), in one of the theme's tones. */
@Component({
  selector: 'app-badge-widget',
  template: `<span class="badge" [class]="variant()" [style.--tone]="tone()">{{ label() }}</span>`,
  styleUrl: './badge-widget.scss',
})
export class BadgeWidget extends BaseWidget {
  readonly label = computed(() => this.text('text') ?? '');
  readonly tone = computed(() => BADGE_TONES[this.text('tone') ?? ''] ?? BADGE_TONES['Brand']);
  readonly variant = computed(() => `badge ${(this.text('variant') ?? 'Soft').toLowerCase()}`);
}
