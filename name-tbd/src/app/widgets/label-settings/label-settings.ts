import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseWidgetSettings } from '../../_directives/base-widget.directive';
import { SelectionService } from '../../_services/selection.service';

@Component({
  selector: 'app-label-settings',
  imports: [FormsModule],
  templateUrl: './label-settings.html',
})
export class LabelSettings extends BaseWidgetSettings {
  private readonly selection = inject(SelectionService);

  updateProp(key: string, value: string): void {
    this.props.update((props) => ({ ...props, [key]: value }));
    this.selection.updateProps(this.props());
  }

  color(): string {
    return this.text('color') || '#ffffff';
  }
}
