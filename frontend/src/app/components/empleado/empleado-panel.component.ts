import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService } from '../../services/empleado.service';
import { NotificationService, type NotificationDto } from '../../services/notification.service';
import type { Empleado } from '../../models/user-management.models';

@Component({
  selector: 'app-empleado-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="panel-wrap">
      <header class="hero card">
        <div>
          <p class="eyebrow">Panel de empleado</p>
          <h2>{{ empleado?.nombre_completo || auth.currentUser?.nombre_completo || 'Mi panel' }}</h2>
          <p class="muted">
            Revisa tu información personal.
          </p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <!-- SECCIÓN: MI PERFIL -->
      <div class="grid">
        <article class="card block">
          <div class="section-head">
            <div>
              <p class="eyebrow">Perfil</p>
              <h3>Mi información</h3>
            </div>
            <span class="badge" [class.badge--ok]="!!empleado">Empleado</span>
          </div>

          <div *ngIf="loadingProfile" class="muted">Cargando perfil...</div>

          <div *ngIf="!loadingProfile && empleado as e" class="profile-grid">
            <div><span class="label">Nombre</span><strong>{{ e.nombre_completo }}</strong></div>
            <div><span class="label">Usuario</span><strong>{{ e.usuario.username }}</strong></div>
            <div><span class="label">Correo</span><strong>{{ e.usuario.email || 'N/A' }}</strong></div>
            <div><span class="label">Teléfono</span><strong>{{ e.telefono || 'N/A' }}</strong></div>
            <div><span class="label">CI</span><strong>{{ e.ci }}</strong></div>
            <div><span class="label">Cargo</span><strong>{{ e.cargo_nombre || 'N/A' }}</strong></div>
            <div><span class="label">Empresa</span><strong>{{ e.empresa }}</strong></div>
            <div><span class="label">Sueldo</span><strong>{{ e.sueldo || '0' }}</strong></div>
          </div>
        </article>
      </div>

      <!-- SECCIÓN: NOTIFICACIONES -->
      <div class="grid">
        <article class="card block">
          <div class="section-head">
            <div>
              <p class="eyebrow">Notificaciones</p>
              <h3>Tus avisos recientes</h3>
            </div>
            <button *ngIf="notifications.length > 0" class="btn-small" (click)="loadNotifications()">
              Actualizar
            </button>
          </div>

          <div *ngIf="loadingNotifications" class="muted">Cargando notificaciones...</div>

          <div *ngIf="!loadingNotifications && notifications.length === 0" class="muted">
            No tienes notificaciones.
          </div>

          <div *ngIf="!loadingNotifications && notifications.length > 0" class="notifications-list">
            <div
              *ngFor="let notif of notifications"
              class="notification-item"
              [class.unread]="!notif.leida"
              (click)="showNotificationDetail(notif)"
            >
              <div class="notification-header">
                <strong class="notification-title">{{ notif.titulo }}</strong>
                <span class="notification-date">
                  {{ notif.creada_en | date: 'dd/MM/yyyy HH:mm' }}
                </span>
              </div>
              <div class="notification-body">
                {{ notif.mensaje }}
              </div>
              <div *ngIf="!notif.leida" class="badge badge--primary">Nuevo</div>
            </div>
          </div>
        </article>
      </div>

      <!-- MODAL DE DETALLE -->
      <div *ngIf="selectedNotification" class="modal-overlay" (click)="closeNotificationDetail()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalle de notificación</h3>
            <button class="btn-close" (click)="closeNotificationDetail()">✕</button>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <span class="label">Título</span>
              <p>{{ selectedNotification.titulo }}</p>
            </div>

            <div class="detail-section">
              <span class="label">Mensaje</span>
              <p>{{ selectedNotification.mensaje }}</p>
            </div>

            <div class="detail-section">
              <span class="label">Fecha</span>
              <p>{{ selectedNotification.creada_en | date: 'dd/MM/yyyy HH:mm:ss' }}</p>
            </div>

            <div class="detail-section">
              <span class="label">Estado</span>
              <p>{{ selectedNotification.leida ? 'Leída' : 'No leída' }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn" (click)="closeNotificationDetail()">Cerrar</button>
          </div>
        </div>
      </div>
    </section>
  `,
    styles: [
      `
        .panel-wrap { display: grid; gap: 1rem; }
        .hero { padding: 1.2rem; display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .hero-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.76rem; color: var(--brand-2); font-weight: 700; }
        h2, h3, h4 { margin: 0; }
        .muted { color: var(--muted); }
        .error { color: #fca5a5; }
        .grid { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: start; }
      .block { padding: 1rem; }
      .section-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
      .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
      .label { display: block; font-size: 0.78rem; color: var(--muted); margin-bottom: 0.15rem; }
      .badge { display: inline-flex; align-items: center; padding: 0.3rem 0.6rem; border-radius: 999px; border: 1px solid var(--line); }
      .badge--ok { background: #22c55e22; color: #86efac; }
      .badge--primary { background: var(--brand-light); color: var(--brand); border-color: var(--brand); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; display: inline-block; font-weight: 600; }

      /* Notifications */
      .notifications-list { display: grid; gap: 0.75rem; margin-top: 1rem; }
      .notification-item { padding: 0.75rem; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; transition: all 0.2s ease; background: var(--bg); }
      .notification-item:hover { border-color: var(--brand); background: rgba(59, 130, 246, 0.05); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .notification-item.unread { background: rgba(59, 130, 246, 0.1); border-color: var(--brand); }
      .notification-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; align-items: flex-start; }
      .notification-title { font-size: 0.9rem; color: var(--text); }
      .notification-date { font-size: 0.7rem; color: var(--muted); white-space: nowrap; }
      .notification-body { font-size: 0.8rem; color: var(--muted); margin-bottom: 0.5rem; line-height: 1.3; }

      /* Modal */
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
      .modal-content { background: var(--bg); border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
      .modal-header { padding: 1.5rem; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
      .modal-header h3 { margin: 0; }
      .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--muted); }
      .modal-body { padding: 1.5rem; }
      .detail-section { margin-bottom: 1rem; }
      .detail-section p { margin: 0.5rem 0 0 0; color: var(--text); }
      .modal-footer { padding: 1.5rem; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; }
      .btn-small { padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
      .btn { padding: 0.6rem 1rem; border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 8px; cursor: pointer; }
    `,
  ],
})
export class EmpleadoPanelComponent implements OnInit {
  empleado: Empleado | null = null;
  loadingProfile = false;
  errorMsg = '';
  notifications: NotificationDto[] = [];
  selectedNotification: NotificationDto | null = null;
  loadingNotifications = false;

  constructor(
    public readonly auth: AuthService,
    private readonly empleadoApi: EmpleadoApiService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadNotifications();
  }

  loadProfile(): void {
    this.errorMsg = '';
    this.loadingProfile = true;

    this.empleadoApi.getMe().subscribe({
      next: (perfil) => {
        this.empleado = perfil;
        this.loadingProfile = false;
      },
      error: (error) => {
        this.loadingProfile = false;
        this.errorMsg = error?.error?.detail || 'No se pudo cargar tu perfil de empleado.';
      },
    });
  }

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loadingNotifications = false;
      },
      error: (error) => {
        this.loadingNotifications = false;
        console.error('Error loading notifications:', error);
      },
    });
  }

  showNotificationDetail(notif: NotificationDto): void {
    this.selectedNotification = notif;

    // Marcar como leída si no lo está
    if (!notif.leida) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.leida = true;
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        },
      });
    }
  }

  closeNotificationDetail(): void {
    this.selectedNotification = null;
  }
}
