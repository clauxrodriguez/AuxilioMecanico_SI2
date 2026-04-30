import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import {
  IncidenteApiService,
  IncidenteDto,
  TecnicoCercanoDto,
  AsignarTecnicoRequest,
} from '../../services/incidente.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-incidentes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="container">
      <header class="header">
        <h2>Gestión de Incidentes</h2>
        <p class="subtitle">Asigna técnicos a solicitudes pendientes</p>
      </header>

      <!-- SecciÃ³n: Mi ubicaciÃ³n del tÃ©cnico -->
      <section class="section tech-location">
        <h3>Mi Ubicación (Técnico)</h3>
        <div class="tech-location-content">
          <div class="checkbox-group">
            <input type="checkbox" id="disponible" [(ngModel)]="miDisponible" />
            <label for="disponible">Disponible para asignaciones</label>
          </div>
          <button class="btn btn-primary" (click)="actualizarMiUbicacion()" [disabled]="updatingLocation">
            {{ updatingLocation ? 'Actualizando...' : 'Actualizar mi ubicación' }}
          </button>
          <div class="muted" *ngIf="ultimaUbicacionActualizada">
            Última actualización: {{ ultimaUbicacionActualizada | date:'short' }}
          </div>
        </div>
      </section>

      <!-- SecciÃ³n: Lista de incidentes -->
      <section class="section incidents-list">
        <div class="section-head">
          <div>
            <h3>Incidentes Pendientes</h3>
            <p class="subtitle">{{ incidents.length }} solicitud(es) sin asignar</p>
          </div>
          <button class="btn btn-ghost" (click)="cargarIncidentes()" [disabled]="loading">
            {{ loading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>

        <div *ngIf="loading" class="loading">Cargando incidentes...</div>
        <div *ngIf="!loading && incidents.length === 0" class="empty">
          <p>âœ“ No hay incidentes pendientes</p>
        </div>

        <div *ngIf="!loading && incidents.length > 0" class="incidents-grid">
          <div *ngFor="let incidente of incidents" class="incident-card" [class.assigned]="incidente.estado !== 'pendiente'">
            <!-- Header de la card -->
            <div class="card-header">
              <div class="tipo-prioridad">
                <h4>{{ incidente.tipo }}</h4>
                <span class="priority-badge" [style.background]="getPriorityColor(incidente.prioridad)">
                  P{{ incidente.prioridad || '-' }}
                </span>
              </div>
              <span class="estado-badge" [ngClass]="'estado-' + (incidente.estado || 'pendiente')">
                {{ incidente.estado || 'pendiente' }}
              </span>
            </div>

            <!-- Contenido de la card -->
            <div class="card-content">
              <p class="descripcion">{{ incidente.descripcion }}</p>

              <!-- Grid de información -->
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Vehículo</span>
                  <span class="value">{{ incidente.vehiculo_id || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Ubicación</span>
                  <span class="value coords">
                    {{ incidente.latitud?.toFixed(4) || '-' }},
                    {{ incidente.longitud?.toFixed(4) || '-' }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">Fecha</span>
                  <span class="value">{{ incidente.creado_en | date:'short' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">ID</span>
                  <span class="value">{{ incidente.id }}</span>
                </div>
              </div>
            </div>

            <!-- Botones de acción -->
            <div class="card-actions">
              <button class="btn btn-secondary" (click)="abrirMapa(incidente)">
                📍 Ver en mapa
              </button>
              <button
                class="btn btn-primary"
                (click)="abrirModalAsignar(incidente)"
                [disabled]="incidente.estado !== 'pendiente'"
              >
                👤 Asignar técnico
              </button>
              <button class="btn btn-ghost" (click)="verTracking(incidente)">
                📊 Ver tracking
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal: Asignar técnico -->
      <div *ngIf="modalAsignarVisible" class="modal-overlay" (click)="cerrarModalAsignar()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Asignar Técnico</h3>
            <button class="btn-close" (click)="cerrarModalAsignar()">✕</button>
          </div>

          <div class="modal-body">
            <div *ngIf="modalIncidentes">
              <p class="incidente-info">
                <strong>{{ modalIncidentes.tipo }}</strong> - {{ modalIncidentes.descripcion }}
              </p>

              <div *ngIf="cargandoTecnicos" class="loading">Cargando técnicos cercanos...</div>

              <div *ngIf="!cargandoTecnicos && tecnicosCercanos.length === 0" class="empty-tecnico">
                No hay técnicos disponibles cerca de esta ubicación
              </div>

              <div *ngIf="!cargandoTecnicos && tecnicosCercanos.length > 0" class="tecnicos-list">
                <div *ngFor="let tecnico of tecnicosCercanos" class="tecnico-item">
                  <div class="tecnico-info">
                    <div class="tecnico-header">
                      <strong>{{ tecnico.nombre_completo }}</strong>
                      <span class="disponibilidad" [class.disponible]="tecnico.disponible">
                        {{ tecnico.disponible ? '● Disponible' : '○ Ocupado' }}
                      </span>
                    </div>
                    <div class="tecnico-details">
                      <span>Distancia: <strong>{{ tecnico.distancia_km.toFixed(1) }} km</strong></span>
                    </div>
                  </div>
                  <button
                    class="btn btn-primary"
                    (click)="confirmarAsignacion(tecnico)"
                    [disabled]="asignando"
                  >
                    {{ asignando ? 'Asignando...' : 'Asignar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="cerrarModalAsignar()">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Mensaje -->
      <div *ngIf="message" class="alert" [class.success]="messageType === 'success'" [class.error]="messageType === 'error'">
        {{ message }}
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .header {
        margin-bottom: 2rem;
      }

      .header h2 {
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }

      .subtitle {
        color: var(--muted);
        margin: 0;
        font-size: 0.95rem;
      }

      .section {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.05) 0%,
          rgba(255, 255, 255, 0.02) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .section h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
      }

      .tech-location-content {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .checkbox-group input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .checkbox-group label {
        cursor: pointer;
        font-weight: 500;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .section-head > div {
        flex: 1;
      }

      .section-head h3 {
        margin: 0 0 0.25rem 0;
      }

      .loading,
      .empty,
      .empty-tecnico {
        padding: 2rem;
        text-align: center;
        color: var(--muted);
        font-weight: 500;
      }

      .incidents-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .incident-card {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.08) 0%,
          rgba(99, 102, 241, 0.05) 100%
        );
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }

      .incident-card:hover {
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      }

      .incident-card.assigned {
        border-color: rgba(34, 197, 94, 0.2);
        background: linear-gradient(
          135deg,
          rgba(34, 197, 94, 0.08) 0%,
          rgba(34, 197, 94, 0.05) 100%
        );
      }

      .card-header {
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 0.75rem;
      }

      .tipo-prioridad {
        flex: 1;
      }

      .tipo-prioridad h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .priority-badge {
        display: inline-block;
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
        color: white;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .estado-badge {
        padding: 0.5rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        text-transform: uppercase;
      }

      .estado-pendiente {
        background: rgba(249, 115, 22, 0.2);
        color: #fb923c;
      }

      .estado-asignado {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }

      .estado-en_proceso {
        background: rgba(139, 92, 246, 0.2);
        color: #c084fc;
      }

      .estado-atendido {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
      }

      .card-content {
        padding: 1rem;
        flex: 1;
      }

      .descripcion {
        margin: 0 0 1rem 0;
        color: var(--text);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
      }

      .info-item .label {
        color: var(--muted);
        font-weight: 500;
      }

      .info-item .value {
        color: var(--text);
        font-weight: 500;
      }

      .coords {
        font-family: monospace;
        font-size: 0.8rem;
      }

      .card-actions {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        flex-wrap: wrap;
      }

      .btn {
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        flex: 1;
        min-width: 120px;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--brand);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }

      .btn-secondary {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.25);
      }

      .btn-ghost {
        background: transparent;
        color: var(--muted);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .btn-ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
        color: var(--text);
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .btn-close {
        background: none;
        border: none;
        color: var(--muted);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }

      .btn-close:hover {
        color: var(--text);
      }

      .modal-body {
        padding: 1.5rem;
      }

      .incidente-info {
        margin: 0 0 1.5rem 0;
        padding: 1rem;
        background: rgba(59, 130, 246, 0.1);
        border-left: 3px solid var(--brand);
        border-radius: 6px;
        font-size: 0.9rem;
      }

      .tecnicos-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .tecnico-item {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .tecnico-info {
        flex: 1;
      }

      .tecnico-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        gap: 0.5rem;
      }

      .tecnico-header strong {
        font-weight: 600;
      }

      .disponibilidad {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 500;
      }

      .disponibilidad.disponible {
        color: #86efac;
      }

      .tecnico-details {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: var(--muted);
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        gap: 0.5rem;
      }

      .alert {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        font-weight: 500;
      }

      .alert.success {
        background: rgba(34, 197, 94, 0.15);
        color: #86efac;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      .alert.error {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      @media (max-width: 768px) {
        .incidents-grid {
          grid-template-columns: 1fr;
        }

        .card-actions {
          flex-direction: column;
        }

        .btn {
          min-width: auto;
        }

        .section-head {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class IncidentesComponent implements OnInit {
  incidents: IncidenteDto[] = [];
  tecnicosCercanos: TecnicoCercanoDto[] = [];

  loading = false;
  cargandoTecnicos = false;
  asignando = false;
  updatingLocation = false;

  miDisponible = true;
  ultimaUbicacionActualizada: Date | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  modalAsignarVisible = false;
  modalIncidentes: IncidenteDto | null = null;

  constructor(
    private api: IncidenteApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarIncidentes();
  }

  cargarIncidentes(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (data) => {
        this.incidents = data;
        this.loading = false;
      },
      error: (err) => {
        this.mostrarMensaje('Error al cargar incidentes', 'error');
        this.loading = false;
      },
    });
  }

  actualizarMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.mostrarMensaje('GeolocalizaciÃ³n no disponible', 'error');
      return;
    }

    this.updatingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const payload = {
          latitud: lat,
          longitud: lon,
          disponible: this.miDisponible,
        };

        this.api.updateMiUbicacion(payload).subscribe({
          next: () => {
            this.ultimaUbicacionActualizada = new Date();
            this.mostrarMensaje('UbicaciÃ³n actualizada âœ“', 'success');
            this.updatingLocation = false;
          },
          error: () => {
            this.mostrarMensaje('Error al actualizar ubicaciÃ³n', 'error');
            this.updatingLocation = false;
          },
        });
      },
      () => {
        this.mostrarMensaje('No se pudo obtener tu ubicaciÃ³n', 'error');
        this.updatingLocation = false;
      },
    );
  }

  abrirModalAsignar(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) {
      this.mostrarMensaje('El incidente no tiene ubicaciÃ³n', 'error');
      return;
    }

    this.modalIncidentes = incidente;
    this.modalAsignarVisible = true;
    this.cargarTecnicosCercanos(incidente);
  }

  cargarTecnicosCercanos(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) return;

    this.cargandoTecnicos = true;
    this.api.listTecnicosCercanos(incidente.latitud, incidente.longitud).subscribe({
      next: (data) => {
        this.tecnicosCercanos = data;
        this.cargandoTecnicos = false;
      },
      error: () => {
        this.mostrarMensaje('Error al cargar tÃ©cnicos', 'error');
        this.cargandoTecnicos = false;
      },
    });
  }

  confirmarAsignacion(tecnico: any): void {
    if (!this.modalIncidentes) return;

    this.asignando = true;
    const payload: AsignarTecnicoRequest = {
      empleado_id: tecnico.empleado_id,
    };

    this.api.assignTecnico(this.modalIncidentes.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(
          `TÃ©cnico ${tecnico.nombre_completo} asignado âœ“`,
          'success',
        );
        this.cerrarModalAsignar();
        this.cargarIncidentes();
        this.asignando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al asignar tÃ©cnico', 'error');
        this.asignando = false;
      },
    });
  }

  cerrarModalAsignar(): void {
    this.modalAsignarVisible = false;
    this.modalIncidentes = null;
    this.tecnicosCercanos = [];
  }

  abrirMapa(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) return;
    const url = `https://maps.google.com/?q=${incidente.latitud},${incidente.longitud}`;
    window.open(url, '_blank');
  }

  verTracking(incidente: IncidenteDto): void {
    // Navegar a la pantalla de tracking
    window.location.href = `/tracking/${incidente.id}`;
  }

  getPriorityColor(prioridad?: number): string {
    if (!prioridad) return '#6b7280';
    if (prioridad <= 2) return '#22c55e'; // Verde - baja
    if (prioridad <= 3) return '#f59e0b'; // Naranja - media
    return '#ef4444'; // Rojo - alta
  }

  private mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = tipo;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}
