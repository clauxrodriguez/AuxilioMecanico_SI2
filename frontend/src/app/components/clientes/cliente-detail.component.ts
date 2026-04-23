import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto, VehiculoDto } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div *ngIf="cliente" class="card">
      <h3>Cliente: {{ cliente.nombre }}</h3>
      <p class="muted">{{ cliente.email }} • {{ cliente.telefono }}</p>

      <section style="margin-top:1rem">
        <h4>Vehículos</h4>
        <div *ngIf="loadingVehiculos" class="muted">Cargando vehículos...</div>
        <div *ngIf="!loadingVehiculos && vehiculos.length === 0" class="muted">Sin vehículos.</div>
        <ul>
          <li *ngFor="let v of vehiculos" style="display:flex;justify-content:space-between;align-items:center">
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
          <h5>Agregar vehículo</h5>
          <input placeholder="Marca" [(ngModel)]="newMarca" />
          <input placeholder="Modelo" [(ngModel)]="newModelo" />
          <button class="btn" (click)="addVehiculo()">Agregar</button>
        </div>
      </section>
    </div>
    <div *ngIf="!cliente" class="muted card">Cliente no encontrado</div>
  `,
})
export class ClienteDetailComponent implements OnInit {
  cliente: ClienteDto | undefined;
  vehiculos: VehiculoDto[] = [];
  newMarca = '';
  newModelo = '';
  loadingVehiculos = false;

  constructor(private route: ActivatedRoute, private api: ClienteApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) return;
    this.api.get(id).subscribe({ next: (c) => (this.cliente = c) });
    this.loadVehiculos(id);
  }

  loadVehiculos(id: string) {
    this.loadingVehiculos = true;
    this.api.listVehiculos(id).subscribe({
      next: (rows) => {
        this.vehiculos = rows || [];
        this.loadingVehiculos = false;
      },
      error: () => (this.loadingVehiculos = false),
    });
  }

  addVehiculo() {
    if (!this.cliente) return;
    const payload = { marca: this.newMarca || 'Marca', modelo: this.newModelo || 'Modelo' };
    this.api.createVehiculo(this.cliente.id, payload).subscribe({ next: () => this.loadVehiculos(this.cliente!.id) });
    this.newMarca = '';
    this.newModelo = '';
  }

  setPrincipal(v: VehiculoDto) {
    this.api.setPrincipal(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  removeVehiculo(v: VehiculoDto) {
    this.api.deleteVehiculo(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }
}
