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
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface TokenResponseWithCreds extends TokenResponse {
  username?: string;
  password?: string;
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

  // Register a new cliente (mobile) — returns access + refresh tokens
  create(payload: Partial<ClienteDto> & { password?: string }) {
    // server now generates password; do not send password from client
    const { password, ...body } = payload as any;
    return this.http.post<TokenResponseWithCreds>(`${this.base}/clientes/register`, body);
  }

  update(id: string, patch: Partial<ClienteDto>) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/${id}/`, patch);
  }

  listVehiculos(clienteId: string) {
    return this.http.get<VehiculoDto[]>(`${this.base}/clientes/${clienteId}/vehiculos`);
  }

  createVehiculo(clienteId: string, payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/${clienteId}/vehiculos`, payload);
  }

  createVehiculoPublic(clienteId: string, payload: Partial<VehiculoDto>) {
    // public vehicle-by-client endpoint removed on server
    throw new Error('createVehiculoPublic removed: use admin vehicle endpoints or a dedicated mobile flow');
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
