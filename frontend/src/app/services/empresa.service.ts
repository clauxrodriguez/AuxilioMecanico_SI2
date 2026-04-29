import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmpresaDto {
  id: string;
  nombre: string;
  nit?: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

@Injectable({ providedIn: 'root' })
export class EmpresaApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  getMyEmpresa(): Observable<EmpresaDto> {
    return this.http.get<EmpresaDto>(`${this.base}/empresa/me`);
  }

  updateUbicacion(latitud: number | null, longitud: number | null): Observable<EmpresaDto> {
    return this.http.patch<EmpresaDto>(`${this.base}/empresa/me/ubicacion`, {
      latitud,
      longitud,
    });
  }
}
