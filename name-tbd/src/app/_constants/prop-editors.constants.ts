import { Type } from '@angular/core';
import { BasePropEditor } from '../_directives/base-prop-editor.directive';
import { DataSourcePropEditor } from '../editor/prop-editors/data-source-prop-editor/data-source-prop-editor';
import { ColumnsPropEditor } from '../editor/prop-editors/columns-prop-editor/columns-prop-editor';
import { PagePropEditor } from '../editor/prop-editors/page-prop-editor/page-prop-editor';
import { PagesPropEditor } from '../editor/prop-editors/pages-prop-editor/pages-prop-editor';
import { ColumnPropEditor } from '../editor/prop-editors/column-prop-editor/column-prop-editor';
import { FieldPropEditor } from '../editor/prop-editors/field-prop-editor/field-prop-editor';
import { WidgetPropEditor } from '../editor/prop-editors/widget-prop-editor/widget-prop-editor';

/**
 * Editors for prop types beyond the built-in ones (string, number, color, ...), by the prop type
 * used in the backend's widget_prop_definition. A new prop type is added by adding an entry here.
 */
export const PROP_EDITORS: Record<string, Type<BasePropEditor>> = {
  dataSource: DataSourcePropEditor,
  columns: ColumnsPropEditor,
  page: PagePropEditor,
  pages: PagesPropEditor,
  column: ColumnPropEditor,
  field: FieldPropEditor,
  widget: WidgetPropEditor,
};
