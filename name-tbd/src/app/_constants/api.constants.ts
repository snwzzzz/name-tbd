export const API_BASE_URL = 'http://localhost:8080';

/** The branch the editor works on: its pages, workflows and data sources. */
export const EDITOR_BRANCH_ID = -1;

/** Download URL of a branch's app, packaged in an export format (see ExportFormat.java). */
export const appExportUrl = (branchId: number, format = 'html') =>
  `${API_BASE_URL}/api/branches/${branchId}/export?format=${encodeURIComponent(format)}`;
