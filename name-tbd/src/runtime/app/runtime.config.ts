import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { AppDefinition } from '../../app/core/definition/app-definition';
import { APP_DEFINITION } from './app-definition.token';
import { provideAppRuntime } from './runtime-adapters';
import { appRoutes } from './runtime-routes';

/** The exported app: its pages as routes (in the address' hash, so it runs from a file too). */
export function runtimeConfig(definition: AppDefinition): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: APP_DEFINITION, useValue: definition },
      provideRouter(appRoutes(definition), withHashLocation(), withComponentInputBinding()),
      provideAppRuntime(),
    ],
  };
}
