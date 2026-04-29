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
import { ClientesComponent } from './components/clientes/clientes.component';
import { ClienteCreateComponent } from './components/clientes/cliente-create.component';
import { ClienteDetailComponent } from './components/clientes/cliente-detail.component';
import { VehiculosComponent } from './components/vehiculos/vehiculos.component';
import { IncidentesComponent } from './components/incidentes/incidentes.component';
import { ServicioComponent } from './components/servicio/servicio.component';
import { UbicacionTallerComponent } from './components/taller/ubicacion-taller.component';
import { PagosComponent } from './components/taller/pagos.component';
import { ReportesComponent } from './components/taller/reportes.component';
import { ConfiguracionComponent } from './components/taller/configuracion.component';

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
      { path: '', pathMatch: 'full', redirectTo: 'incidentes' },
      { path: 'empleados/nuevo', component: EmpleadoComponent },
      { path: 'empleados', component: EmpleadoComponent },
      { path: 'cargos/nuevo', component: CargoComponent },
      { path: 'cargos', component: CargoComponent },
      { path: 'servicios/nuevo', component: ServicioComponent },
      { path: 'servicios', component: ServicioComponent },
      { path: 'roles/nuevo', component: RolComponent },
      { path: 'roles', component: RolComponent },
      { path: 'permisos/nuevo', component: PermisoComponent },
      { path: 'permisos', component: PermisoComponent },
      { path: 'clientes/nuevo', component: ClienteCreateComponent },
      { path: 'clientes/:id', component: ClienteDetailComponent },
      { path: 'clientes', component: ClientesComponent },
      {
        path: 'cliente/perfil',
        loadComponent: () =>
          import('./components/clientes/client-profile.component').then((m) => m.ClientProfileComponent),
      },
      {
        path: 'cliente/historial',
        loadComponent: () =>
          import('./components/incidentes/incident-history.component').then((m) => m.IncidentHistoryComponent),
      },
      { path: 'vehiculos', component: VehiculosComponent },
      { path: 'incidentes', component: IncidentesComponent },
      { path: 'incidentes/lista', component: IncidentesComponent },
      { path: 'taller/ubicacion', component: UbicacionTallerComponent },
      { path: 'taller/pagos', component: PagosComponent },
      { path: 'taller/reportes', component: ReportesComponent },
      { path: 'taller/configuracion', component: ConfiguracionComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
