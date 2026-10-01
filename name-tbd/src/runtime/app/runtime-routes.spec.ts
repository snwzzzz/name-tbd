import { appRoutes, homePage, pagePaths } from './runtime-routes';
import { testDefinition } from './test-definition';

describe('runtime routes', () => {
  it('gives each page its path as address, and sends unknown addresses home', () => {
    const definition = testDefinition();
    const routes = appRoutes(definition);

    expect(routes.map((r) => r.path)).toEqual(['', 'about', '**']);
    expect(routes[1].data).toEqual({ pageId: 2 });
    expect(routes[1].title).toBe('About · Shop');
    expect(routes[2].redirectTo).toBe('');
  });

  it('keeps addresses unique, and falls back to the first page as home', () => {
    const definition = testDefinition();
    definition.pages[1].path = '/';
    definition.homePageId = null;

    expect([...pagePaths(definition).values()]).toEqual(['', 'page-2']);
    expect(homePage(definition)?.id).toBe(1);
  });

  it('has a page saying so when the app has none', () => {
    const definition = { ...testDefinition(), pages: [] };
    expect(appRoutes(definition)).toEqual([{ path: '**', component: expect.anything() }]);
  });
});
