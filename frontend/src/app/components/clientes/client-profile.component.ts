import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { ClienteApiService } from '../../services/cliente.service';
import { IncidenteApiService, IncidenteCreateRequest } from '../../services/incidente.service';
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
        <button class="tab" [class.active]="activeSection === 'solicitud'" (click)="setSection('solicitud')">Solicitud de Auxilio</button>
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

      <!-- Sección: Seguimiento de Solicitudes -->
      <section class="card inner" *ngIf="activeSection === 'seguimiento'">
        <div class="section-head">
          <div>
            <h3>Seguimiento de Solicitudes</h3>
            <p class="muted">Estado y detalle de tus solicitudes de auxilio.</p>
          </div>
          <button class="btn btn-ghost" type="button" (click)="cargarSolicitudes()" [disabled]="loadingSolicitudes">
            {{ loadingSolicitudes ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>

        <p class="muted" *ngIf="loadingSolicitudes">Cargando solicitudes...</p>
        <div *ngIf="!loadingSolicitudes && misSolicitudes.length === 0" class="muted">No tienes solicitudes registradas.</div>

        <div class="solicitudes-list" *ngIf="!loadingSolicitudes && misSolicitudes.length > 0">
          <article class="solicitud-card" *ngFor="let solicitud of misSolicitudes">
            <div class="solicitud-header">
              <div class="solicitud-info">
                <h4>{{ solicitud.tipo || 'Solicitud' }}</h4>
                <p class="muted">ID: {{ solicitud.id }}</p>
                <p class="muted">Fecha: {{ solicitud.creado_en | date:'short' }}</p>
              </div>
              <div class="estado-badge" [ngClass]="'estado-' + (solicitud.estado || 'pendiente')">
                {{ solicitud.estado || 'pendiente' }}
              </div>
            </div>

            <div class="solicitud-detail">
              <p class="descripcion"><strong>Descripción:</strong> {{ solicitud.descripcion || 'Sin descripción' }}</p>
              
              <div class="info-grid">
                <div>
                  <span class="label-inline">Vehículo</span>
                  <strong>{{ solicitud.vehiculo_id || 'N/A' }}</strong>
                </div>
                <div>
                  <span class="label-inline">Prioridad</span>
                  <strong>P{{ solicitud.prioridad || '-' }}</strong>
                </div>
                <div>
                  <span class="label-inline">Ubicación</span>
                  <strong class="coords">
                    {{ solicitud.latitud?.toFixed(4) || '-' }}, 
                    {{ solicitud.longitud?.toFixed(4) || '-' }}
                  </strong>
                </div>
              </div>
            </div>

            <div class="solicitud-actions">
              <button class="btn btn-secondary" type="button" (click)="abrirMapa(solicitud)">
                📍 Ver en mapa
              </button>
              <button class="btn btn-ghost" type="button" (click)="verDetalleTracking(solicitud)">
                📊 Seguimiento en vivo
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="card inner" *ngIf="activeSection === 'solicitud'">
        <div class="section-head">
          <div>
            <h3>Solicitud de Auxilio</h3>
            <p class="muted">Marca la ubicación en el mapa o usa tu ubicación actual.</p>
          </div>
        </div>

        <div class="map-area">
          <div class="map-embed">
            <iframe
              width="100%"
              height="320"
              [src]="mapUrl"
              style="border:0;"
              loading="lazy"
            ></iframe>
          </div>

          <div class="form-grid" style="margin-top:1rem">
            <select class="input" [(ngModel)]="createForm.tipo" name="tipo">
              <option value="">Selecciona tipo</option>
              <option value="averia">Avería</option>
              <option value="accidente">Accidente</option>
              <option value="otro">Otro</option>
            </select>

            <textarea class="input" [(ngModel)]="createForm.descripcion" name="descripcion" placeholder="Descripción del problema"></textarea>

            <div>
              <label class="label">Latitud</label>
              <input class="input" [(ngModel)]="createForm.latitud" name="lat" />
            </div>

            <div>
              <label class="label">Longitud</label>
              <input class="input" [(ngModel)]="createForm.longitud" name="lon" />
            </div>

            <div style="display:flex;gap:0.5rem;align-items:center">
              <button class="btn btn-ghost" type="button" (click)="useMyLocation()">Usar mi ubicación</button>
              <button class="btn btn-primary" type="button" (click)="submitSolicitud()" [disabled]="submitting">{{ submitting ? 'Enviando...' : 'Solicitar Auxilio' }}</button>
            </div>
          </div>
        </div>
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
      
      .solicitudes-list { display: grid; gap: 0.75rem; margin-top: 1rem; }
      .solicitud-card { 
        border: 1px solid var(--line); 
        border-radius: 12px; 
        padding: 1rem; 
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
      }
      .solicitud-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        gap: 1rem; 
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
      }
      .solicitud-info h4 { margin: 0 0 0.25rem 0; }
      .solicitud-detail { margin: 0.75rem 0; }
      .solicitud-detail .descripcion { margin: 0.5rem 0; }
      .solicitud-detail .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; }
      .solicitud-actions { 
        display: flex; 
        gap: 0.5rem; 
        margin-top: 0.75rem; 
        flex-wrap: wrap;
      }
      .estado-badge {
        padding: 0.5rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        text-transform: uppercase;
      }
      .estado-pendiente {
        background: rgba(249, 115, 22, 0.2);
        color: #fb923c;
      }
      .estado-asignado {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .estado-en_proceso {
        background: rgba(139, 92, 246, 0.2);
        color: #c084fc;
      }
      .estado-atendido {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
      }
      .coords {
        font-family: monospace;
        font-size: 0.8rem;
      }
      .btn { padding: 0.6rem 1rem; border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 8px; font-weight: 500; cursor: pointer; }
      .btn-primary { background: var(--brand); color: white; border-color: var(--brand); }
      .btn-primary:hover { background: #2563eb; }
      .btn-secondary { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
      .btn-secondary:hover { background: rgba(59, 130, 246, 0.25); }
      .btn-ghost { background: transparent; color: var(--muted); border: 1px solid rgba(255, 255, 255, 0.1); }
      .btn-ghost:hover { background: rgba(255, 255, 255, 0.05); color: var(--text); }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
  ],
})
export class ClientProfileComponent implements OnInit {

  cliente: ClienteDto | null = null;
  vehiculos: VehiculoDto[] = [];
  selectedVehicle: VehiculoDto | null = null;
  loadingVehiculos = false;
  loadingSolicitudes = false;
  savingProfile = false;
  editingProfile = false;
  showVehicleForm = false;
  activeSection: 'perfil' | 'vehiculos' | 'solicitud' | 'seguimiento' = 'perfil';
  errorMsg = '';
  misSolicitudes: any[] = [];

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

  // --- Solicitud de auxilio state
  createForm: IncidenteCreateRequest = {
    vehiculo_id: undefined,
    tipo: '',
    descripcion: '',
    latitud: undefined,
    longitud: undefined,
  };
  submitting = false;

  get mapUrl() {
    const lat = this.createForm.latitud ?? 0;
    const lon = this.createForm.longitud ?? 0;
    const q = encodeURIComponent(`${lat},${lon}`);
    return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  }

  constructor(
    public readonly auth: AuthService,
    private readonly clienteApi: ClienteApiService,
    private readonly incidenteApi: IncidenteApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Detectar el parámetro "tab" en la URL y abrir la pestaña correspondiente
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'seguimiento') {
        this.activeSection = 'seguimiento';
      }
    });

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
    this.cargarSolicitudes();
  }

  setSection(section: 'perfil' | 'vehiculos' | 'solicitud' | 'seguimiento'): void {
    this.activeSection = section;
    if (section === 'seguimiento') {
      this.cargarSolicitudes();
    }
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

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMsg = 'Geolocalización no disponible';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.createForm.latitud = pos.coords.latitude;
        this.createForm.longitud = pos.coords.longitude;
      },
      () => (this.errorMsg = 'No se pudo obtener tu ubicación'),
    );
  }

  submitSolicitud(): void {
    if (!this.createForm.tipo) {
      this.errorMsg = 'Selecciona el tipo de incidente';
      return;
    }
    if (this.createForm.latitud == null || this.createForm.longitud == null) {
      this.errorMsg = 'Indica la ubicación en el mapa o usa tu ubicación';
      return;
    }
    this.submitting = true;
    this.incidenteApi.create(this.createForm).subscribe({
      next: () => {
        this.submitting = false;
        this.createForm = { vehiculo_id: undefined, tipo: '', descripcion: '', latitud: undefined, longitud: undefined };
        this.errorMsg = '';
        // navigate to incidents or just notify
        alert('Solicitud creada correctamente');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err?.error?.detail || 'Error al crear la solicitud';
      },
    });
  }

  cargarSolicitudes(): void {
    this.loadingSolicitudes = true;
    this.incidenteApi.list().subscribe({
      next: (data) => {
        this.misSolicitudes = data || [];
        this.loadingSolicitudes = false;
      },
      error: (err) => {
        this.loadingSolicitudes = false;
        this.errorMsg = err?.error?.detail || 'Error al cargar solicitudes';
      },
    });
  }

  abrirMapa(solicitud: any): void {
    if (!solicitud.latitud || !solicitud.longitud) {
      this.errorMsg = 'La solicitud no tiene ubicación';
      return;
    }
    const url = `https://maps.google.com/?q=${solicitud.latitud},${solicitud.longitud}`;
    window.open(url, '_blank');
  }

  verDetalleTracking(solicitud: any): void {
    // Navegar a la página de tracking del incidente
    window.location.href = `/app/incidentes/tracking/${solicitud.id}`;
  }

}