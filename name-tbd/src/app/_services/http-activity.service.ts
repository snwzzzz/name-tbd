import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

/** How many requests to the backend are running, for a busy indicator. */
@Injectable({ providedIn: 'root' })
export class HttpActivityService {
  private readonly running = signal(0);
  readonly busy = computed(() => this.running() > 0);

  started(): void {
    this.running.update((n) => n + 1);
  }

  ended(): void {
    this.running.update((n) => Math.max(0, n - 1));
  }
}

/** Counts every request in HttpActivityService while it runs. */
export const httpActivityInterceptor: HttpInterceptorFn = (req, next) => {
  const activity = inject(HttpActivityService);
  activity.started();
  return next(req).pipe(finalize(() => activity.ended()));
};
