import { Component, computed, inject } from '@angular/core';
import { LucideImage } from '@lucide/angular';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { propBool } from '../../_utils/widget-props.utils';

const FITS: Record<string, string> = { Cover: 'cover', Contain: 'contain', Stretch: 'fill' };

/**
 * An image from a URL (or an uploaded file's data URL), fitted into its cells. Its description is
 * what screen readers announce; without one it's decorative. Without a URL the editor shows where
 * it goes; the running app shows nothing.
 */
@Component({
  selector: 'app-image-widget',
  imports: [LucideImage],
  template: `
    @if (src(); as src) {
      <img [src]="src" [alt]="alt()" [style.object-fit]="fit()" [class.rounded]="rounded()" />
    } @else if (!session.live()) {
      <div class="empty" aria-hidden="true"><svg lucideImage></svg><span>Add an image URL</span></div>
    }
  `,
  styleUrl: './image-widget.scss',
})
export class ImageWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);

  readonly src = computed(() => this.text('src') ?? null);
  readonly alt = computed(() => this.text('alt') ?? '');
  readonly fit = computed(() => FITS[this.text('fit') ?? ''] ?? 'cover');
  readonly rounded = computed(() => propBool(this.props(), 'rounded', false));
}
