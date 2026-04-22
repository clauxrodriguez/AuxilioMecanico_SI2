import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClienteService, Cliente } from '../../services/cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="card">
      <header style="display:flex;justify-content:space-between;align-items:center">
        <h3>Clientes</h3>
        <button class="btn" (click)="addDemo()">Agregar demo</button>
      </header>

      <div *ngIf="clientes.length === 0" class="muted">No hay clientes.</div>

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
export class ClientesComponent {
  clientes: Cliente[] = [];

  constructor(private svc: ClienteService) {
    this.clientes = this.svc.list();
  }

  addDemo() {
    const id = 'c' + Math.floor(Math.random() * 1000);
    const nuevo: Cliente = { id, nombre: 'Nuevo Cliente ' + id, vehiculos: [] };
    this.svc['clientes'].push(nuevo);
    this.clientes = this.svc.list();
  }
}
