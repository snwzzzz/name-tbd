export type EditorMode = 'welcome' | 'edit' | 'workflow' | 'data';

export interface TabItem {
  id: string;
  title: string;
  /** The last mode used in this tab. */
  mode?: EditorMode;
}
