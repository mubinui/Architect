import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'project/new',
    loadComponent: () =>
      import('./features/project-setup/project-setup.component').then(
        (m) => m.ProjectSetupComponent
      ),
  },
  {
    path: 'project/:id',
    loadComponent: () =>
      import('./features/design-viewer/design-viewer.component').then(
        (m) => m.DesignViewerComponent
      ),
  },
  {
    path: 'project/:id/room/:roomId',
    loadComponent: () =>
      import('./features/design-viewer/room-detail.component').then(
        (m) => m.RoomDetailComponent
      ),
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/catalog/catalog-browser.component').then(
        (m) => m.CatalogBrowserComponent
      ),
  },
];
