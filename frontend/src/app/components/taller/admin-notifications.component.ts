import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../services/auth/auth.service';
import { NotificationService, type NotificationDto } from '../../services/notification.service';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Mis Notificaciones</h2>
          <p class="muted">Avisos y actualizaciones de las solicitudes de auxilio.</p>
        </div>
        <button class="btn btn-ghost" type="button" (click)="loadNotifications()" [disabled]="loadingNotifications">
          {{ loadingNotifications ? 'Cargando...' : 'Actualizar' }}
        </button>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <p class="muted" *ngIf="loadingNotifications">Cargando notificaciones...</p>
      <div *ngIf="!loadingNotifications && notifications.length === 0" class="muted">No tienes notificaciones.</div>

      <div class="notifications-list" *ngIf="!loadingNotifications && notifications.length > 0">
        <article
          class="notification-card"
          *ngFor="let notif of notifications"
          (click)="showNotificationDetail(notif)"
          [class.unread]="!notif.leida"
        >
          <div class="notification-header">
            <strong class="notification-title">{{ notif.titulo }}</strong>
            <span class="notification-date">{{ notif.creada_en | date: 'dd/MM HH:mm' }}</span>
          </div>
          <div class="notification-body">{{ notif.mensaje }}</div>
          <div *ngIf="!notif.leida" class="badge badge--new">Nuevo</div>
        </article>
      </div>

      <!-- Modal de Detalle -->
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

            <div class="detail-section" *ngIf="selectedNotification.data">
              <span class="label">Información adicional</span>
              <div class="data-info">
                <div *ngFor="let item of (selectedNotification.data | keyvalue)" class="info-item">
                  <span class="key">{{ item.key }}</span>
                  <span class="value">{{ item.value }}</span>
                </div>
              </div>
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
      .page-block {
        padding: 1rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .muted {
        color: var(--muted);
      }

      .error {
        color: #fca5a5;
      }

      /* Notificaciones List */
      .notifications-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .notification-card {
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg);
      }

      .notification-card:hover {
        border-color: var(--brand);
        background: rgba(59, 130, 246, 0.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .notification-card.unread {
        background: rgba(59, 130, 246, 0.1);
        border-color: var(--brand);
      }

      .notification-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.5rem;
        align-items: flex-start;
      }

      .notification-title {
        font-size: 0.95rem;
        color: var(--text);
      }

      .notification-date {
        font-size: 0.75rem;
        color: var(--muted);
        white-space: nowrap;
      }

      .notification-body {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
        line-height: 1.4;
      }

      .badge--new {
        background: var(--brand-light);
        color: var(--brand);
        border-color: var(--brand);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        text-transform: uppercase;
        display: inline-block;
        font-weight: 600;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: var(--bg);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--line);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--muted);
      }

      .modal-body {
        padding: 1.5rem;
      }

      .detail-section {
        margin-bottom: 1.5rem;
      }

      .detail-section:last-child {
        margin-bottom: 0;
      }

      .detail-section p {
        margin: 0.5rem 0 0 0;
        color: var(--text);
      }

      .label {
        display: block;
        font-size: 0.78rem;
        color: var(--muted);
        margin-bottom: 0.4rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .data-info {
        border: 1px solid var(--line);
        border-radius: 6px;
        overflow: hidden;
        margin-top: 0.5rem;
      }

      .info-item {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 0.75rem;
        border-bottom: 1px solid var(--line);
        font-size: 0.85rem;
      }

      .info-item:last-child {
        border-bottom: none;
      }

      .info-item .key {
        font-weight: 600;
        color: var(--muted);
      }

      .info-item .value {
        color: var(--text);
        word-break: break-all;
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: flex-end;
      }

      .btn {
        padding: 0.6rem 1rem;
        border: 1px solid var(--line);
        background: var(--surface);
        color: var(--text);
        border-radius: 8px;
        cursor: pointer;
      }

      .btn-ghost {
        background: transparent;
        color: var(--muted);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .btn-ghost:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AdminNotificationsComponent implements OnInit {
  notifications: NotificationDto[] = [];
  selectedNotification: NotificationDto | null = null;
  loadingNotifications = false;
  errorMsg = '';

  constructor(
    public readonly auth: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.errorMsg = '';
    this.loadingNotifications = true;

    this.notificationService.getMyNotifications().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loadingNotifications = false;
      },
      error: (error) => {
        this.loadingNotifications = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar las notificaciones.';
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
