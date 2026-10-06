import { Component, input, output } from '@angular/core';
import {
  LucideAlignCenterHorizontal, LucideAlignCenterVertical, LucideAlignEndHorizontal, LucideAlignEndVertical,
  LucideAlignHorizontalDistributeCenter, LucideAlignStartHorizontal, LucideAlignStartVertical,
  LucideAlignVerticalDistributeCenter,
} from '@lucide/angular';
import { ZoomButton } from '../zoom-controls/zoom-button';
import { AlignEdge, DistributeAxis } from '../../_utils/align.utils';

/**
 * Over the canvas while several widgets are selected: line them up on an edge or center line, or
 * space them evenly (three or more). Each click is one undo step.
 */
@Component({
  selector: 'app-align-toolbar',
  imports: [
    ZoomButton, LucideAlignStartVertical, LucideAlignCenterVertical, LucideAlignEndVertical, LucideAlignStartHorizontal,
    LucideAlignCenterHorizontal, LucideAlignEndHorizontal, LucideAlignHorizontalDistributeCenter, LucideAlignVerticalDistributeCenter,
  ],
  template: `
    <span class="count">{{ count() }} selected</span>
    <span class="divider"></span>
    <button app-zoom-button title="Align left" aria-label="Align left" (click)="align.emit('left')"><svg lucideAlignStartVertical></svg></button>
    <button app-zoom-button title="Align centers horizontally" aria-label="Align centers horizontally" (click)="align.emit('centerX')"><svg lucideAlignCenterVertical></svg></button>
    <button app-zoom-button title="Align right" aria-label="Align right" (click)="align.emit('right')"><svg lucideAlignEndVertical></svg></button>
    <span class="divider"></span>
    <button app-zoom-button title="Align top" aria-label="Align top" (click)="align.emit('top')"><svg lucideAlignStartHorizontal></svg></button>
    <button app-zoom-button title="Align centers vertically" aria-label="Align centers vertically" (click)="align.emit('centerY')"><svg lucideAlignCenterHorizontal></svg></button>
    <button app-zoom-button title="Align bottom" aria-label="Align bottom" (click)="align.emit('bottom')"><svg lucideAlignEndHorizontal></svg></button>
    <span class="divider"></span>
    <button app-zoom-button title="Distribute horizontally (3 or more)" aria-label="Distribute horizontally" [disabled]="count() < 3" (click)="distribute.emit('horizontal')"><svg lucideAlignHorizontalDistributeCenter></svg></button>
    <button app-zoom-button title="Distribute vertically (3 or more)" aria-label="Distribute vertically" [disabled]="count() < 3" (click)="distribute.emit('vertical')"><svg lucideAlignVerticalDistributeCenter></svg></button>
  `,
  styleUrl: './align-toolbar.scss',
})
export class AlignToolbar {
  /** How many widgets are selected. */
  readonly count = input.required<number>();
  readonly align = output<AlignEdge>();
  readonly distribute = output<DistributeAxis>();
}
