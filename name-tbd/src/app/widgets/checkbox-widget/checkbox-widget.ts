import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { propBool } from '../../_utils/widget-props.utils';

/** A checkbox with its label; its value is 'true' or 'false'. Checking it fires its change trigger. */
@Component({
  selector: 'app-checkbox-widget',
  templateUrl: './checkbox-widget.html',
  styleUrl: './checkbox-widget.scss',
})
export class CheckboxWidget extends BaseFieldWidget {
  protected readonly kind = 'check';

  readonly checked = computed(() => this.value() === 'true');

  protected override initialValue(): string {
    return String(propBool(this.props(), 'checked', false));
  }
}
