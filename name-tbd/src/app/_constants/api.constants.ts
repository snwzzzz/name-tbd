export const API_BASE_URL = 'http://localhost:8080';

/** Download URL of a page exported as a single HTML file. */
export const pageExportUrl = (pageId: string) => `${API_BASE_URL}/api/export/page/${pageId}`;
