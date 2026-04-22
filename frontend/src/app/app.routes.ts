import { Routes } from '@angular/router';

import { authGuard } from './guards/auth/auth.guard';
import { HomeComponent } from './components/auth/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { ActivateInviteComponent } from './components/auth/activate-invite/activate-invite.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { EmpleadoComponent } from './components/empleado/empleado.component';
import { CargoComponent } from './components/cargo/cargo.component';
import { RolComponent } from './components/rol/rol.component';
import { PermisoComponent } from './components/permisos/permiso.component';
import { ServicioComponent } from './components/servicio/servicio.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'activate-invite', component: ActivateInviteComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleados' },
      { path: 'empleados', component: EmpleadoComponent },
      { path: 'cargos', component: CargoComponent },
      { path: 'servicios', component: ServicioComponent },
      { path: 'roles', component: RolComponent },
      { path: 'permisos', component: PermisoComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
