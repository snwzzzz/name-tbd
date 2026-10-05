import { Directive, Injector, computed, inject, input, model } from '@angular/core';
import { WidgetProps } from '../_types/layout.types';
import { propText } from '../_utils/widget-props.utils';
import { textSizeOf } from '../core/rendering/text-sizes';
import { WidgetBindingsService, hasTemplates } from '../core/expressions/widget-bindings.service';

/**
 * Base of every widget the canvas places: the canvas sets `id` and `props`. Its "Text size" prop
 * sets --widget-text-size, which all widget text is sized by. Hosts get .app-widget, which the
 * widgets' shared styles (_styles/_widgets.scss) hang on.
 *
 * Props bound to an expression (`{{ … }}`) are resolved here: widgets read `props()`, which has
 * their values (WidgetBindingsService), while the input keeps what was set.
 */
@Directive({ host: { class: 'app-widget', '[style.--widget-text-size]': 'textSize()' } })
export abstract class BaseWidget {
  private readonly injector = inject(Injector);

  readonly id = input.required<string>();
  /** The props as set (by the canvas, live, or the page); input `props`. */
  readonly rawProps = model<WidgetProps>({}, { alias: 'props' });
  /** The props with bound ones resolved: what the widget shows. */
  readonly props = computed(() => {
    const raw = this.rawProps();
    // Only widgets with bound props need the scope (and its ports)
    return hasTemplates(raw) ? this.injector.get(WidgetBindingsService).resolve(raw) : raw;
  });
  readonly selected = input<boolean>(false);

  protected readonly textSize = computed(() => textSizeOf(this.props()));

  /** A prop as text (undefined when it isn't set). */
  protected text(key: string): string | undefined {
    return propText(this.props(), key);
  }
}

/** Base of a widget's hand-written settings panel. */
@Directive()
export abstract class BaseWidgetSettings {
  readonly props = model.required<WidgetProps>();

  protected text(key: string): string {
    return propText(this.props(), key) ?? '';
  }
}
