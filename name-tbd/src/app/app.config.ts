import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideDefaultClient } from './api';
import { API_BASE_URL } from './_constants/api.constants';

// The API client in ./api is generated; regenerate it with:
// npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDefaultClient({ basePath: API_BASE_URL, interceptors: [] }),
  ],
};
