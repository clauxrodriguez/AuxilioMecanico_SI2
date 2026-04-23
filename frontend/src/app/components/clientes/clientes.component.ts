import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto } from '../../services/cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="card">
      <header style="display:flex;justify-content:space-between;align-items:center">
        <h3>Clientes</h3>
      </header>

      <div *ngIf="loading" class="muted">Cargando clientes...</div>
      <div *ngIf="!loading && clientes.length === 0" class="muted">No hay clientes.</div>

      <ul>
        <li *ngFor="let c of clientes" style="margin:0.5rem 0; display:flex; justify-content:space-between; align-items:center">
          <div>
            <strong>{{ c.nombre }}</strong>
            <div class="muted">{{ c.email }} • {{ c.telefono }}</div>
          </div>
          <div>
            <a [routerLink]="['/app/clientes', c.id]" class="btn btn-small">Ver</a>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [``],
})
export class ClientesComponent implements OnInit {
  clientes: ClienteDto[] = [];
  loading = false;

  constructor(private api: ClienteApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.list().subscribe({ next: (c) => { this.clientes = c || []; this.loading = false; }, error: () => (this.loading = false) });
  }
}
