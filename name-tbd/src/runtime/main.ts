import { bootstrapApplication } from '@angular/platform-browser';
import { readAppDefinition } from './app/read-definition';
import { runtimeConfig } from './app/runtime.config';
import { RuntimeShell } from './app/runtime-shell/runtime-shell';

// The exported app (built with `npm run build:runtime`; the backend's export embeds it)
readAppDefinition(document)
  .then((definition) => bootstrapApplication(RuntimeShell, runtimeConfig(definition)))
  .catch((err) => {
    console.error(err);
    document.body.textContent = `This app could not be started: ${err instanceof Error ? err.message : err}`;
  });
