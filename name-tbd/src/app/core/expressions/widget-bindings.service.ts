import { Injectable, inject } from '@angular/core';
import { APP_NAVIGATION, APP_SESSION } from '../ports/app-ports';
import { ExpressionScopeService } from './expression-scope.service';
import { WidgetProps } from '../../_types/layout.types';
import { displayText, expressions, isTemplate } from '../../../flow-engine';

/** Whether any of the props is bound to an expression (a template). */
export const hasTemplates = (props: WidgetProps): boolean => Object.values(props).some(isTemplate);

/**
 * Widget settings bound to values: a prop whose text has `{{ expression }}` in it shows the
 * expression's value, e.g. a label's text `Total: {{ orderForm.amount * 2 }}`, a button's
 * disabled state, a table's `items`. Values become text, as props are text (a list: JSON).
 * Expressions see the scope of the page being shown (ExpressionScopeService).
 */
@Injectable({ providedIn: 'root' })
export class WidgetBindingsService {
  private readonly scopes = inject(ExpressionScopeService);
  private readonly session = inject(APP_SESSION);
  private readonly navigation = inject(APP_NAVIGATION);

  /**
   * The props with each template replaced by its value. One that fails is empty while the app runs;
   * while editing it shows as written, so the designer sees the expression.
   */
  resolve(props: WidgetProps): WidgetProps {
    const pageId = this.session.pageId() ?? this.navigation.currentPageId();
    if (!pageId) return props;
    let scope: object | undefined;
    const resolved: WidgetProps = { ...props };
    for (const [key, value] of Object.entries(props)) {
      if (!isTemplate(value)) continue;
      scope ??= this.scopes.scope(pageId);
      try {
        resolved[key] = displayText(expressions.template(value, scope));
      } catch {
        resolved[key] = this.session.live() ? '' : value;
      }
    }
    return resolved;
  }
}
