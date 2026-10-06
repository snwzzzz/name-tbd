import { Routes } from '@angular/router';

/** The simple builder: /simple. Independent of the editor; nothing from it may be imported here. */
export const SIMPLE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./simple-home/simple-home').then((m) => m.SimpleHome) },
];
