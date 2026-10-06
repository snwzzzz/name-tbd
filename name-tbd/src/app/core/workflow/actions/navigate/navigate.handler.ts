import { Injectable, inject } from '@angular/core';
import { APP_NAVIGATION, APP_PAGES } from '../../../ports/app-ports';
import { PageParamsService } from '../../../services/page-params.service';
import { ActionHandler, ActionResult, ActionRun, NavigateConfig } from '../../../../_types/workflow.types';

/**
 * `navigate`: opens a page, with parameters its expressions see as `params.<name>` (e.g. the id of
 * the order to show). Values are templates: `{{ orders.selectedRow._id }}` keeps the value's type.
 */
@Injectable({ providedIn: 'root' })
export class NavigateHandler implements ActionHandler {
  private readonly navigation = inject(APP_NAVIGATION);
  private readonly pages = inject(APP_PAGES);
  private readonly params = inject(PageParamsService);

  async run(run: ActionRun): Promise<ActionResult> {
    const config = run.node.config as Partial<NavigateConfig>;
    const pageId = Number(config.pageId);
    const page = Number.isInteger(pageId) ? this.pages.page(pageId) : undefined;
    if (!page || page.layout) throw new Error('Choose the page to open');

    const params: Record<string, unknown> = {};
    for (const param of config.params ?? []) {
      if (param.name?.trim()) params[param.name.trim()] = run.template(param.value ?? '');
    }
    run.inputs({ page: page.name, params });
    if (!run.isCurrent()) return { outcome: 'stop' };

    this.params.set(String(pageId), params);
    this.navigation.openPage(pageId);
    return {};
  }
}
