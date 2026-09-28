import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideDefaultClient } from './api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDefaultClient({
      basePath: 'http://localhost:8080/v3/api-docs',
    }),
  ],
};

// npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
