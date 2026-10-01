import { APP_DEFINITION_VERSION, AppDefinition } from '../../app/core/definition/app-definition';

/** Where the export puts the app: a JSON script in the page (see SingleFileHtmlExport.java). */
export const DEFINITION_ELEMENT_ID = 'app-definition';
/** Or next to the page, for exports made of several files. */
export const DEFINITION_FILE = 'app-definition.json';

/** The app to run: embedded in the page, or else from a file next to it. */
export async function readAppDefinition(doc: Document): Promise<AppDefinition> {
  const embedded = doc.getElementById(DEFINITION_ELEMENT_ID)?.textContent?.trim();
  const definition: AppDefinition = embedded ? JSON.parse(embedded) : await fetchDefinition();
  if (definition.version !== APP_DEFINITION_VERSION) {
    throw new Error(`This app was exported in format ${definition.version}; this runtime runs format ${APP_DEFINITION_VERSION}.`);
  }
  return definition;
}

async function fetchDefinition(): Promise<AppDefinition> {
  const response = await fetch(DEFINITION_FILE);
  if (!response.ok) {
    throw new Error(
      `There is no app in this page (and no ${DEFINITION_FILE} next to it). This is the empty app runtime: ` +
        'export an app with the editor\'s Export button and open the downloaded file instead.',
    );
  }
  return response.json();
}
