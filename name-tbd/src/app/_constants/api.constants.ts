/**
 * Empty: the API is called on the editor's own origin. `ng serve` proxies /api (and the login
 * paths) to the backend (proxy.conf.json); a deploy puts both behind one reverse proxy.
 * Same-origin requests carry the session cookie and Angular's XSRF header without any CORS setup.
 */
export const API_BASE_URL = '';

/** The branch the editor works on: its pages, workflows and data sources. */
export const EDITOR_BRANCH_ID = -1;

/** Download URL of a branch's app, packaged in an export format (see ExportFormat.java). */
export const appExportUrl = (branchId: number, format = 'html') =>
  `${API_BASE_URL}/api/branches/${branchId}/export?format=${encodeURIComponent(format)}`;
