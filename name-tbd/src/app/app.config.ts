import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideDefaultClient } from './api';
import { WidgetRegistryService } from './core/widget-registry.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDefaultClient({
      basePath: 'http://localhost:8080',
      interceptors: []
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (reg: WidgetRegistryService) => () => reg.loadDefinitions(),
      deps: [WidgetRegistryService],
      multi: true,
    },
  ],
};

// npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
