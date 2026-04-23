import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Cargo, Empleado, Permiso, Rol, Servicio } from '../models/user-management.models';

@Injectable({ providedIn: 'root' })
export class UserManagementApiService {
  constructor(private readonly http: HttpClient) {}

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${environment.apiBaseUrl}/empleados/`);
  }

  createEmpleado(payload: FormData): Observable<Empleado> {
    return this.http.post<Empleado>(`${environment.apiBaseUrl}/empleados/`, payload);
  }

  updateEmpleado(id: string, payload: FormData | Record<string, unknown>): Observable<Empleado> {
    return this.http.patch<Empleado>(`${environment.apiBaseUrl}/empleados/${id}/`, payload);
  }

  deleteEmpleado(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/empleados/${id}/`);
  }

  getCargos(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${environment.apiBaseUrl}/cargos/`);
  }

  createCargo(payload: { nombre: string; descripcion: string | null }): Observable<Cargo> {
    return this.http.post<Cargo>(`${environment.apiBaseUrl}/cargos/`, payload);
  }

  updateCargo(id: string, payload: Partial<{ nombre: string; descripcion: string | null }>): Observable<Cargo> {
    return this.http.patch<Cargo>(`${environment.apiBaseUrl}/cargos/${id}/`, payload);
  }

  deleteCargo(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/cargos/${id}/`);
  }

  getServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${environment.apiBaseUrl}/servicios/`);
  }

  createServicio(payload: { nombre: string; descripcion: string | null; activo: boolean }): Observable<Servicio> {
    return this.http.post<Servicio>(`${environment.apiBaseUrl}/servicios/`, payload);
  }

  updateServicio(
    id: string,
    payload: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>,
  ): Observable<Servicio> {
    return this.http.patch<Servicio>(`${environment.apiBaseUrl}/servicios/${id}/`, payload);
  }

  deleteServicio(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/servicios/${id}/`);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${environment.apiBaseUrl}/roles/`);
  }

  createRole(payload: { nombre: string; permisos: string[] }): Observable<Rol> {
    return this.http.post<Rol>(`${environment.apiBaseUrl}/roles/`, payload);
  }

  updateRole(id: string, payload: Partial<{ nombre: string; permisos: string[] }>): Observable<Rol> {
    return this.http.patch<Rol>(`${environment.apiBaseUrl}/roles/${id}/`, payload);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/roles/${id}/`);
  }

  getPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${environment.apiBaseUrl}/permisos/`);
  }

  createPermiso(payload: { nombre: string; descripcion: string }): Observable<Permiso> {
    return this.http.post<Permiso>(`${environment.apiBaseUrl}/permisos/`, payload);
  }

  updatePermiso(id: string, payload: Partial<{ nombre: string; descripcion: string }>): Observable<Permiso> {
    return this.http.patch<Permiso>(`${environment.apiBaseUrl}/permisos/${id}/`, payload);
  }

  deletePermiso(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/permisos/${id}/`);
  }
}
