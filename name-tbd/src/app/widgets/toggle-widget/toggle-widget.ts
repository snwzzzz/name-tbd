import { Component, computed } from '@angular/core';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { propBool } from '../../_utils/widget-props.utils';

/** An on/off switch with its label; its value is 'true' or 'false'. Switching it fires its change trigger. */
@Component({
  selector: 'app-toggle-widget',
  templateUrl: './toggle-widget.html',
  styleUrl: './toggle-widget.scss',
})
export class ToggleWidget extends BaseFieldWidget {
  protected readonly kind = 'check';

  readonly on = computed(() => this.value() === 'true');
  readonly labelId = computed(() => `${this.fieldId()}-label`);

  protected override initialValue(): string {
    return String(propBool(this.props(), 'checked', false));
  }

  toggle(): void {
    this.setValue(this.on() ? 'false' : 'true');
  }
}
