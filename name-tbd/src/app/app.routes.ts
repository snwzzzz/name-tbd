import { Routes } from '@angular/router';
import { ApplicationContainer } from './application-container/application-container';
import { Poc } from './poc/poc';
import { Editor } from './editor/editor';

export const routes: Routes = [
  {
    path: 'console',
    component: ApplicationContainer,
  },
  {
    path: 'poc',
    component: Poc,
  },
  {
    path: 'editor',
    component: Editor,
    children: [
      { path: ':tabId/edit', loadComponent: () => import('./canvas/canvas').then(m => m.Canvas) },
      { path: ':tabId/workflow', loadComponent: () => import('./workflow-editor/workflow-editor').then(m => m.WorkflowEditor) },
      { path: ':tabId/data', loadComponent: () => import('./data-editor/data-editor').then(m => m.DataEditor) },
      { path: ':tabId', redirectTo: ':tabId/edit', pathMatch: 'full' },
      { path: '', redirectTo: '1/edit', pathMatch: 'full' }
    ]
  },
];
