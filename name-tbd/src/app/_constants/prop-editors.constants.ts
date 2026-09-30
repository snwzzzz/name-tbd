import { Type } from '@angular/core';
import { BasePropEditor } from '../_directives/base-prop-editor.directive';
import { DataSourcePropEditor } from '../widgets/prop-editors/data-source-prop-editor/data-source-prop-editor';
import { ColumnsPropEditor } from '../widgets/prop-editors/columns-prop-editor/columns-prop-editor';
import { PagePropEditor } from '../widgets/prop-editors/page-prop-editor/page-prop-editor';
import { PagesPropEditor } from '../widgets/prop-editors/pages-prop-editor/pages-prop-editor';

/**
 * Editors for prop types beyond the built-in ones (string, number, color, ...), by the prop type
 * used in the backend's widget_prop_definition. A new prop type is added by adding an entry here.
 */
export const PROP_EDITORS: Record<string, Type<BasePropEditor>> = {
  dataSource: DataSourcePropEditor,
  columns: ColumnsPropEditor,
  page: PagePropEditor,
  pages: PagesPropEditor,
};
