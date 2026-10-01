/** What a tab shows: the Start screen, a page in one of its modes, or a sidebar panel (`panel`). */
export type EditorMode = 'welcome' | 'edit' | 'workflow' | 'data' | 'panel';

/** The modes a page can be switched between. */
export const PAGE_MODES: EditorMode[] = ['edit', 'workflow', 'data'];
export const isPageMode = (mode: EditorMode): boolean => PAGE_MODES.includes(mode);

export interface TabItem {
  id: string;
  title: string;
  /** The last mode used in this tab. */
  mode?: EditorMode;
}
