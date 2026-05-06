import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Seguimiento de Solicitud</h2>
          <p class="muted">Historial y estado de tus solicitudes de auxilio.</p>
        </div>
        <button class="btn btn-ghost" (click)="load()">Actualizar</button>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <div *ngIf="loading" class="muted">Cargando solicitudes...</div>
      <div *ngIf="!loading && incidents.length === 0" class="muted">No tienes solicitudes registradas.</div>

      <div class="incidents-list" *ngIf="!loading && incidents.length > 0">
        <article class="incident-card" *ngFor="let inc of incidents">
          <div class="incident-header">
            <div>
              <h4>{{ inc.tipo || 'Solicitud de Auxilio' }}</h4>
              <p class="muted">{{ inc.descripcion || 'Sin descripción' }}</p>
            </div>
            <span class="badge" [class.badge--pending]="inc.estado === 'pendiente'" 
                  [class.badge--processing]="inc.estado === 'en_proceso'"
                  [class.badge--completed]="inc.estado === 'atendido'">
              {{ inc.estado || 'N/A' }}
            </span>
          </div>

          <div class="incident-details">
            <div><span class="label">Tipo:</span> {{ inc.tipo || 'N/A' }}</div>
            <div><span class="label">Prioridad:</span> {{ inc.prioridad || 'N/A' }}</div>
            <div><span class="label">Ubicación:</span> {{ inc.latitud | number: '0.0000' }}, {{ inc.longitud | number: '0.0000' }}</div>
            <div><span class="label">Creado:</span> {{ inc.creado_en | date: 'short' }}</div>
          </div>

          <div class="incident-actions">
            <button class="btn btn-primary" (click)="viewTracking(inc.id)">Ver Seguimiento</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .page-block {
        padding: 1rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        gap: 0.8rem;
        flex-wrap: wrap;
      }

      .muted {
        color: var(--muted);
      }

      .error {
        color: #ef4444;
        margin-bottom: 1rem;
      }

      .incidents-list {
        display: grid;
        gap: 0.75rem;
      }

      .incident-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
      }

      .incident-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .incident-header h4 {
        margin: 0;
        font-size: 1.1rem;
      }

      .incident-header p {
        margin: 0.25rem 0 0 0;
        font-size: 0.9rem;
      }

      .badge {
        padding: 0.4rem 0.8rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 500;
        white-space: nowrap;
      }

      .badge--pending {
        background: #fbbf24;
        color: #000;
      }

      .badge--processing {
        background: #60a5fa;
        color: #fff;
      }

      .badge--completed {
        background: #34d399;
        color: #000;
      }

      .incident-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        font-size: 0.9rem;
      }

      .incident-details div {
        display: flex;
        gap: 0.5rem;
      }

      .label {
        font-weight: 500;
        min-width: 80px;
      }

      .incident-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }

      .btn {
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: 1px solid var(--line);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
      }

      .btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .btn-primary {
        background: var(--brand);
        border-color: var(--brand);
        color: white;
      }

      .btn-primary:hover {
        background: rgba(59, 130, 246, 0.9);
      }

      .btn-ghost {
        background: transparent;
        border-color: transparent;
      }

      .btn-ghost:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `,
  ],
})
export class IncidentHistoryComponent implements OnInit {
  incidents: IncidenteDto[] = [];
  loading = false;
  errorMsg = '';

  constructor(
    private readonly incidenteApi: IncidenteApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.incidenteApi.list().subscribe({
      next: (incidents) => {
        this.incidents = incidents || [];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar las solicitudes.';
      },
    });
  }

  viewTracking(incidenteId: string): void {
    this.router.navigate(['/app/incidentes', incidenteId, 'tracking']);
  }
}
