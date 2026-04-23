import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ClienteApiService } from '../../services/cliente.service';
import type { VehiculoDto, ClienteDto } from '../../services/cliente.service';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div class="card">
      <header class="head">
        <h3>Vehículos</h3>
      </header>

      <div *ngIf="loading" class="muted">Cargando vehículos...</div>
      <div *ngIf="!loading && vehiculos.length === 0" class="muted">No hay vehículos.</div>

      <ul>
        <li *ngFor="let v of vehiculos" class="veh-row">
          <div>
            <strong>{{ v.marca }} {{ v.modelo }}</strong>
            <div class="muted">Placa: {{ v.placa }} • Año: {{ v.anio }}</div>
            <div class="muted">Cliente: {{ v.cliente_nombre || v.cliente_id }}</div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn" (click)="makePrincipal(v)">{{ v.principal ? 'Principal' : 'Hacer principal' }}</button>
            <button class="btn btn-ghost" (click)="remove(v)">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `.veh-row { display:flex; justify-content:space-between; padding:0.5rem 0; }`,
    `.muted { color: var(--muted); }`,
  ],
})
export class VehiculosComponent implements OnInit {
  vehiculos: Array<VehiculoDto & { cliente_nombre?: string }> = [];
  loading = false;

  constructor(private api: ClienteApiService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.api.list().subscribe({
      next: (clients: ClienteDto[]) => {
        const calls = (clients || []).map((c) => this.api.listVehiculos(c.id));
        if (calls.length === 0) {
          this.vehiculos = [];
          this.loading = false;
          return;
        }
        forkJoin(calls).subscribe({
          next: (arrays) => {
            const flat = ([] as VehiculoDto[]).concat(...arrays.map((a) => a || []));
            const clientMap = new Map((clients || []).map((c) => [c.id, c.nombre]));
            this.vehiculos = flat.map((v) => ({ ...v, cliente_nombre: clientMap.get(v.cliente_id || '') }));
            this.loading = false;
          },
          error: () => (this.loading = false),
        });
      },
      error: () => (this.loading = false),
    });
  }

  makePrincipal(v: VehiculoDto) {
    this.api.setPrincipal(v.id).subscribe({ next: () => this.loadAll() });
  }

  remove(v: VehiculoDto) {
    this.api.deleteVehiculo(v.id).subscribe({ next: () => this.loadAll() });
  }
}
