import { InjectionToken } from '@angular/core';
import { AppDefinition } from '../../app/core/definition/app-definition';

/** The app this runtime runs (see read-definition.ts). */
export const APP_DEFINITION = new InjectionToken<AppDefinition>('APP_DEFINITION');
