import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IncidenteDto {
  id: string;
  cliente_id?: string;
  vehiculo_id?: string;
  tipo?: string;
  descripcion?: string;
  estado: string;
  prioridad?: string;
  lat?: number;
  lng?: number;
  tiempo_estimado_minutos?: number;
  creado_en: string;
}

export interface DiagnosticoCreate {
  clasificacion?: number | null;
  resumen?: string | null;
  prioridad?: number | null;
}

@Injectable({ providedIn: 'root' })
export class IncidenteApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<IncidenteDto[]> {
    return this.http.get<IncidenteDto[]>(`${this.base}/incidentes/`);
  }

  get(id: string) {
    return this.http.get<IncidenteDto>(`${this.base}/incidentes/${id}/`);
  }

  create(payload: Partial<IncidenteDto>) {
    return this.http.post<IncidenteDto>(`${this.base}/incidentes/`, payload);
  }

  update(id: string, patch: Partial<IncidenteDto>) {
    return this.http.patch<IncidenteDto>(`${this.base}/incidentes/${id}/`, patch);
  }

  addDiagnostico(id: string, payload: DiagnosticoCreate) {
    return this.http.post(`${this.base}/incidentes/${id}/diagnosticos`, payload);
  }

  addEvidencia(id: string, tipo: string, archivo: string) {
    // send as url_archivo to match backend field naming
    return this.http.post(`${this.base}/incidentes/${id}/evidencias`, { tipo, url_archivo: archivo });
  }
}
