import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="card">
      <header class="head">
        <h3>Incidentes</h3>
      </header>

      <div *ngIf="loading" class="muted">Cargando incidentes...</div>
      <div *ngIf="!loading && incidents.length === 0" class="muted">No hay incidentes.</div>

      <ul>
        <li *ngFor="let it of incidents" style="margin:0.5rem 0; display:flex; justify-content:space-between; align-items:center">
          <div>
            <strong>{{ it.tipo || 'Incidente' }}</strong>
            <div class="muted">{{ it.descripcion }}</div>
            <div class="muted">Estado: {{ it.estado }} • Prioridad: {{ it.prioridad || 'N/A' }}</div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <select [(ngModel)]="it.estado">
              <option value="pendiente">pendiente</option>
              <option value="en_proceso">en_proceso</option>
              <option value="atendido">atendido</option>
            </select>
            <button class="btn" (click)="saveStatus(it)">Guardar</button>
            <button class="btn btn-ghost" (click)="addDiagPrompt(it)">Añadir diagnóstico</button>
            <button class="btn btn-ghost" (click)="addEvidPrompt(it)">Añadir evidencia</button>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `.muted { color: var(--muted); }`,
  ],
})
export class IncidentesComponent implements OnInit {
  incidents: IncidenteDto[] = [];
  loading = false;

  constructor(private api: IncidenteApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.list().subscribe({ next: (rows) => { this.incidents = rows || []; this.loading = false; }, error: () => (this.loading = false) });
  }

  saveStatus(it: IncidenteDto) {
    this.api.update(it.id, { estado: it.estado }).subscribe({ next: () => this.load() });
  }

  addDiagPrompt(it: IncidenteDto) {
    const resumen = prompt('Resumen corto del diagnóstico');
    const clas = parseInt(prompt('Clasificación (número)') || '') || null;
    const prioridad = parseInt(prompt('Prioridad (número)') || '') || null;
    this.api.addDiagnostico(it.id, { clasificacion: clas, resumen, prioridad }).subscribe({ next: () => this.load() });
  }

  addEvidPrompt(it: IncidenteDto) {
    const url = prompt('URL de la evidencia (imagen/audio)');
    if (!url) return;
    this.api.addEvidencia(it.id, 'foto', url).subscribe({ next: () => this.load() });
  }
}
