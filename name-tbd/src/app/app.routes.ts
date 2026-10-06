import { Routes } from '@angular/router';
import { Editor } from './editor/editor';
import { authGuard } from './_guards/auth.guard';
import { editorAppGuard } from './_guards/editor-app.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tools' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'tools',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tools/tools').then((m) => m.ToolsDashboard),
  },
  {
    // The simple builder: independent of the editor (src/tools/simple)
    path: 'simple',
    canActivate: [authGuard],
    loadChildren: () => import('../tools/simple/simple.routes').then((m) => m.SIMPLE_ROUTES),
  },
  {
    // Data management: connections to databases (src/tools/data)
    path: 'data',
    canActivate: [authGuard],
    loadChildren: () => import('../tools/data/data.routes').then((m) => m.DATA_ROUTES),
  },
  {
    path: 'console',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/console/console').then((m) => m.ApplicationConsole),
  },
  {
    // The editor, on one application (EditorContext): /apps/:appId/edit/:tabId/:mode
    path: 'apps/:appId/edit',
    canActivate: [authGuard, editorAppGuard],
    component: Editor,
    children: [
      { path: ':tabId/edit', loadComponent: () => import('./pages/canvas/canvas').then((m) => m.Canvas) },
      { path: ':tabId/workflow', loadComponent: () => import('./pages/workflow-editor/workflow-editor').then((m) => m.WorkflowEditor) },
      { path: ':tabId/data', loadComponent: () => import('./pages/data-editor/data-editor').then((m) => m.DataEditor) },
      { path: ':tabId/welcome', loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome) },
      { path: ':tabId/panel', loadComponent: () => import('./pages/panel-page/panel-page').then((m) => m.PanelPage) },
      { path: ':tabId', redirectTo: ':tabId/welcome', pathMatch: 'full' },
      // The Start tab (not tab '1', which would be page 1's)
      { path: '', redirectTo: 'welcome-0/welcome', pathMatch: 'full' },
    ],
  },
  // The editor before it had applications
  { path: 'editor', redirectTo: 'console' },
  { path: 'editor/**', redirectTo: 'console' },
];
