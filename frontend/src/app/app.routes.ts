import { Routes } from '@angular/router';

import { authGuard } from './guards/auth/auth.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { EmpleadoComponent } from './components/empleado/empleado.component';
import { RolComponent } from './components/rol/rol.component';
import { PermisoComponent } from './components/permisos/permiso.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleados' },
      { path: 'empleados', component: EmpleadoComponent },
      { path: 'roles', component: RolComponent },
      { path: 'permisos', component: PermisoComponent },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  { path: '**', redirectTo: 'app' },
];
