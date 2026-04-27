import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import {
  IncidenteApiService,
  IncidenteDto,
  IncidenteTrackingDto,
  TecnicoCercanoDto,
} from '../../services/incidente.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="card">
      <header class="head">
        <h3>{{ isClient ? 'Mis incidentes' : 'Incidentes y Ubicaciones (Realtime)' }}</h3>
      </header>

      <section class="panel" style="margin-bottom: 1rem;">
        <h4>Nuevo incidente / Solicitud de auxilio</h4>
        <div class="form-grid">
          <input [(ngModel)]="createForm.tipo" placeholder="Tipo (grúa, batería, pinchazo...)" />
          <input [(ngModel)]="createForm.descripcion" placeholder="Descripción" />
          <input [(ngModel)]="createForm.vehiculo_id" placeholder="Vehículo ID (opcional)" />
          <input [(ngModel)]="createForm.prioridad" type="number" min="1" max="5" placeholder="Prioridad (1-5)" />
          <input [(ngModel)]="createForm.latitud" type="number" step="0.000001" placeholder="Latitud" />
          <input [(ngModel)]="createForm.longitud" type="number" step="0.000001" placeholder="Longitud" />
        </div>
        <div class="muted" style="margin-top: 0.5rem;">
          Mi posición actual: {{ currentLat ?? 'N/A' }}, {{ currentLng ?? 'N/A' }}
        </div>
        <div #reportMap class="map-canvas" style="margin-top: 0.75rem;"></div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap: wrap;">
          <button class="btn" (click)="useBrowserLocationForIncident()">Usar mi ubicación</button>
          <button class="btn btn-ghost" (click)="toggleRealtimeLocation()">
            {{ watchPositionId == null ? 'Iniciar ubicación en tiempo real' : 'Detener ubicación en tiempo real' }}
          </button>
          <button class="btn" (click)="createIncident()">Crear incidente</button>
        </div>
      </section>

      <section class="panel" style="margin-bottom: 1rem;" *ngIf="!isClient">
        <h4>Mi ubicación (técnico)</h4>
        <div style="display:flex; gap:0.5rem; flex-wrap: wrap; align-items: center;">
          <label>Disponible <input type="checkbox" [(ngModel)]="miDisponible" /></label>
          <button class="btn" (click)="actualizarMiUbicacion()">Actualizar ubicación actual</button>
        </div>
      </section>

      <section class="panel" style="margin-bottom: 1rem;" *ngIf="selectedTracking">
        <h4>Tracking del incidente {{ selectedTracking.incidente_id }}</h4>
        <div class="muted">
          Estado: {{ selectedTracking.estado }}
          • Destino: {{ selectedTracking.latitud_incidente ?? 'N/A' }}, {{ selectedTracking.longitud_incidente ?? 'N/A' }}
        </div>
        <div class="muted">
          Técnico: {{ selectedTracking.tecnico_nombre || 'Sin asignar' }}
          • Posición: {{ selectedTracking.tecnico_latitud ?? 'N/A' }}, {{ selectedTracking.tecnico_longitud ?? 'N/A' }}
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
          <button class="btn" (click)="refreshTracking()">Refrescar tracking</button>
          <button class="btn" (click)="toggleTrackingSocket()">
            {{ trackingSocketConnected ? 'Desconectar WS' : 'Conectar WS' }}
          </button>
          <button class="btn btn-ghost" (click)="buscarTecnicosCercanosTracking()" *ngIf="!isClient">Buscar técnicos cercanos</button>
        </div>
        <div class="muted" style="margin-top: 0.5rem;">WebSocket: {{ trackingSocketConnected ? 'conectado' : 'desconectado' }}</div>
        <div #trackingMap class="map-canvas" style="margin-top: 0.75rem;"></div>
        <ul *ngIf="tecnicosCercanos.length" style="margin-top:0.75rem;">
          <li *ngFor="let t of tecnicosCercanos" class="muted">
            {{ t.nombre_completo }} - {{ t.distancia_km }} km - {{ t.disponible ? 'disponible' : 'ocupado' }}
          </li>
        </ul>
      </section>

      <div *ngIf="loading" class="muted">Cargando incidentes...</div>
      <div *ngIf="!loading && incidents.length === 0" class="muted">No hay incidentes.</div>

      <ul>
        <li *ngFor="let it of incidents" style="margin:0.5rem 0; display:flex; justify-content:space-between; align-items:center">
          <div>
            <strong>{{ it.tipo || 'Incidente' }}</strong>
            <div class="muted">{{ it.descripcion }}</div>
            <div class="muted">Estado: {{ it.estado }} • Prioridad: {{ it.prioridad || 'N/A' }}</div>
            <div class="muted">Destino: {{ it.latitud ?? 'N/A' }}, {{ it.longitud ?? 'N/A' }}</div>
            <div class="muted">Técnico asignado: {{ it.empleado_asignado_id || 'Sin asignar' }}</div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
            <ng-container *ngIf="!isClient">
              <select [(ngModel)]="it.estado">
                <option value="pendiente">pendiente</option>
                <option value="en_proceso">en_proceso</option>
                <option value="atendido">atendido</option>
              </select>
              <button class="btn" (click)="saveStatus(it)">Guardar</button>
              <input [(ngModel)]="asignaciones[it.id]" placeholder="empleado_id" />
              <button class="btn btn-ghost" (click)="assignTecnico(it)">Asignar técnico</button>
            </ng-container>
            <button class="btn btn-ghost" (click)="openTracking(it)">Ver tracking</button>
            <button class="btn btn-ghost" (click)="addDiagPrompt(it)" *ngIf="!isClient">Añadir diagnóstico</button>
            <button class="btn btn-ghost" (click)="addEvidPrompt(it)" *ngIf="!isClient">Añadir evidencia</button>
          </div>
        </li>
      </ul>

      <div *ngIf="message" class="muted" style="margin-top:1rem;">{{ message }}</div>
    </div>
  `,
  styles: [
    `.muted { color: var(--muted); }`,
    `.panel { border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem; }`,
    `.form-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.5rem; }`,
    `.map-canvas { height: 280px; width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); }`,
  ],
})
export class IncidentesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('reportMap') reportMapElement?: ElementRef<HTMLDivElement>;
  @ViewChild('trackingMap') trackingMapElement?: ElementRef<HTMLDivElement>;

  private L: any;
  private reportMap: any;
  private trackingMap: any;
  private reportMarker: any;
  private currentLocationMarker: any;
  private trackingIncidentMarker: any;
  private trackingTechMarker: any;

  private trackingSocket: WebSocket | null = null;
  private trackingPingTimer: ReturnType<typeof setInterval> | null = null;
  trackingSocketConnected = false;

  watchPositionId: number | null = null;
  currentLat: number | null = null;
  currentLng: number | null = null;

  incidents: IncidenteDto[] = [];
  selectedTracking: IncidenteTrackingDto | null = null;
  tecnicosCercanos: TecnicoCercanoDto[] = [];
  asignaciones: Record<string, string> = {};
  message = '';
  miDisponible = true;
  isClient = false;
  clienteId: string | null = null;

  createForm: {
    vehiculo_id: string;
    tipo: string;
    descripcion: string;
    prioridad: number | null;
    latitud: number | null;
    longitud: number | null;
  } = {
    vehiculo_id: '',
    tipo: '',
    descripcion: '',
    prioridad: null,
    latitud: null,
    longitud: null,
  };

  loading = false;

  constructor(
    private api: IncidenteApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isClient = this.auth.isClient;
    this.clienteId = this.auth.currentUser?.cliente_id || null;
    this.load();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initLeaflet();
    this.initReportMap();
    this.initTrackingMap();
  }

  ngOnDestroy(): void {
    this.stopRealtimeLocation();
    this.disconnectTrackingSocket();
  }

  private async initLeaflet(): Promise<void> {
    if (this.L) {
      return;
    }

    const leaflet = await import('leaflet');
    this.L = leaflet;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }

  private initReportMap(): void {
    if (!this.reportMapElement || this.reportMap) {
      return;
    }

    this.reportMap = this.L.map(this.reportMapElement.nativeElement).setView([-17.7833, -63.1821], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.reportMap);

    this.reportMap.on('click', (e: any) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      this.setIncidentLocation(lat, lng);
    });
  }

  private initTrackingMap(): void {
    if (!this.trackingMapElement || this.trackingMap) {
      return;
    }

    this.trackingMap = this.L.map(this.trackingMapElement.nativeElement).setView([-17.7833, -63.1821], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.trackingMap);
  }

  private setIncidentLocation(lat: number, lng: number): void {
    this.createForm.latitud = lat;
    this.createForm.longitud = lng;

    if (!this.reportMap) {
      return;
    }

    if (!this.reportMarker) {
      this.reportMarker = this.L.marker([lat, lng]).addTo(this.reportMap);
    } else {
      this.reportMarker.setLatLng([lat, lng]);
    }
    this.reportMap.setView([lat, lng], 15);
  }

  private setCurrentLocation(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;
    this.setIncidentLocation(lat, lng);

    if (!this.reportMap) {
      return;
    }

    if (!this.currentLocationMarker) {
      this.currentLocationMarker = this.L.circleMarker([lat, lng], {
        radius: 8,
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.8,
      }).addTo(this.reportMap);
    } else {
      this.currentLocationMarker.setLatLng([lat, lng]);
    }
  }

  private updateTrackingMap(): void {
    if (!this.trackingMap && this.trackingMapElement) {
      this.initTrackingMap();
    }

    if (!this.selectedTracking || !this.trackingMap) {
      return;
    }

    const t = this.selectedTracking;
    const incidentLat = t.latitud_incidente;
    const incidentLng = t.longitud_incidente;
    const techLat = t.tecnico_latitud;
    const techLng = t.tecnico_longitud;

    if (incidentLat != null && incidentLng != null) {
      if (!this.trackingIncidentMarker) {
        this.trackingIncidentMarker = this.L.marker([incidentLat, incidentLng]).addTo(this.trackingMap);
      } else {
        this.trackingIncidentMarker.setLatLng([incidentLat, incidentLng]);
      }
    }

    if (techLat != null && techLng != null) {
      if (!this.trackingTechMarker) {
        this.trackingTechMarker = this.L.circleMarker([techLat, techLng], {
          radius: 8,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
        }).addTo(this.trackingMap);
      } else {
        this.trackingTechMarker.setLatLng([techLat, techLng]);
      }
    }

    const points: [number, number][] = [];
    if (incidentLat != null && incidentLng != null) points.push([incidentLat, incidentLng]);
    if (techLat != null && techLng != null) points.push([techLat, techLng]);

    if (points.length === 1) {
      this.trackingMap.setView(points[0], 15);
    } else if (points.length > 1) {
      this.trackingMap.fitBounds(points, { padding: [30, 30] });
    }
  }

  private connectTrackingSocket(incidenteId: string): void {
    this.disconnectTrackingSocket();
    const url = this.api.getTrackingWebSocketUrl(incidenteId);
    this.trackingSocket = new WebSocket(url);

    this.trackingSocket.onopen = () => {
      this.trackingSocketConnected = true;
      this.trackingPingTimer = setInterval(() => {
        if (this.trackingSocket?.readyState === WebSocket.OPEN) {
          this.trackingSocket.send('ping');
        }
      }, 15000);
    };

    this.trackingSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.tracking) {
          this.selectedTracking = message.tracking as IncidenteTrackingDto;
          this.updateTrackingMap();
        }
      } catch {
        // Ignore malformed WS payloads.
      }
    };

    this.trackingSocket.onclose = () => {
      this.trackingSocketConnected = false;
      if (this.trackingPingTimer) {
        clearInterval(this.trackingPingTimer);
        this.trackingPingTimer = null;
      }
    };
  }

  private disconnectTrackingSocket(): void {
    if (this.trackingPingTimer) {
      clearInterval(this.trackingPingTimer);
      this.trackingPingTimer = null;
    }
    if (this.trackingSocket) {
      this.trackingSocket.close();
      this.trackingSocket = null;
    }
    this.trackingSocketConnected = false;
  }

  load() {
    this.loading = true;
    this.api.list().subscribe({
      next: (rows) => {
        const all = rows || [];
        if (this.isClient) {
          this.incidents = this.clienteId ? all.filter((item) => item.cliente_id === this.clienteId) : [];
        } else {
          this.incidents = all;
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  saveStatus(it: IncidenteDto) {
    this.api.update(it.id, { estado: it.estado }).subscribe({ next: () => this.load() });
  }

  createIncident() {
    this.api.create({
      vehiculo_id: this.createForm.vehiculo_id || undefined,
      tipo: this.createForm.tipo || undefined,
      descripcion: this.createForm.descripcion || undefined,
      prioridad: this.createForm.prioridad ?? undefined,
      latitud: this.createForm.latitud ?? undefined,
      longitud: this.createForm.longitud ?? undefined,
    }).subscribe({
      next: () => {
        this.message = 'Incidente creado correctamente';
        this.load();
      },
      error: () => {
        this.message = 'No se pudo crear el incidente';
      },
    });
  }

  assignTecnico(it: IncidenteDto) {
    const empleadoId = this.asignaciones[it.id]?.trim();
    if (!empleadoId) {
      this.message = 'Debes ingresar el empleado_id para asignar';
      return;
    }

    this.api.assignTecnico(it.id, { empleado_id: empleadoId }).subscribe({
      next: () => {
        this.message = 'Técnico asignado';
        this.load();
      },
      error: () => {
        this.message = 'No se pudo asignar el técnico';
      },
    });
  }

  openTracking(it: IncidenteDto) {
    this.api.getTracking(it.id).subscribe({
      next: (tracking) => {
        this.selectedTracking = tracking;
        this.tecnicosCercanos = [];
        setTimeout(() => this.updateTrackingMap(), 0);
        this.connectTrackingSocket(it.id);
      },
      error: () => {
        this.message = 'No se pudo obtener tracking';
      },
    });
  }

  refreshTracking() {
    if (!this.selectedTracking?.incidente_id) {
      return;
    }
    this.api.getTracking(this.selectedTracking.incidente_id).subscribe({
      next: (tracking) => {
        this.selectedTracking = tracking;
        setTimeout(() => this.updateTrackingMap(), 0);
      },
      error: () => {
        this.message = 'No se pudo refrescar el tracking';
      },
    });
  }

  toggleTrackingSocket() {
    if (!this.selectedTracking?.incidente_id) {
      return;
    }
    if (this.trackingSocketConnected) {
      this.disconnectTrackingSocket();
      return;
    }
    this.connectTrackingSocket(this.selectedTracking.incidente_id);
  }

  buscarTecnicosCercanosTracking() {
    const tracking = this.selectedTracking;
    if (!tracking || tracking.latitud_incidente == null || tracking.longitud_incidente == null) {
      this.message = 'El incidente no tiene latitud/longitud para búsqueda';
      return;
    }

    this.api.listTecnicosCercanos(tracking.latitud_incidente, tracking.longitud_incidente, 10).subscribe({
      next: (rows) => {
        this.tecnicosCercanos = rows;
      },
      error: () => {
        this.message = 'No se pudieron cargar técnicos cercanos';
      },
    });
  }

  useBrowserLocationForIncident() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setCurrentLocation(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
      },
      () => {
        this.message = 'No se pudo obtener la ubicación actual';
      },
    );
  }

  toggleRealtimeLocation() {
    if (this.watchPositionId == null) {
      this.startRealtimeLocation();
      return;
    }
    this.stopRealtimeLocation();
  }

  private startRealtimeLocation() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        this.setCurrentLocation(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
      },
      () => {
        this.message = 'No se pudo iniciar ubicación en tiempo real';
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      },
    );
  }

  private stopRealtimeLocation() {
    if (this.watchPositionId != null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }

  actualizarMiUbicacion() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.api.updateMiUbicacion({
          latitud: Number(position.coords.latitude.toFixed(6)),
          longitud: Number(position.coords.longitude.toFixed(6)),
          disponible: this.miDisponible,
        }).subscribe({
          next: () => {
            this.message = 'Ubicación actualizada';
          },
          error: () => {
            this.message = 'No se pudo actualizar tu ubicación';
          },
        });
      },
      () => {
        this.message = 'No se pudo obtener la ubicación actual';
      },
    );
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
