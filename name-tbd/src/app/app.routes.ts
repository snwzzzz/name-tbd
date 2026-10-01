import { Routes } from '@angular/router';
import { Editor } from './editor/editor';

export const routes: Routes = [
  {
    path: 'console',
    loadComponent: () => import('./pages/console/console').then((m) => m.ApplicationConsole),
  },
  {
    path: 'editor',
    component: Editor,
    children: [
      { path: ':tabId/edit', loadComponent: () => import('./pages/canvas/canvas').then((m) => m.Canvas) },
      { path: ':tabId/workflow', loadComponent: () => import('./pages/workflow-editor/workflow-editor').then((m) => m.WorkflowEditor) },
      { path: ':tabId/data', loadComponent: () => import('./pages/data-editor/data-editor').then((m) => m.DataEditor) },
      { path: ':tabId/welcome', loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome) },
      { path: ':tabId/panel', loadComponent: () => import('./pages/panel-page/panel-page').then((m) => m.PanelPage) },
      { path: ':tabId', redirectTo: ':tabId/welcome', pathMatch: 'full' },
      { path: '', redirectTo: '1/welcome', pathMatch: 'full' },
    ],
  },
];
