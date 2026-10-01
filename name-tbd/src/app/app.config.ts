import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpActivityInterceptor } from './_services/http-activity.service';
import { provideEditorRuntime } from './editor/runtime-adapters/editor-runtime.providers';
import { routes } from './app.routes';
import { provideDefaultClient } from './api';
import { API_BASE_URL } from './_constants/api.constants';

// The API client in ./api is generated; regenerate it with:
// npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Same HttpClient setup as Angular's default, plus counting requests for the busy indicator
    provideHttpClient(withInterceptors([httpActivityInterceptor])),
    provideDefaultClient({ basePath: API_BASE_URL, interceptors: [] }),
    // Widgets and workflow actions (the runtime core) run on the editor's state
    provideEditorRuntime(),
  ],
};
