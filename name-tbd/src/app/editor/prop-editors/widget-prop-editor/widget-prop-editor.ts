import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { LayoutStateService } from '../../../_services/layout-state.service';
import { TabsService } from '../../../_services/tabs.service';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { SelectOption } from '../../../_types/select.types';
import { widgetDefinition } from '../../../_constants/widget-registry.constants';
import { flattenTree } from '../../../_utils/layout-tree.utils';
import { propText } from '../../../_utils/widget-props.utils';

/**
 * Picks another widget on the page (prop type 'widget'), of the types the prop's `options` list
 * (all when it lists none); stores its id. E.g. the table whose selected row a form edits.
 */
@Component({
  selector: 'app-widget-prop-editor',
  imports: [FormsModule, UiSelect],
  template: `
    @if (options().length > 1) {
      <app-select [options]="options()" placeholder="Pick one…" [ngModel]="selected()" (ngModelChange)="update($event)" />
    } @else {
      <p class="hint">There's none on this page yet.</p>
    }
  `,
  styleUrl: '../prop-editor.scss',
})
export class WidgetPropEditor extends BasePropEditor {
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);

  readonly options = computed<SelectOption[]>(() => {
    const pageId = this.tabs.activeTabId();
    const types = this.def().options ?? [];
    const widgets = flattenTree(pageId ? this.layoutState.getLayout(pageId) : [])
      .filter((item) => item.id != null && (types.length === 0 || types.includes(item.type ?? '')));
    return [
      { value: '', label: 'None' },
      ...widgets.map((item) => {
        const name = propText(item.props, 'title') ?? propText(item.props, 'label') ?? widgetDefinition(item.type).name;
        return { value: String(item.id), label: `${name} (#${item.id})`, icon: widgetDefinition(item.type).icon };
      }),
    ];
  });
  readonly selected = computed(() => String(this.value() ?? ''));
}
