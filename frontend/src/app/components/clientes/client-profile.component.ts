import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto, VehiculoDto } from '../../services/cliente.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Mi perfil de cliente</h2>
          <p class="muted">Consulta tus datos y registra tus vehiculos.</p>
        </div>
        <a routerLink="/app/incidentes" class="btn btn-primary">Mis incidentes</a>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <section class="card inner" *ngIf="cliente as c">
        <div class="form-grid">
          <div>
            <label class="label">Nombre</label>
            <input class="input" [value]="c.nombre || 'N/A'" disabled />
          </div>
          <div>
            <label class="label">Usuario</label>
            <input class="input" [value]="auth.currentUser?.username || 'N/A'" disabled />
          </div>
          <div>
            <label class="label">Correo</label>
            <input class="input" [value]="c.email || auth.currentUser?.email || 'N/A'" disabled />
          </div>
          <div>
            <label class="label">Telefono</label>
            <input class="input" [value]="c.telefono || 'N/A'" disabled />
          </div>
        </div>
      </section>

      <section class="card inner" style="margin-top: 1rem;">
        <h3>Nuevo vehiculo</h3>
        <div class="form-grid">
          <input class="input" [(ngModel)]="newVehiculo.marca" placeholder="Marca" />
          <input class="input" [(ngModel)]="newVehiculo.modelo" placeholder="Modelo" />
          <input class="input" [(ngModel)]="newVehiculo.placa" placeholder="Placa" />
          <input class="input" type="number" [(ngModel)]="newVehiculo.anio" placeholder="Ano" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="button" (click)="createVehiculo()" [disabled]="loadingVehiculos">Agregar vehiculo</button>
        </div>
      </section>

      <section class="card inner" style="margin-top: 1rem;">
        <h3>Mis vehiculos</h3>
        <p class="muted" *ngIf="loadingVehiculos">Cargando vehiculos...</p>
        <ul *ngIf="!loadingVehiculos">
          <li *ngFor="let v of vehiculos" class="veh-row">
            <span>{{ v.marca || 'N/A' }} {{ v.modelo || '' }} - {{ v.placa || 'N/A' }} ({{ v.anio || 'N/A' }})</span>
          </li>
        </ul>
      </section>
    </section>
  `,
  styles: [
    `
      .page-block { padding: 1rem; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
      .muted { color: var(--muted); }
      .inner { padding: 1rem; }
      .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
      .actions { margin-top: 0.75rem; }
      .veh-row { margin: 0.45rem 0; color: var(--text); }
    `,
  ],
})
export class ClientProfileComponent implements OnInit {
  cliente: ClienteDto | null = null;
  vehiculos: VehiculoDto[] = [];
  loadingVehiculos = false;
  errorMsg = '';

  newVehiculo: Partial<VehiculoDto> = {
    marca: '',
    modelo: '',
    placa: '',
    anio: undefined,
  };

  constructor(
    public readonly auth: AuthService,
    private readonly clienteApi: ClienteApiService,
  ) {}

  ngOnInit(): void {
    this.clienteApi.getMe().subscribe({
      next: (cliente) => (this.cliente = cliente),
      error: (error) => (this.errorMsg = error?.error?.detail || 'No se pudo cargar el perfil de cliente.'),
    });
    this.loadVehiculos();
  }

  loadVehiculos(): void {
    this.loadingVehiculos = true;
    this.clienteApi.listMyVehiculos().subscribe({
      next: (vehiculos) => {
        this.vehiculos = vehiculos || [];
        this.loadingVehiculos = false;
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar los vehiculos.';
      },
    });
  }

  createVehiculo(): void {
    if (!this.newVehiculo.marca || !this.newVehiculo.modelo || !this.newVehiculo.placa) {
      this.errorMsg = 'Marca, modelo y placa son requeridos.';
      return;
    }

    this.loadingVehiculos = true;
    this.clienteApi.createMyVehiculo(this.newVehiculo).subscribe({
      next: () => {
        this.newVehiculo = { marca: '', modelo: '', placa: '', anio: undefined };
        this.loadVehiculos();
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar el vehiculo.';
      },
    });
  }
}