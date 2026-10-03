import { Provider } from '@angular/core';
import { EditorContext } from '../_services/editor-context.service';
import { ApplicationDto } from '../api/models';

/** The application specs open the editor on (what editorAppGuard would have loaded). */
export const TEST_APP: ApplicationDto = { id: 3, workspaceId: 1, title: 'Test app', defaultBranchId: 7 };

/** EditorContext with {@link TEST_APP} already open. */
export function provideTestEditorContext(app: ApplicationDto = TEST_APP): Provider {
  return {
    provide: EditorContext,
    useFactory: () => {
      const context = new EditorContext();
      context.app.set(app);
      return context;
    },
  };
}
