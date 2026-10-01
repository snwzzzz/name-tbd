import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { DATA_SOURCE_QUERY_PARAM } from '../_constants/data-source.constants';

/**
 * The data source that's open (in the Data panel or the Data Manager). It lives in the URL
 * (`?dataSource=<id>`), so it survives reloads, can be linked to, and both views show the same one.
 */
@Injectable({ providedIn: 'root' })
export class OpenDataSourceService {
  private readonly router = inject(Router);

  /** The id of the open data source, or null. */
  readonly id = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const raw = this.router.parseUrl(this.router.url).queryParamMap.get(DATA_SOURCE_QUERY_PARAM);
        const id = Number(raw);
        return raw !== null && Number.isInteger(id) ? id : null;
      }),
    ),
    { initialValue: null },
  );

  /** Opens a data source (null closes it), changing only the query parameter. */
  open(id: number | null): void {
    this.router.navigate([], { queryParams: { [DATA_SOURCE_QUERY_PARAM]: id }, queryParamsHandling: 'merge' });
  }
}
