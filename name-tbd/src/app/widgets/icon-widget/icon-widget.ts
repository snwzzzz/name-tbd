import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { ICON_SET } from '../../core/rendering/icon-set';

/**
 * One icon from the icon set, as big as its cells allow, in the theme's color (or its own). With a
 * meaning it's announced by screen readers; without one it's decorative.
 */
@Component({
  selector: 'app-icon-widget',
  template: `
    <span
      class="icon"
      [style.color]="color()"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label()"
      [attr.aria-hidden]="label() ? null : 'true'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        @for (node of nodes(); track $index) {
          @let a = node[1];
          @switch (node[0]) {
            @case ('path') { <svg:path [attr.d]="a['d']" /> }
            @case ('circle') { <svg:circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" /> }
            @case ('line') { <svg:line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" /> }
            @case ('polyline') { <svg:polyline [attr.points]="a['points']" /> }
            @case ('rect') { <svg:rect [attr.x]="a['x']" [attr.y]="a['y']" [attr.width]="a['width']" [attr.height]="a['height']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
          }
        }
      </svg>
    </span>
  `,
  styleUrl: './icon-widget.scss',
})
export class IconWidget extends BaseWidget {
  readonly nodes = computed(() => ICON_SET[this.text('icon') ?? ''] ?? ICON_SET['Star']);
  readonly label = computed(() => this.text('label') ?? null);
  readonly color = computed(() => this.text('color') ?? null);
}
