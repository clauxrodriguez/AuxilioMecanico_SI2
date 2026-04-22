import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ClienteService, Vehiculo } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="cliente" class="card">
      <h3>Cliente: {{ cliente.nombre }}</h3>
      <p class="muted">{{ cliente.email }} • {{ cliente.telefono }}</p>

      <section style="margin-top:1rem">
        <h4>Vehículos</h4>
        <div *ngIf="cliente.vehiculos.length === 0" class="muted">Sin vehículos.</div>
        <ul>
          <li *ngFor="let v of cliente.vehiculos" style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>{{ v.marca }} {{ v.modelo }}</strong>
              <div class="muted">Placa: {{ v.placa }} • Año: {{ v.anio }}</div>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn" (click)="setPrincipal(v)">{{ v.principal ? 'Principal' : 'Hacer principal' }}</button>
              <button class="btn btn-ghost" (click)="removeVehiculo(v)">Eliminar</button>
            </div>
          </li>
        </ul>

        <div style="margin-top:1rem">
          <h5>Agregar vehículo (demo)</h5>
          <input placeholder="Marca" [(ngModel)]="newMarca" />
          <input placeholder="Modelo" [(ngModel)]="newModelo" />
          <button class="btn" (click)="addVehiculo()">Agregar</button>
        </div>
      </section>
    </div>
    <div *ngIf="!cliente" class="muted card">Cliente no encontrado</div>
  `,
})
export class ClienteDetailComponent {
  cliente: any | undefined;
  newMarca = '';
  newModelo = '';

  constructor(private route: ActivatedRoute, private svc: ClienteService) {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.cliente = this.svc.get(id);
  }

  addVehiculo() {
    if (!this.cliente) return;
    const id = 'v' + Math.floor(Math.random() * 10000);
    const veh: Vehiculo = { id, marca: this.newMarca || 'Marca', modelo: this.newModelo || 'Modelo' };
    this.svc.addVehiculo(this.cliente.id, veh);
    this.cliente = this.svc.get(this.cliente.id);
    this.newMarca = '';
    this.newModelo = '';
  }

  setPrincipal(v: Vehiculo) {
    if (!this.cliente) return;
    this.svc.setPrincipal(this.cliente.id, v.id);
    this.cliente = this.svc.get(this.cliente.id);
  }

  removeVehiculo(v: Vehiculo) {
    if (!this.cliente) return;
    this.svc.deleteVehiculo(this.cliente.id, v.id);
    this.cliente = this.svc.get(this.cliente.id);
  }
}
