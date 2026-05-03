import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import {
  IncidenteApiService,
  IncidenteDto,
  TecnicoCercanoDto,
  AsignarTecnicoRequest,
  IncidenteCreateRequest,
} from '../../services/incidente.service';
import { ClienteApiService, VehiculoDto } from '../../services/cliente.service';
import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService, MiAsignacionDto } from '../../services/empleado.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import type { Servicio } from '../../models/user-management.models';
import type { Empleado } from '../../models/user-management.models';

@Component({
  selector: 'app-incidentes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="container">
      <header class="header">
        <h2 *ngIf="isEmpleadoView">Solicitudes asignadas</h2>
        <h2 *ngIf="isAdminView">Gestión de Incidentes</h2>
        <h2 *ngIf="isClientView">Mis Incidentes</h2>
        <p class="subtitle" *ngIf="isEmpleadoView">Aquí ves solo las solicitudes que te asignaron</p>
        <p class="subtitle" *ngIf="isAdminView">Asigna técnicos a solicitudes pendientes</p>
        <p class="subtitle" *ngIf="isClientView">Registros de tus solicitudes de auxilio</p>
      </header>

      <!-- SecciÃ³n: Mi ubicaciÃ³n del tÃ©cnico (solo para empleados/admin) -->
      <section class="section tech-location" *ngIf="!isClientView && (isEmpleadoView || isAdminView)">
        <h3>Mi Ubicación (Técnico)</h3>
        <div class="tech-location-content">
          <div class="checkbox-group">
            <input type="checkbox" id="disponible" [(ngModel)]="miDisponible" />
            <label for="disponible">Disponible para asignaciones</label>
          </div>
          <button class="btn btn-primary" (click)="actualizarMiUbicacion()" [disabled]="updatingLocation">
            {{ updatingLocation ? 'Actualizando...' : 'Actualizar mi ubicación' }}
          </button>
          <div class="muted" *ngIf="ultimaUbicacionActualizada">
            Última actualización: {{ ultimaUbicacionActualizada | date:'short' }}
          </div>
        </div>
      </section>

      <!-- Formulario de cliente: crear incidente -->
      <section class="section" *ngIf="auth.isClient">
        <div class="section-head">
          <div>
            <h3>Reportar nueva solicitud de auxilio</h3>
            <p class="muted">Selecciona tipo, ubicación y adjunta evidencias</p>
          </div>
        </div>

        <div class="card nested">
          <div class="form-grid">
            <select class="input" [(ngModel)]="createForm.tipo" name="tipo">
              <option value="">Selecciona tipo</option>
              <option value="averia">Avería</option>
              <option value="accidente">Accidente</option>
              <option value="otro">Otro</option>
            </select>

            <select class="input" [(ngModel)]="createForm.vehiculo_id" name="vehiculo">
              <option value="">Selecciona vehículo (opcional)</option>
              <option *ngFor="let v of myVehiculos" [value]="v.id">{{ v.marca }} {{ v.modelo }} - {{ v.placa }}</option>
            </select>

            <textarea class="input" [(ngModel)]="createForm.descripcion" name="descripcion" placeholder="Descripción del problema"></textarea>

            <div>
              <label class="label">Ubicación</label>
              <div style="display:flex;gap:0.5rem;align-items:center">
                <input class="input" [(ngModel)]="createForm.latitud" name="lat" placeholder="Latitud" />
                <input class="input" [(ngModel)]="createForm.longitud" name="lon" placeholder="Longitud" />
                <button class="btn btn-ghost" type="button" (click)="setLocationFromGeolocation()">Usar mi ubicación</button>
              </div>
            </div>

            <div>
              <label class="label">Evidencias (fotos)</label>
              <input type="file" (change)="onEvidenciaFiles($event)" multiple />
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-primary" type="button" (click)="createIncident()" [disabled]="creating">
              {{ creating ? 'Enviando...' : 'Enviar solicitud' }}
            </button>
            <button class="btn btn-ghost" type="button" (click)="resetCreateForm()">Cancelar</button>
          </div>
        </div>
      </section>

      <!-- SecciÃ³n: Lista de incidentes -->
      <!-- Sección: Lista de incidentes (Admin: dos listas) -->
      <ng-container *ngIf="isAdminView">
        <!-- ADMIN: Solicitudes nuevas -->
        <section class="section incidents-list">
          <div class="section-head">
            <div>
              <h3>Solicitudes nuevas</h3>
              <p class="subtitle">Pendientes o en proceso - {{ incidentsNuevas.length }} solicitud(es)</p>
            </div>
            <button class="btn btn-ghost" (click)="cargarIncidentes()" [disabled]="loading">
              {{ loading ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>

          <div *ngIf="loading" class="loading">Cargando incidentes...</div>
          <div *ngIf="!loading && incidentsNuevas.length === 0" class="empty">
            <p>No hay solicitudes nuevas</p>
          </div>

          <div *ngIf="!loading && incidentsNuevas.length > 0" class="incidents-grid">
            <div *ngFor="let incidente of incidentsNuevas" class="incident-card" [class.assigned]="incidente.estado !== 'pendiente'">
              <!-- Header de la card -->
              <div class="card-header">
                <div class="tipo-prioridad">
                  <h4>{{ incidente.tipo }}</h4>
                  <span class="priority-badge" [style.background]="getPriorityColor(incidente.prioridad)">
                    P{{ incidente.prioridad || '-' }}
                  </span>
                </div>
                <span class="estado-badge" [ngClass]="'estado-' + (incidente.estado || 'pendiente')">
                  {{ incidente.estado || 'pendiente' }}
                </span>
              </div>

              <!-- Contenido de la card -->
              <div class="card-content">
                <p class="descripcion">{{ incidente.descripcion }}</p>

                <!-- Grid de información -->
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Vehículo</span>
                    <span class="value">{{ incidente.vehiculo_id || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Ubicación</span>
                    <span class="value coords">
                      {{ incidente.latitud?.toFixed(4) || '-' }},
                      {{ incidente.longitud?.toFixed(4) || '-' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="label">Fecha</span>
                    <span class="value">{{ incidente.creado_en | date:'short' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">ID</span>
                    <span class="value">{{ incidente.id }}</span>
                  </div>
                </div>
              </div>

              <!-- Botones de acción -->
              <div class="card-actions">
                <button class="btn btn-secondary" (click)="abrirMapa(incidente)">
                  📍 Ver en mapa
                </button>
                <button class="btn btn-primary" (click)="abrirModalAsignar(incidente)" [disabled]="incidente.estado !== 'pendiente'">
                  👤 Asignar técnico
                </button>
                <button class="btn btn-ghost" (click)="verTracking(incidente)">
                  📊 Ver tracking
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ADMIN: Solicitudes atendidas -->
        <section class="section incidents-list">
          <div class="section-head">
            <div>
              <h3>Solicitudes atendidas</h3>
              <p class="subtitle">Cerradas o finalizadas - {{ incidentsAtendidas.length }} solicitud(es)</p>
            </div>
          </div>

          <div *ngIf="!loading && incidentsAtendidas.length === 0" class="empty">
            <p>No hay solicitudes atendidas</p>
          </div>

          <div *ngIf="!loading && incidentsAtendidas.length > 0" class="incidents-grid">
            <div *ngFor="let incidente of incidentsAtendidas" class="incident-card assigned">
              <!-- Header de la card -->
              <div class="card-header">
                <div class="tipo-prioridad">
                  <h4>{{ incidente.tipo }}</h4>
                  <span class="priority-badge" [style.background]="getPriorityColor(incidente.prioridad)">
                    P{{ incidente.prioridad || '-' }}
                  </span>
                </div>
                <span class="estado-badge" [ngClass]="'estado-' + (incidente.estado || 'pendiente')">
                  {{ incidente.estado || 'pendiente' }}
                </span>
              </div>

              <!-- Contenido de la card -->
              <div class="card-content">
                <p class="descripcion">{{ incidente.descripcion }}</p>

                <!-- Grid de información -->
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Vehículo</span>
                    <span class="value">{{ incidente.vehiculo_id || 'N/A' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Ubicación</span>
                    <span class="value coords">
                      {{ incidente.latitud?.toFixed(4) || '-' }},
                      {{ incidente.longitud?.toFixed(4) || '-' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="label">Fecha</span>
                    <span class="value">{{ incidente.creado_en | date:'short' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">ID</span>
                    <span class="value">{{ incidente.id }}</span>
                  </div>
                </div>
              </div>

              <!-- Botones de acción -->
              <div class="card-actions">
                <button class="btn btn-secondary" (click)="abrirMapa(incidente)">
                  📍 Ver en mapa
                </button>
                <button class="btn btn-ghost" (click)="verTracking(incidente)">
                  📊 Ver tracking
                </button>
              </div>
            </div>
          </div>
        </section>
      </ng-container>

      <!-- Sección: Lista de incidentes (Cliente/Empleado) -->
      <section class="section incidents-list" *ngIf="!isAdminView">
        <div class="section-head">
          <div>
            <h3>{{ incidentsSectionTitle }}</h3>
            <p class="subtitle">{{ incidentsCounterLabel }}</p>
          </div>
          <button class="btn btn-ghost" (click)="cargarIncidentes()" [disabled]="loading">
            {{ loading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>

        <div *ngIf="loading" class="loading">{{ loadingMessage }}</div>
        <div *ngIf="!loading && incidents.length === 0" class="empty">
          <p>{{ emptyMessage }}</p>
        </div>

        <div *ngIf="!loading && incidents.length > 0" class="incidents-grid">
          <div *ngFor="let incidente of incidents" class="incident-card" [class.assigned]="incidente.estado !== 'pendiente'">
            <!-- Header de la card -->
            <div class="card-header">
              <div class="tipo-prioridad">
                <h4>{{ incidente.tipo }}</h4>
                <span class="priority-badge" [style.background]="getPriorityColor(incidente.prioridad)">
                  P{{ incidente.prioridad || '-' }}
                </span>
              </div>
              <span class="estado-badge" [ngClass]="'estado-' + (incidente.estado || 'pendiente')">
                {{ incidente.estado || 'pendiente' }}
              </span>
            </div>

            <!-- Contenido de la card -->
            <div class="card-content">
              <p class="descripcion">{{ incidente.descripcion }}</p>

              <!-- Grid de información -->
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Vehículo</span>
                  <span class="value">{{ incidente.vehiculo_id || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Ubicación</span>
                  <span class="value coords">
                    {{ incidente.latitud?.toFixed(4) || '-' }},
                    {{ incidente.longitud?.toFixed(4) || '-' }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">Fecha</span>
                  <span class="value">{{ incidente.creado_en | date:'short' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">ID</span>
                  <span class="value">{{ incidente.id }}</span>
                </div>
              </div>
            </div>

            <!-- Botones de acción -->
            <div class="card-actions">
              <button class="btn btn-secondary" (click)="abrirMapa(incidente)">
                📍 Ver en mapa
              </button>
              <button
                class="btn btn-primary"
                (click)="abrirModalAsignar(incidente)"
                [disabled]="incidente.estado !== 'pendiente'"
                *ngIf="isAdminView"
              >
                👤 Asignar técnico
              </button>
              <button class="btn btn-ghost" (click)="verTracking(incidente)">
                📊 Ver tracking
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal: Asignar técnico -->
      <div *ngIf="modalAsignarVisible" class="modal-overlay" (click)="cerrarModalAsignar()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Asignar Técnico</h3>
            <button class="btn-close" (click)="cerrarModalAsignar()">✕</button>
          </div>

          <div class="modal-body">
            <div *ngIf="modalIncidentes">
              <p class="incidente-info">
                <strong>{{ modalIncidentes.tipo }}</strong> - {{ modalIncidentes.descripcion }}
              </p>

              <div class="service-picker">
                <label for="servicioAsignado">Servicio</label>
                <select id="servicioAsignado" [(ngModel)]="servicioSeleccionadoId">
                  <option value="">Selecciona un servicio</option>
                  <option *ngFor="let servicio of servicios" [value]="servicio.id_servicio">
                    {{ servicio.nombre }}
                  </option>
                </select>
              </div>

              <div *ngIf="cargandoEmpleados" class="loading">Cargando empleados...</div>

              <div *ngIf="!cargandoEmpleados && empleadosAsignables.length > 0" class="empleados-list">
                <div *ngFor="let empleado of empleadosAsignables" class="tecnico-item">
                  <div class="tecnico-info">
                    <div class="tecnico-header">
                      <strong>{{ empleado.nombre_completo }}</strong>
                      <span class="disponibilidad disponible">
                        {{ empleado.cargo_nombre || 'Empleado' }}
                      </span>
                    </div>
                    <div class="tecnico-details">
                      <span>CI: <strong>{{ empleado.ci }}</strong></span>
                      <span>Teléfono: <strong>{{ empleado.telefono || 'N/A' }}</strong></span>
                    </div>
                  </div>
                  <button
                    class="btn btn-primary"
                    (click)="confirmarAsignacion(empleado)"
                    [disabled]="asignando"
                  >
                    {{ asignando ? 'Asignando...' : 'Asignar' }}
                  </button>
                </div>
              </div>

              <div *ngIf="cargandoTecnicos" class="loading">Cargando técnicos cercanos...</div>

              <div *ngIf="!cargandoTecnicos && tecnicosCercanos.length === 0" class="empty-tecnico">
                No hay técnicos disponibles cerca de esta ubicación
              </div>

              <div *ngIf="!cargandoTecnicos && tecnicosCercanos.length > 0" class="tecnicos-list">
                <div *ngFor="let tecnico of tecnicosCercanos" class="tecnico-item">
                  <div class="tecnico-info">
                    <div class="tecnico-header">
                      <strong>{{ tecnico.nombre_completo }}</strong>
                      <span class="disponibilidad" [class.disponible]="tecnico.disponible">
                        {{ tecnico.disponible ? '● Disponible' : '○ Ocupado' }}
                      </span>
                    </div>
                    <div class="tecnico-details">
                      <span>Distancia: <strong>{{ tecnico.distancia_km.toFixed(1) }} km</strong></span>
                    </div>
                  </div>
                  <button
                    class="btn btn-primary"
                    (click)="confirmarAsignacion(tecnico)"
                    [disabled]="asignando"
                  >
                    {{ asignando ? 'Asignando...' : 'Asignar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="cerrarModalAsignar()">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Mensaje -->
      <div *ngIf="message" class="alert" [class.success]="messageType === 'success'" [class.error]="messageType === 'error'">
        {{ message }}
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .header {
        margin-bottom: 2rem;
      }

      .header h2 {
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }

      .subtitle {
        color: var(--muted);
        margin: 0;
        font-size: 0.95rem;
      }

      .section {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.05) 0%,
          rgba(255, 255, 255, 0.02) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .section h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
      }

      .tech-location-content {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .checkbox-group input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .checkbox-group label {
        cursor: pointer;
        font-weight: 500;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .section-head > div {
        flex: 1;
      }

      .section-head h3 {
        margin: 0 0 0.25rem 0;
      }

      .loading,
      .empty,
      .empty-tecnico {
        padding: 2rem;
        text-align: center;
        color: var(--muted);
        font-weight: 500;
      }

      .incidents-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .incident-card {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.08) 0%,
          rgba(99, 102, 241, 0.05) 100%
        );
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }

      .incident-card:hover {
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      }

      .incident-card.assigned {
        border-color: rgba(34, 197, 94, 0.2);
        background: linear-gradient(
          135deg,
          rgba(34, 197, 94, 0.08) 0%,
          rgba(34, 197, 94, 0.05) 100%
        );
      }

      .card-header {
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 0.75rem;
      }

      .tipo-prioridad {
        flex: 1;
      }

      .tipo-prioridad h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .priority-badge {
        display: inline-block;
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
        color: white;
        font-size: 0.8rem;
        font-weight: 600;
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

      .card-content {
        padding: 1rem;
        flex: 1;
      }

      .descripcion {
        margin: 0 0 1rem 0;
        color: var(--text);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
      }

      .info-item .label {
        color: var(--muted);
        font-weight: 500;
      }

      .info-item .value {
        color: var(--text);
        font-weight: 500;
      }

      .coords {
        font-family: monospace;
        font-size: 0.8rem;
      }

      .card-actions {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        flex-wrap: wrap;
      }

      .btn {
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        flex: 1;
        min-width: 120px;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--brand);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }

      .btn-secondary {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.25);
      }

      .btn-ghost {
        background: transparent;
        color: var(--muted);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .btn-ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
        color: var(--text);
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .btn-close {
        background: none;
        border: none;
        color: var(--muted);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }

      .btn-close:hover {
        color: var(--text);
      }

      .modal-body {
        padding: 1.5rem;
      }

      .incidente-info {
        margin: 0 0 1.5rem 0;
        padding: 1rem;
        background: rgba(59, 130, 246, 0.1);
        border-left: 3px solid var(--brand);
        border-radius: 6px;
        font-size: 0.9rem;
      }

      .service-picker {
        display: grid;
        gap: 0.4rem;
        margin-bottom: 1rem;
      }

      .service-picker label {
        color: var(--muted);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .service-picker select {
        padding: 0.7rem 0.8rem;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
      }

      .tecnicos-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .empleados-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .tecnico-item {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .tecnico-info {
        flex: 1;
      }

      .tecnico-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        gap: 0.5rem;
      }

      .tecnico-header strong {
        font-weight: 600;
      }

      .disponibilidad {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 500;
      }

      .disponibilidad.disponible {
        color: #86efac;
      }

      .tecnico-details {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: var(--muted);
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        gap: 0.5rem;
      }

      .alert {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        font-weight: 500;
      }

      .alert.success {
        background: rgba(34, 197, 94, 0.15);
        color: #86efac;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      .alert.error {
        background: rgba(239, 68, 68, 0.15);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      @media (max-width: 768px) {
        .incidents-grid {
          grid-template-columns: 1fr;
        }

        .card-actions {
          flex-direction: column;
        }

        .btn {
          min-width: auto;
        }

        .section-head {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class IncidentesComponent implements OnInit {
  private routeRoleView: 'empleado' | 'admin' | 'cliente' | null = null;

  incidents: IncidenteDto[] = [];
  incidentsNuevas: IncidenteDto[] = [];
  incidentsAtendidas: IncidenteDto[] = [];
  assignedIncidents: MiAsignacionDto[] = [];
  servicios: Servicio[] = [];
  empleadosAsignables: Empleado[] = [];
  tecnicosCercanos: TecnicoCercanoDto[] = [];

  loading = false;
  cargandoTecnicos = false;
  cargandoEmpleados = false;
  asignando = false;
  updatingLocation = false;

  miDisponible = true;
  ultimaUbicacionActualizada: Date | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  modalAsignarVisible = false;
  modalIncidentes: IncidenteDto | null = null;
  servicioSeleccionadoId = '';

  constructor(
    private api: IncidenteApiService,
    public readonly auth: AuthService,
    private empleadoApi: EmpleadoApiService,
    private clienteApi: ClienteApiService,
    private userManagementApi: UserManagementApiService,
    private readonly route: ActivatedRoute,
  ) {}

  // --- Create incident (client) state
  creating = false;
  createForm: IncidenteCreateRequest = {
    vehiculo_id: undefined,
    tipo: '',
    descripcion: '',
    latitud: undefined,
    longitud: undefined,
  };
  myVehiculos: VehiculoDto[] = [];
  evidenciaFiles: File[] = [];
  uploadingEvidencias = false;

  get isClientView(): boolean {
    if (this.routeRoleView === 'cliente') {
      return true;
    }
    return this.auth.isClient;
  }

  get isAdminView(): boolean {
    if (this.routeRoleView === 'admin') {
      return true;
    }
    if (this.routeRoleView === 'empleado') {
      return false;
    }
    return this.auth.isAdmin;
  }

  get isEmpleadoView(): boolean {
    if (this.routeRoleView === 'empleado') {
      return true;
    }
    return !!this.auth.currentUser?.empleado_id && !this.auth.isAdmin && !this.auth.isClient;
  }

  get incidentsSectionTitle(): string {
    if (this.isEmpleadoView) {
      return 'Solicitudes asignadas';
    }
    if (this.auth.isClient) {
      return 'Mis solicitudes';
    }
    return 'Incidentes pendientes';
  }

  get incidentsCounterLabel(): string {
    if (this.isEmpleadoView) {
      return `${this.incidents.length} solicitud(es) asignada(s)`;
    }
    if (this.isClientView) {
      return `${this.incidents.length} solicitud(es) registradas`;
    }
    return `${this.incidents.length} solicitud(es) sin asignar`;
  }

  get loadingMessage(): string {
    return this.isEmpleadoView ? 'Cargando asignaciones...' : 'Cargando incidentes...';
  }

  get emptyMessage(): string {
    if (this.isEmpleadoView) {
      return 'No tienes solicitudes asignadas';
    }
    if (this.isClientView) {
      return 'No tienes incidentes registrados';
    }
    return 'No hay incidentes pendientes';
  }

  ngOnInit(): void {
    this.routeRoleView = (this.route.snapshot.data['roleView'] as 'empleado' | 'admin' | 'cliente' | undefined) || null;
    console.log('[solicitud_incidentes] routeRoleView:', this.routeRoleView);
    console.log('[solicitud_incidentes] isEmpleadoView:', this.isEmpleadoView);
    console.log('[solicitud_incidentes] isAdminView:', this.isAdminView);
    console.log('[solicitud_incidentes] isClientView:', this.isClientView);
    console.log('[solicitud_incidentes] auth.currentUser.empleado_id:', this.auth.currentUser?.empleado_id);
    this.cargarIncidentes();
    this.cargarServicios();
    if (this.isClientView) {
      this.cargarMisVehiculos();
    }
  }

  cargarIncidentes(): void {
    this.loading = true;
    console.log('[cargarIncidentes] isEmpleadoView:', this.isEmpleadoView, 'routeRoleView:', this.routeRoleView);
    if (this.isEmpleadoView) {
      console.log('[cargarIncidentes] Loading as EMPLEADO - calling getMyAsignaciones');
      this.empleadoApi.getMyAsignaciones().subscribe({
        next: (items) => {
          console.log('[cargarIncidentes] Received asignaciones:', items);
          this.assignedIncidents = items || [];
          this.incidents = this.assignedIncidents.map((item) => this.mapAsignacionToIncidente(item));
          this.loading = false;
        },
        error: (err) => {
          console.error('[cargarIncidentes] Error loading asignaciones:', err);
          this.mostrarMensaje('Error al cargar tus asignaciones', 'error');
          this.loading = false;
        },
      });
      return;
    }

    this.api.list().subscribe({
      next: (data) => {
        if (this.isAdminView) {
          // Separar en nuevas y atendidas para admin
          this.incidentsNuevas = (data || []).filter((inc) => ['pendiente', 'en_proceso', 'asignado', 'aceptada'].includes(inc.estado?.toLowerCase() || ''));
          this.incidentsAtendidas = (data || []).filter((inc) => ['atendido', 'cerrado', 'finalizado', 'completado'].includes(inc.estado?.toLowerCase() || ''));
          this.incidents = data;
        } else {
          this.incidents = data;
        }
        this.loading = false;
      },
      error: (err) => {
        this.mostrarMensaje('Error al cargar incidentes', 'error');
        this.loading = false;
      },
    });
  }

  private mapAsignacionToIncidente(asignacion: MiAsignacionDto): IncidenteDto {
    return {
      id: asignacion.incidente_id,
      tipo: asignacion.incidente_tipo || 'Solicitud',
      descripcion: asignacion.incidente_descripcion || 'Sin descripción',
      estado: asignacion.incidente_estado || asignacion.estado_tarea || 'asignada',
      latitud: asignacion.incidente_latitud ?? undefined,
      longitud: asignacion.incidente_longitud ?? undefined,
      creado_en: asignacion.fecha_asignacion,
      prioridad: undefined,
      vehiculo_id: undefined,
      cliente_id: undefined,
    };
  }

  cargarServicios(): void {
    this.userManagementApi.getServicios().subscribe({
      next: (data) => {
        this.servicios = data || [];
        if (!this.servicioSeleccionadoId && this.servicios.length > 0) {
          this.servicioSeleccionadoId = this.servicios[0].id_servicio;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al cargar servicios', 'error');
      },
    });
  }

  // --- Cliente: cargar vehiculos y manejo de creacion
  cargarMisVehiculos(): void {
    this.clienteApi.listMyVehiculos().subscribe({
      next: (lista) => (this.myVehiculos = lista || []),
      error: () => (this.myVehiculos = []),
    });
  }

  setLocationFromGeolocation(): void {
    if (!navigator.geolocation) {
      this.mostrarMensaje('Geolocalización no disponible', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.createForm.latitud = pos.coords.latitude;
        this.createForm.longitud = pos.coords.longitude;
      },
      () => this.mostrarMensaje('No se pudo obtener tu ubicación', 'error'),
    );
  }

  onEvidenciaFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files) return;
    this.evidenciaFiles = Array.from(input.files);
  }

  resetCreateForm(): void {
    this.createForm = { vehiculo_id: undefined, tipo: '', descripcion: '', latitud: undefined, longitud: undefined };
    this.evidenciaFiles = [];
  }

  createIncident(): void {
    if (!this.createForm.tipo) {
      this.mostrarMensaje('Seleccione el tipo de incidente', 'error');
      return;
    }
    this.creating = true;
    this.api.create(this.createForm).subscribe({
      next: (created) => {
        if (this.evidenciaFiles.length > 0) {
          this.uploadingEvidencias = true;
          const uploads = this.evidenciaFiles.map((f) => firstValueFrom(this.api.uploadEvidenciaArchivo(created.id, f)));
          Promise.all(uploads)
            .then(() => {
              this.uploadingEvidencias = false;
              this.mostrarMensaje('Solicitud creada con evidencias', 'success');
              this.resetCreateForm();
              this.cargarIncidentes();
              this.creating = false;
            })
            .catch(() => {
              this.uploadingEvidencias = false;
              this.mostrarMensaje('Solicitud creada pero falló subir evidencias', 'error');
              this.resetCreateForm();
              this.cargarIncidentes();
              this.creating = false;
            });
        } else {
          this.mostrarMensaje('Solicitud creada', 'success');
          this.resetCreateForm();
          this.cargarIncidentes();
          this.creating = false;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al crear la solicitud', 'error');
        this.creating = false;
      },
    });
  }

  cargarEmpleadosAsignables(): void {
    this.cargandoEmpleados = true;
    this.empleadoApi.list().subscribe({
      next: (data: Empleado[]) => {
        this.empleadosAsignables = data || [];
        this.cargandoEmpleados = false;
      },
      error: () => {
        this.cargandoEmpleados = false;
        this.mostrarMensaje('Error al cargar empleados', 'error');
      },
    });
  }

  actualizarMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.mostrarMensaje('GeolocalizaciÃ³n no disponible', 'error');
      return;
    }

    this.updatingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const payload = {
          latitud: lat,
          longitud: lon,
          disponible: this.miDisponible,
        };

        this.api.updateMiUbicacion(payload).subscribe({
          next: () => {
            this.ultimaUbicacionActualizada = new Date();
            this.mostrarMensaje('UbicaciÃ³n actualizada âœ“', 'success');
            this.updatingLocation = false;
          },
          error: () => {
            this.mostrarMensaje('Error al actualizar ubicaciÃ³n', 'error');
            this.updatingLocation = false;
          },
        });
      },
      () => {
        this.mostrarMensaje('No se pudo obtener tu ubicaciÃ³n', 'error');
        this.updatingLocation = false;
      },
    );
  }

  abrirModalAsignar(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) {
      this.mostrarMensaje('El incidente no tiene ubicaciÃ³n', 'error');
      return;
    }

    this.modalIncidentes = incidente;
    this.modalAsignarVisible = true;
    if (!this.servicioSeleccionadoId && this.servicios.length > 0) {
      this.servicioSeleccionadoId = this.servicios[0].id_servicio;
    }
    this.cargarEmpleadosAsignables();
    this.cargarTecnicosCercanos(incidente);
  }

  cargarTecnicosCercanos(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) return;

    this.cargandoTecnicos = true;
    this.api.listTecnicosCercanos(incidente.latitud, incidente.longitud).subscribe({
      next: (data) => {
        this.tecnicosCercanos = data;
        this.cargandoTecnicos = false;
      },
      error: () => {
        this.mostrarMensaje('Error al cargar tÃ©cnicos', 'error');
        this.cargandoTecnicos = false;
      },
    });
  }

  confirmarAsignacion(tecnico: any): void {
    if (!this.modalIncidentes) return;
    if (!this.servicioSeleccionadoId) {
      this.mostrarMensaje('Selecciona un servicio antes de asignar', 'error');
      return;
    }

    const empleadoId = tecnico.empleado_id || tecnico.id;
    if (!empleadoId) {
      this.mostrarMensaje('No se pudo resolver el empleado a asignar', 'error');
      return;
    }

    this.asignando = true;
    const payload: AsignarTecnicoRequest = {
      empleado_id: empleadoId,
      servicio_id: this.servicioSeleccionadoId || undefined,
    };

    this.api.assignTecnico(this.modalIncidentes.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(
          `TÃ©cnico ${tecnico.nombre_completo} asignado âœ“`,
          'success',
        );
        this.cerrarModalAsignar();
        this.cargarIncidentes();
        this.asignando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al asignar tÃ©cnico', 'error');
        this.asignando = false;
      },
    });
  }

  cerrarModalAsignar(): void {
    this.modalAsignarVisible = false;
    this.modalIncidentes = null;
    this.tecnicosCercanos = [];
  }

  abrirMapa(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) return;
    const url = `https://maps.google.com/?q=${incidente.latitud},${incidente.longitud}`;
    window.open(url, '_blank');
  }

  verTracking(incidente: IncidenteDto): void {
    // Navegar a la pantalla de tracking
    window.location.href = `/tracking/${incidente.id}`;
  }

  getPriorityColor(prioridad?: number): string {
    if (!prioridad) return '#6b7280';
    if (prioridad <= 2) return '#22c55e'; // Verde - baja
    if (prioridad <= 3) return '#f59e0b'; // Naranja - media
    return '#ef4444'; // Rojo - alta
  }

  private mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = tipo;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}
