import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initErrorTracking, loadRuntimeConfig } from './app/_services/error-tracking';

// The deploy's runtime settings first (error tracking), so errors during startup are reported too
loadRuntimeConfig()
  .then(initErrorTracking)
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
