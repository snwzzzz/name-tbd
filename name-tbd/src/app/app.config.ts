import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpActivityInterceptor } from './_services/http-activity.service';
import { authErrorInterceptor } from './_services/auth.service';
import { provideEditorRuntime } from './editor/runtime-adapters/editor-runtime.providers';
import { routes } from './app.routes';
import { provideDefaultClient } from './api';
import { API_BASE_URL } from './_constants/api.constants';
import { ReportingErrorHandler } from './_services/error-tracking';

// The API client in ./api is generated; regenerate it with:
// npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
    provideRouter(routes),
    // Angular's default HttpClient (which sends the XSRF-TOKEN cookie back as X-XSRF-TOKEN on writes),
    // plus counting requests for the busy indicator and sending a lost session to the login page
    provideHttpClient(withInterceptors([httpActivityInterceptor, authErrorInterceptor])),
    provideDefaultClient({ basePath: API_BASE_URL, interceptors: [] }),
    // Widgets and workflow actions (the runtime core) run on the editor's state
    provideEditorRuntime(),
  ],
};
