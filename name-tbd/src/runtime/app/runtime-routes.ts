import { Routes } from '@angular/router';
import { AppDefinition, DefinitionPage } from '../../app/core/definition/app-definition';
import { RuntimePage } from './runtime-page/runtime-page';
import { EmptyApp } from './empty-app';

/** The pages that are shown on their own (not the layout page). */
export const contentPages = (definition: AppDefinition): DefinitionPage[] => definition.pages.filter((p) => !p.layout);

/**
 * Each page's address in the app (router path, without slashes): its own path, or `page-<id>`
 * when that is taken by another page.
 */
export function pagePaths(definition: AppDefinition): Map<number, string> {
  const paths = new Map<number, string>();
  const taken = new Set<string>();
  for (const page of contentPages(definition)) {
    let path = page.path.trim().replace(/^\/+|\/+$/g, '');
    if (taken.has(path)) path = `page-${page.id}`;
    taken.add(path);
    paths.set(page.id, path);
  }
  return paths;
}

/** The page shown first, and for addresses that aren't a page. */
export function homePage(definition: AppDefinition): DefinitionPage | undefined {
  const pages = contentPages(definition);
  return pages.find((p) => p.id === definition.homePageId) ?? pages.find((p) => pagePaths(definition).get(p.id) === '') ?? pages[0];
}

/** One route per page (its id goes to RuntimePage's pageId input); anything else goes home. */
export function appRoutes(definition: AppDefinition): Routes {
  const home = homePage(definition);
  if (!home) return [{ path: '**', component: EmptyApp }];

  const paths = pagePaths(definition);
  return [
    ...contentPages(definition).map((page) => ({
      path: paths.get(page.id)!,
      component: RuntimePage,
      data: { pageId: page.id },
      title: page.name ? `${page.name} · ${definition.app.name}` : definition.app.name,
    })),
    { path: '**', redirectTo: paths.get(home.id)! },
  ];
}
