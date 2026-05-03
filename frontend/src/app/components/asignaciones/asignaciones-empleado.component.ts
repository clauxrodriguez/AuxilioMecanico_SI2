import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService, MiAsignacionDto } from '../../services/empleado.service';
import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

type EstadoSolicitud = 'asignada' | 'aceptada' | 'en_proceso' | 'atendido' | 'cerrado' | 'finalizado' | string;

@Component({
  selector: 'app-asignaciones-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="page">
      <header class="hero card">
        <div>
          <p class="eyebrow">Empleado</p>
          <h2>Mis asignaciones</h2>
          <p class="lead">La lista se separa entre solicitudes activas y solicitudes ya atendidas.</p>
        </div>

        <button class="btn btn-ghost" type="button" (click)="cargarAsignaciones()" [disabled]="loading">
          {{ loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </header>

      <section class="grid">
        <article class="panel card">
          <div class="panel-head">
            <div>
              <h3>Solicitudes asignadas</h3>
              <p class="muted">Pendientes o en proceso</p>
            </div>
            <span class="count">{{ solicitudesAsignadas.length }}</span>
          </div>

          <div *ngIf="loading" class="empty-state">Cargando solicitudes...</div>
          <div *ngIf="!loading && solicitudesAsignadas.length === 0" class="empty-state">
            No tienes solicitudes activas.
          </div>

          <div *ngIf="!loading && solicitudesAsignadas.length > 0" class="list">
            <article class="request-card" *ngFor="let solicitud of solicitudesAsignadas">
              <div class="request-top">
                <div>
                  <h4>{{ solicitud.incidente_tipo || 'Solicitud' }}</h4>
                  <p>{{ solicitud.incidente_descripcion || 'Sin descripción' }}</p>
                </div>
                <span class="state state-active">{{ etiquetaEstado(solicitud) }}</span>
              </div>

              <div class="meta-grid">
                <div>
                  <span class="label">Servicio</span>
                  <strong>{{ solicitud.servicio_nombre || 'Sin servicio' }}</strong>
                </div>
                <div>
                  <span class="label">Fecha</span>
                  <strong>{{ solicitud.fecha_asignacion | date:'short' }}</strong>
                </div>
                <div>
                  <span class="label">Ubicación</span>
                  <strong>{{ coordText(solicitud.incidente_latitud, solicitud.incidente_longitud) }}</strong>
                </div>
                <div>
                  <span class="label">Estado</span>
                  <strong>{{ solicitud.incidente_estado || solicitud.estado_tarea }}</strong>
                </div>
              </div>

              <div class="actions">
                <button class="btn btn-secondary" type="button" (click)="abrirDetalle(solicitud)">Ver detalle</button>
                <button class="btn btn-primary" type="button" (click)="abrirDetalleConEstado(solicitud, 'en_proceso')">En proceso</button>
                <button class="btn btn-success" type="button" (click)="abrirDetalleConEstado(solicitud, 'atendido')">Marcar atendida</button>
              </div>
            </article>
          </div>
        </article>

        <article class="panel card attended-panel">
          <div class="panel-head">
            <div>
              <h3>Solicitudes ya atendidas</h3>
              <p class="muted">Cerradas, finalizadas o atendidas</p>
            </div>
            <span class="count count-soft">{{ solicitudesAtendidas.length }}</span>
          </div>

          <div *ngIf="loading" class="empty-state">Cargando solicitudes...</div>
          <div *ngIf="!loading && solicitudesAtendidas.length === 0" class="empty-state">
            No hay solicitudes atendidas todavía.
          </div>

          <div *ngIf="!loading && solicitudesAtendidas.length > 0" class="list">
            <article class="request-card request-card-done" *ngFor="let solicitud of solicitudesAtendidas">
              <div class="request-top">
                <div>
                  <h4>{{ solicitud.incidente_tipo || 'Solicitud' }}</h4>
                  <p>{{ solicitud.incidente_descripcion || 'Sin descripción' }}</p>
                </div>
                <span class="state state-done">{{ etiquetaEstado(solicitud) }}</span>
              </div>

              <div class="meta-grid">
                <div>
                  <span class="label">Servicio</span>
                  <strong>{{ solicitud.servicio_nombre || 'Sin servicio' }}</strong>
                </div>
                <div>
                  <span class="label">Fecha</span>
                  <strong>{{ solicitud.fecha_asignacion | date:'short' }}</strong>
                </div>
                <div>
                  <span class="label">Ubicación</span>
                  <strong>{{ coordText(solicitud.incidente_latitud, solicitud.incidente_longitud) }}</strong>
                </div>
                <div>
                  <span class="label">Estado</span>
                  <strong>{{ solicitud.incidente_estado || solicitud.estado_tarea }}</strong>
                </div>
              </div>

              <div class="actions">
                <button class="btn btn-secondary" type="button" (click)="abrirDetalle(solicitud)">Ver detalle</button>
                <button class="btn btn-ghost" type="button" (click)="abrirDetalleConEstado(solicitud, 'en_proceso')">Reabrir</button>
              </div>
            </article>
          </div>
        </article>
      </section>

      <div *ngIf="detalleVisible" class="modal-overlay" (click)="cerrarDetalle()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <p class="eyebrow">Detalle</p>
              <h3>Solicitud asignada</h3>
            </div>
            <button class="btn-close" type="button" (click)="cerrarDetalle()">×</button>
          </div>

          <div class="modal-body">
            <div *ngIf="detalleLoading" class="empty-state compact">Cargando detalle...</div>

            <ng-container *ngIf="!detalleLoading && detalleSolicitud">
              <div class="detail-card">
                <h4>{{ detalleSolicitud.tipo || 'Solicitud' }}</h4>
                <p>{{ detalleSolicitud.descripcion || 'Sin descripción' }}</p>
              </div>

              <div class="detail-grid">
                <div>
                  <span class="label">ID solicitud</span>
                  <strong>{{ detalleSolicitud.id }}</strong>
                </div>
                <div>
                  <span class="label">Estado actual</span>
                  <strong>{{ detalleSolicitud.estado }}</strong>
                </div>
                <div>
                  <span class="label">Vehiculo</span>
                  <strong>{{ detalleSolicitud.vehiculo_id || 'N/A' }}</strong>
                </div>
                <div>
                  <span class="label">Prioridad</span>
                  <strong>{{ detalleSolicitud.prioridad ?? 'N/A' }}</strong>
                </div>
                <div>
                  <span class="label">Ubicacion</span>
                  <strong>{{ coordText(detalleSolicitud.latitud, detalleSolicitud.longitud) }}</strong>
                </div>
                <div>
                  <span class="label">Creada</span>
                  <strong>{{ detalleSolicitud.creado_en | date:'short' }}</strong>
                </div>
              </div>

              <div class="state-editor">
                <label for="estadoSolicitud">Cambiar estado</label>
                <select id="estadoSolicitud" [(ngModel)]="estadoSeleccionado">
                  <option value="en_proceso">En proceso</option>
                  <option value="atendido">Atendido</option>
                </select>
              </div>

              <div class="actions modal-actions">
                <button class="btn btn-primary" type="button" (click)="guardarEstado()" [disabled]="savingState">
                  {{ savingState ? 'Guardando...' : 'Guardar estado' }}
                </button>
                <button class="btn btn-ghost" type="button" (click)="cerrarDetalle()">Cerrar</button>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <div *ngIf="message" class="alert" [class.success]="messageType === 'success'" [class.error]="messageType === 'error'">
        {{ message }}
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .card {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      }

      .hero {
        padding: 1.5rem;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .eyebrow {
        margin: 0 0 0.35rem 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        font-size: 0.72rem;
      }

      .hero h2,
      .panel h3,
      .modal-header h3 {
        margin: 0;
      }

      .lead,
      .muted,
      .request-card p,
      .detail-card p {
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .panel {
        padding: 1.25rem;
      }

      .panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .count {
        min-width: 2.5rem;
        padding: 0.35rem 0.6rem;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.18);
        color: #93c5fd;
        text-align: center;
        font-weight: 700;
      }

      .count-soft {
        background: rgba(34, 197, 94, 0.16);
        color: #86efac;
      }

      .list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .request-card {
        padding: 1rem;
        border-radius: 14px;
        border: 1px solid rgba(59, 130, 246, 0.2);
        background: rgba(59, 130, 246, 0.06);
      }

      .request-card-done {
        border-color: rgba(34, 197, 94, 0.18);
        background: rgba(34, 197, 94, 0.06);
      }

      .request-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .request-top h4 {
        margin: 0 0 0.35rem 0;
        font-size: 1rem;
      }

      .request-top p {
        margin: 0;
        line-height: 1.45;
      }

      .state {
        padding: 0.35rem 0.65rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .state-active {
        background: rgba(59, 130, 246, 0.16);
        color: #93c5fd;
      }

      .state-done {
        background: rgba(34, 197, 94, 0.16);
        color: #86efac;
      }

      .meta-grid,
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }

      .meta-grid {
        margin-bottom: 1rem;
      }

      .detail-grid {
        margin: 1rem 0;
      }

      .meta-grid .label,
      .detail-grid .label,
      .state-editor label {
        display: block;
        margin-bottom: 0.2rem;
        color: var(--muted);
        font-size: 0.82rem;
      }

      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .btn {
        border: none;
        border-radius: 10px;
        padding: 0.65rem 0.95rem;
        font-weight: 600;
        cursor: pointer;
      }

      .btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--brand);
        color: #fff;
      }

      .btn-secondary {
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.25);
      }

      .btn-success {
        background: rgba(34, 197, 94, 0.15);
        color: #86efac;
        border: 1px solid rgba(34, 197, 94, 0.25);
      }

      .btn-ghost {
        background: transparent;
        color: var(--muted);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .empty-state {
        padding: 1.4rem;
        text-align: center;
        color: var(--muted);
      }

      .compact {
        padding: 0.75rem 0;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        width: min(640px, calc(100vw - 2rem));
        max-height: 85vh;
        overflow: auto;
        border-radius: 18px;
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }

      .modal-header,
      .modal-body {
        padding: 1.25rem;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .btn-close {
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 1.4rem;
        cursor: pointer;
      }

      .detail-card {
        padding: 1rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .detail-card h4 {
        margin: 0 0 0.35rem 0;
      }

      .state-editor {
        margin-top: 1rem;
        display: grid;
        gap: 0.35rem;
      }

      .state-editor select {
        padding: 0.7rem 0.8rem;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
      }

      .modal-actions {
        margin-top: 1rem;
      }

      .alert {
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid transparent;
      }

      .alert.success {
        background: rgba(34, 197, 94, 0.14);
        color: #86efac;
        border-color: rgba(34, 197, 94, 0.25);
      }

      .alert.error {
        background: rgba(239, 68, 68, 0.14);
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.25);
      }

      @media (max-width: 980px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .hero,
        .panel-head,
        .request-top {
          flex-direction: column;
        }

        .meta-grid,
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AsignacionesEmpleadoComponent implements OnInit {
  solicitudesAsignadas: MiAsignacionDto[] = [];
  solicitudesAtendidas: MiAsignacionDto[] = [];
  loading = false;

  detalleVisible = false;
  detalleLoading = false;
  savingState = false;
  detalleSolicitud: IncidenteDto | null = null;
  detalleAsignacion: MiAsignacionDto | null = null;
  estadoSeleccionado: 'en_proceso' | 'atendido' = 'en_proceso';

  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    public readonly auth: AuthService,
    private readonly empleadoApi: EmpleadoApiService,
    private readonly incidenteApi: IncidenteApiService,
  ) {}

  ngOnInit(): void {
    console.log('[AsignacionesEmpleado] ngOnInit, currentUser:', this.auth.currentUser);
    if (!this.auth.currentUser?.empleado_id) {
      console.warn('[AsignacionesEmpleado] Usuario sin empleado_id asignado');
      this.mostrarMensaje('No tienes perfil de empleado asignado', 'error');
      this.loading = false;
      return;
    }
    this.cargarAsignaciones();
  }

  cargarAsignaciones(): void {
    this.loading = true;
    console.log('[AsignacionesEmpleado] Cargando asignaciones...');
    this.empleadoApi.getMyAsignaciones().subscribe({
      next: (items) => {
        console.log('[AsignacionesEmpleado] Respuesta recibida:', items);
        const ordenadas = [...(items || [])].sort(
          (a, b) => new Date(b.fecha_asignacion).getTime() - new Date(a.fecha_asignacion).getTime(),
        );
        this.solicitudesAsignadas = ordenadas.filter((item) => !this.esAtendida(item));
        this.solicitudesAtendidas = ordenadas.filter((item) => this.esAtendida(item));
        this.loading = false;
      },
      error: (err) => {
        console.error('[AsignacionesEmpleado] Error cargando asignaciones:', err);
        this.loading = false;
        this.mostrarMensaje('No se pudieron cargar tus asignaciones', 'error');
      },
    });
  }

  abrirDetalle(asignacion: MiAsignacionDto): void {
    this.detalleVisible = true;
    this.detalleLoading = true;
    this.detalleAsignacion = asignacion;
    this.detalleSolicitud = null;
    this.estadoSeleccionado = this.esAtendida(asignacion) ? 'atendido' : 'en_proceso';

    this.incidenteApi.get(asignacion.incidente_id).subscribe({
      next: (detalle) => {
        this.detalleSolicitud = detalle;
        this.detalleLoading = false;
      },
      error: () => {
        this.detalleLoading = false;
        this.mostrarMensaje('No se pudo cargar el detalle de la solicitud', 'error');
      },
    });
  }

  abrirDetalleConEstado(asignacion: MiAsignacionDto, estado: 'en_proceso' | 'atendido'): void {
    this.abrirDetalle(asignacion);
    this.estadoSeleccionado = estado;
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalleLoading = false;
    this.savingState = false;
    this.detalleSolicitud = null;
    this.detalleAsignacion = null;
  }

  guardarEstado(): void {
    if (!this.detalleSolicitud) {
      return;
    }

    this.savingState = true;
    this.incidenteApi.updateEstado(this.detalleSolicitud.id, { estado: this.estadoSeleccionado }).subscribe({
      next: () => {
        this.savingState = false;
        this.mostrarMensaje('Estado de la solicitud actualizado', 'success');
        this.cerrarDetalle();
        this.cargarAsignaciones();
      },
      error: () => {
        this.savingState = false;
        this.mostrarMensaje('No se pudo actualizar el estado', 'error');
      },
    });
  }

  esAtendida(asignacion: MiAsignacionDto): boolean {
    const estado = this.normalizarEstado(asignacion.incidente_estado || asignacion.estado_tarea);
    return ['atendido', 'cerrado', 'finalizado', 'completado'].includes(estado);
  }

  etiquetaEstado(asignacion: MiAsignacionDto): string {
    const estado = this.normalizarEstado(asignacion.incidente_estado || asignacion.estado_tarea);
    if (estado === 'atendido' || estado === 'cerrado' || estado === 'finalizado' || estado === 'completado') {
      return 'Atendida';
    }
    if (estado === 'en_proceso') {
      return 'En proceso';
    }
    if (estado === 'aceptada') {
      return 'Aceptada';
    }
    return 'Asignada';
  }

  coordText(latitud?: number | null, longitud?: number | null): string {
    if (latitud == null || longitud == null) {
      return 'Sin ubicacion';
    }
    return `${latitud.toFixed(4)}, ${longitud.toFixed(4)}`;
  }

  private normalizarEstado(estado?: string | null): string {
    return (estado || '').trim().toLowerCase();
  }

  private mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = tipo;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}