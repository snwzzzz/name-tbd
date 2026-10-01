import { Directive, computed, input, model } from '@angular/core';
import { WidgetProps } from '../_types/layout.types';
import { propText } from '../_utils/widget-props.utils';
import { textSizeOf } from '../core/rendering/text-sizes';

/**
 * Base of every widget the canvas places: the canvas sets `id` and `props`. Its "Text size" prop
 * sets --widget-text-size, which all widget text is sized by.
 */
@Directive({ host: { '[style.--widget-text-size]': 'textSize()' } })
export abstract class BaseWidget {
  readonly id = input.required<string>();
  readonly props = model<WidgetProps>({});
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
