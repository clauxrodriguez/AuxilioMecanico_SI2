import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NotificationDto {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creada_en: string;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las notificaciones del usuario actual
   */
  getMyNotifications(): Observable<NotificationDto[]> {
    return this.http
      .get<{ items: NotificationDto[]; total: number }>(`${this.base}/notificaciones/me/`)
      .pipe(map((res) => res.items || []));
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId: string): Observable<NotificationDto> {
    return this.http.patch<NotificationDto>(
      `${this.base}/notificaciones/${notificationId}/leer`,
      {}
    );
  }

  /**
   * Obtiene el detalle de una notificación
   */
  getDetail(notificationId: string): Observable<NotificationDto> {
    // Backend does not expose a single-get endpoint, reuse /me/ and find locally
    return this.getMyNotifications().pipe(
      map((items) => items.find((i) => i.id === notificationId) as NotificationDto)
    );
  }
}
