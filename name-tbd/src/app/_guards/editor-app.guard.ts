import { DOCUMENT, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { EditorContext } from '../_services/editor-context.service';
import { ToastService } from '../_services/toast.service';

/**
 * Opens the editor on application `:appId`: loads it first (EditorContext), or goes back to the
 * console when it doesn't exist (or isn't the user's). Opening a different application than the one
 * already loaded reloads the page, so nothing the editor loaded for the first one carries over.
 */
export const editorAppGuard: CanActivateFn = (route, state) => {
  const context = inject(EditorContext);
  const router = inject(Router);
  const toasts = inject(ToastService);
  const document = inject(DOCUMENT);

  const appId = Number(route.paramMap.get('appId'));
  if (!Number.isInteger(appId) || appId === 0) return router.createUrlTree(['/console']);

  const loaded = context.appId();
  if (loaded === appId) return true;
  if (loaded !== null) {
    document.location.assign(state.url);
    return false;
  }

  return context.load(appId).pipe(
    map((app) => {
      if (app.defaultBranchId == null) {
        toasts.show("This application has no branch to edit.", 'warning');
        return router.createUrlTree(['/console']);
      }
      return true;
    }),
    catchError((error: unknown) => {
      // A 401 is the auth interceptor's (it goes to the login page)
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        toasts.show("That application doesn't exist (anymore).", 'warning');
      }
      return of(router.createUrlTree(['/console']));
    }),
  );
};
