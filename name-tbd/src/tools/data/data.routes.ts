import { Routes } from '@angular/router';

/** The data tool: /data */
export const DATA_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./data-dashboard/data-dashboard').then((m) => m.DataDashboard) },
];
