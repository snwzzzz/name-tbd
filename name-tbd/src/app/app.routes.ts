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
  },
];
