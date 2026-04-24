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
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Clientes</h2>
          <p class="muted">Registro y mantenimiento de clientes del taller.</p>
        </div>
        <a [routerLink]="['/app/clientes/nuevo']" class="btn btn-primary">Registrar cliente</a>
      </header>

      <div *ngIf="loading" class="muted">Cargando clientes...</div>
      <div *ngIf="!loading && clientes.length === 0" class="muted">No hay clientes.</div>

      <table class="table" *ngIf="!loading && clientes.length > 0">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Telefono</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of clientes">
            <td>{{ c.nombre }}</td>
            <td>{{ c.email || 'N/A' }}</td>
            <td>{{ c.telefono || 'N/A' }}</td>
            <td>
              <span class="badge">{{ c.activo === false ? 'Inactivo' : 'Activo' }}</span>
            </td>
            <td>
              <a [routerLink]="['/app/clientes', c.id]" class="btn btn-ghost">Editar</a>
            </td>
          </tr>
        </tbody>
      </table>
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
      }

      .muted {
        color: var(--muted);
      }
    `,
  ],
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
