import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-admin-solicitudes-atendidas',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Solicitudes atendidas</h2>
          <p class="muted">Solicitudes finalizadas o cerradas.</p>
        </div>
        <button class="btn btn-ghost" (click)="load()" [disabled]="loading">{{ loading ? 'Cargando...' : 'Actualizar' }}</button>
      </header>

      <div *ngIf="loading" class="muted">Cargando...</div>
      <div *ngIf="!loading && items.length === 0" class="muted">No hay solicitudes atendidas.</div>

      <div class="list" *ngIf="!loading && items.length > 0">
        <article class="card" *ngFor="let it of items">
          <div class="row">
            <div>
              <strong>{{ it.tipo || 'Solicitud' }}</strong>
              <div class="muted">ID: {{ it.id }}</div>
            </div>
            <div class="right">
              <div class="muted">{{ it.creado_en | date: 'dd/MM/yyyy HH:mm' }}</div>
              <span class="badge estado">{{ it.estado }}</span>
            </div>
          </div>
          <p class="desc">{{ it.descripcion || 'Sin descripción' }}</p>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .page-block { padding: 1rem; }
      .head { display:flex; justify-content:space-between; align-items:center; }
      .muted { color: var(--muted); }
      .list { display:grid; gap:0.6rem; margin-top:1rem; }
      .card { padding:0.75rem; border:1px solid var(--line); border-radius:8px; }
      .row { display:flex; justify-content:space-between; align-items:center; }
      .right { text-align:right; }
      .desc { margin:0.5rem 0 0 0; color:var(--text-secondary); }
      .badge.estado { background:#f3f4f6; padding:0.25rem 0.5rem; border-radius:6px; font-weight:600; }
    `,
  ],
})
export class AdminSolicitudesAtendidasComponent implements OnInit {
  items: IncidenteDto[] = [];
  loading = false;

  constructor(private api: IncidenteApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (data) => {
        const closedStates = ['atendido', 'cerrado', 'finalizado'];
        const filtered = (data || []).filter((i) => closedStates.includes((i.estado || '').toLowerCase()));
        this.items = filtered.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
