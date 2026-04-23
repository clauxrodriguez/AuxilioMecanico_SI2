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

  create(payload: Partial<ClienteDto>) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/`, payload);
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
