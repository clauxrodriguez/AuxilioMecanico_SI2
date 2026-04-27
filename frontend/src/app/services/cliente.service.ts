import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VehiculoDto {
  id: string;
  cliente_id: string;
  anio?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  principal?: boolean;
}

export interface ClienteDto {
  id: string;
  nombre: string;
  username?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface ClienteCreatePayload {
  nombre: string;
  username: string;
  password: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface ClienteUpdatePayload {
  nombre?: string;
  username?: string;
  password?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClienteApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<ClienteDto[]> {
    return this.http.get<ClienteDto[]>(`${this.base}/clientes/`);
  }

  get(id: string): Observable<ClienteDto> {
    return this.http.get<ClienteDto>(`${this.base}/clientes/${id}/`);
  }

  create(payload: ClienteCreatePayload) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/`, payload);
  }

  update(id: string, patch: ClienteUpdatePayload) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/${id}/`, patch);
  }

  listVehiculos(clienteId: string) {
    return this.http.get<VehiculoDto[]>(`${this.base}/clientes/${clienteId}/vehiculos`);
  }

  getMe() {
    return this.http.get<ClienteDto>(`${this.base}/clientes/me/`);
  }

  listMyVehiculos() {
    return this.http.get<VehiculoDto[]>(`${this.base}/clientes/me/vehiculos`);
  }

  createMyVehiculo(payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/me/vehiculos`, payload);
  }

  createVehiculo(clienteId: string, payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/${clienteId}/vehiculos`, payload);
  }

  createVehiculoPublic(clienteId: string, payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/${clienteId}/vehiculos/public`, payload);
  }

  updateVehiculo(vehiculoId: string, patch: Partial<VehiculoDto>) {
    return this.http.put<VehiculoDto>(`${this.base}/vehiculos/${vehiculoId}/`, patch);
  }

  deleteVehiculo(vehiculoId: string) {
    return this.http.delete(`${this.base}/vehiculos/${vehiculoId}/`);
  }

  setPrincipal(vehiculoId: string) {
    return this.http.patch<VehiculoDto>(`${this.base}/vehiculos/${vehiculoId}/principal`, {});
  }
}
