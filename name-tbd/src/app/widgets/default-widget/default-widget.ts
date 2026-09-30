import { Component, input } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';

/** Placeholder for widget types that have no component of their own yet. */
@Component({
  selector: 'app-default-widget',
  templateUrl: './default-widget.html',
  styleUrl: './default-widget.scss',
})
export class DefaultWidget extends BaseWidget {
  readonly type = input('unknown');
}
