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
          <h2>Portal de cliente</h2>
          <p class="muted">Perfil y gestión de vehículos.</p>
        </div>
        <a routerLink="/app/incidentes" class="btn btn-ghost">Ir a Solicitud de Auxilio</a>
      </header>

      <nav class="menu-tabs">
        <button class="tab" [class.active]="activeSection === 'perfil'" (click)="setSection('perfil')">Perfil</button>
        <button class="tab" [class.active]="activeSection === 'vehiculos'" (click)="setSection('vehiculos')">Mis vehículos</button>
      </nav>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <section class="card inner" *ngIf="activeSection === 'perfil' && cliente as c">
        <div class="profile-summary">
          <div>
            <h3>{{ c.nombre || 'Perfil de cliente' }}</h3>
            <p class="muted">{{ auth.currentUser?.username || c.username || 'Usuario' }}</p>
          </div>
          <button class="btn btn-primary" type="button" (click)="editingProfile = !editingProfile">
            {{ editingProfile ? 'Cancelar edición' : 'Editar perfil' }}
          </button>
        </div>

        <div *ngIf="!editingProfile" class="profile-grid">
          <div><span class="label-inline">Nombre</span><strong>{{ c.nombre || 'N/A' }}</strong></div>
          <div><span class="label-inline">Usuario</span><strong>{{ auth.currentUser?.username || c.username || 'N/A' }}</strong></div>
          <div><span class="label-inline">Correo</span><strong>{{ c.email || auth.currentUser?.email || 'N/A' }}</strong></div>
          <div><span class="label-inline">Teléfono</span><strong>{{ c.telefono || 'N/A' }}</strong></div>
        </div>

        <form *ngIf="editingProfile" class="form-grid edit-grid" (ngSubmit)="saveProfile()">
          <div>
            <label class="label">Nombre</label>
            <input class="input" [(ngModel)]="profileForm.nombre" name="nombre" />
          </div>
          <div>
            <label class="label">Usuario</label>
            <input class="input" [(ngModel)]="profileForm.username" name="username" />
          </div>
          <div>
            <label class="label">Correo</label>
            <input class="input" [(ngModel)]="profileForm.email" name="email" />
          </div>
          <div>
            <label class="label">Teléfono</label>
            <input class="input" [(ngModel)]="profileForm.telefono" name="telefono" />
          </div>
          <div class="actions full-width">
            <button class="btn btn-primary" type="submit" [disabled]="savingProfile">Guardar cambios</button>
          </div>
        </form>
      </section>

      <section class="card inner" *ngIf="activeSection === 'vehiculos'">
        <div class="section-head">
          <div>
            <h3>Mis vehículos</h3>
            <p class="muted">Lista, detalle y registro nuevo.</p>
          </div>
          <button class="btn btn-primary" type="button" (click)="showVehicleForm = !showVehicleForm">
            {{ showVehicleForm ? 'Cerrar registro' : 'Registrar nuevo vehículo' }}
          </button>
        </div>

        <div *ngIf="showVehicleForm" class="card nested">
          <h4>Registrar nuevo vehículo</h4>
          <div class="form-grid">
            <input class="input" [(ngModel)]="newVehiculo.marca" placeholder="Marca" name="newMarca" />
            <input class="input" [(ngModel)]="newVehiculo.modelo" placeholder="Modelo" name="newModelo" />
            <input class="input" [(ngModel)]="newVehiculo.placa" placeholder="Placa" name="newPlaca" />
            <input class="input" type="number" [(ngModel)]="newVehiculo.anio" placeholder="Año" name="newAnio" />
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="button" (click)="createVehiculo()" [disabled]="loadingVehiculos">Guardar vehículo</button>
          </div>
        </div>

        <p class="muted" *ngIf="loadingVehiculos">Cargando vehículos...</p>
        <div *ngIf="!loadingVehiculos && vehiculos.length === 0" class="muted">No tienes vehículos registrados.</div>

        <div class="vehicle-list" *ngIf="vehiculos.length > 0">
          <article class="vehicle-card" *ngFor="let v of vehiculos">
            <div>
              <h4>{{ v.marca || 'N/A' }} {{ v.modelo || '' }}</h4>
              <p class="muted">Placa {{ v.placa || 'N/A' }}</p>
            </div>
            <div class="vehicle-actions">
              <button class="btn btn-ghost" type="button" (click)="selectVehicle(v)">Ver detalle</button>
              <button class="btn btn-ghost" type="button" (click)="setPrincipal(v)">{{ v.principal ? 'Principal' : 'Hacer principal' }}</button>
              <button class="btn btn-danger" type="button" (click)="removeVehiculo(v)">Eliminar</button>
            </div>
          </article>
        </div>

        <section class="card nested" *ngIf="selectedVehicle as v">
          <h4>Detalle del vehículo</h4>
          <div class="detail-grid">
            <div><span class="label-inline">Marca</span><strong>{{ v.marca || 'N/A' }}</strong></div>
            <div><span class="label-inline">Modelo</span><strong>{{ v.modelo || 'N/A' }}</strong></div>
            <div><span class="label-inline">Placa</span><strong>{{ v.placa || 'N/A' }}</strong></div>
            <div><span class="label-inline">Año</span><strong>{{ v.anio || 'N/A' }}</strong></div>
            <div><span class="label-inline">Principal</span><strong>{{ v.principal ? 'Sí' : 'No' }}</strong></div>
          </div>
        </section>
      </section>

    </section>
  `,
  styles: [
    `
      .page-block { padding: 1rem; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
      .muted { color: var(--muted); }
      .inner { padding: 1rem; margin-top: 1rem; }
      .nested { padding: 0.9rem; margin-top: 1rem; }
      .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
      .edit-grid, .full-width { grid-column: 1 / -1; }
      .actions { margin-top: 0.75rem; display: flex; gap: 0.6rem; flex-wrap: wrap; }
      .menu-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
      .tab { border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 999px; padding: 0.55rem 0.9rem; cursor: pointer; }
      .tab.active { background: var(--brand); border-color: var(--brand); color: white; }
      .profile-summary, .section-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
      .profile-grid, .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.8rem; margin-top: 1rem; }
      .label-inline { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.2rem; }
      .vehicle-list { display: grid; gap: 0.75rem; margin-top: 1rem; }
      .vehicle-card { border: 1px solid var(--line); border-radius: 12px; padding: 0.9rem; display: flex; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; }
      .vehicle-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    `,
  ],
})
export class ClientProfileComponent implements OnInit {

  cliente: ClienteDto | null = null;
  vehiculos: VehiculoDto[] = [];
  selectedVehicle: VehiculoDto | null = null;
  loadingVehiculos = false;
  savingProfile = false;
  editingProfile = false;
  showVehicleForm = false;
  activeSection: 'perfil' | 'vehiculos' = 'perfil';
  errorMsg = '';

  profileForm = {
    nombre: '',
    username: '',
    email: '',
    telefono: '',
  };

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
      next: (cliente) => {
        this.cliente = cliente;
        this.profileForm = {
          nombre: cliente.nombre || '',
          username: this.auth.currentUser?.username || cliente.username || '',
          email: cliente.email || this.auth.currentUser?.email || '',
          telefono: cliente.telefono || '',
        };
      },
      error: (error) => (this.errorMsg = error?.error?.detail || 'No se pudo cargar el perfil de cliente.'),
    });
    this.loadVehiculos();
  }

  setSection(section: 'perfil' | 'vehiculos'): void {
    this.activeSection = section;
  }

  loadVehiculos(): void {
    this.loadingVehiculos = true;
    this.clienteApi.listMyVehiculos().subscribe({
      next: (vehiculos) => {
        this.vehiculos = vehiculos || [];
        if (!this.selectedVehicle && this.vehiculos.length > 0) {
          this.selectedVehicle = this.vehiculos[0];
        }
        this.loadingVehiculos = false;
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar los vehiculos.';
      },
    });
  }

  selectVehicle(vehiculo: VehiculoDto): void {
    this.selectedVehicle = vehiculo;
    this.activeSection = 'vehiculos';
  }

  saveProfile(): void {
    this.savingProfile = true;
    this.errorMsg = '';

    this.clienteApi.updateMe({
      nombre: this.profileForm.nombre.trim(),
      username: this.profileForm.username.trim(),
      email: this.profileForm.email.trim() || undefined,
      telefono: this.profileForm.telefono.trim() || undefined,
    }).subscribe({
      next: (updated) => {
        this.cliente = updated;
        this.savingProfile = false;
        this.editingProfile = false;
      },
      error: (error) => {
        this.savingProfile = false;
        this.errorMsg = error?.error?.detail || 'No se pudo actualizar tu perfil.';
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
        this.showVehicleForm = false;
        this.loadVehiculos();
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar el vehiculo.';
      },
    });
  }

  setPrincipal(vehiculo: VehiculoDto): void {
    this.clienteApi.setPrincipal(vehiculo.id).subscribe({
      next: () => this.loadVehiculos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo marcar el vehiculo como principal.';
      },
    });
  }

  removeVehiculo(vehiculo: VehiculoDto): void {
    if (!window.confirm(`Eliminar vehículo ${vehiculo.placa || vehiculo.id}?`)) {
      return;
    }

    this.clienteApi.deleteVehiculo(vehiculo.id).subscribe({
      next: () => {
        if (this.selectedVehicle?.id === vehiculo.id) {
          this.selectedVehicle = null;
        }
        this.loadVehiculos();
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar el vehiculo.';
      },
    });
  }

}