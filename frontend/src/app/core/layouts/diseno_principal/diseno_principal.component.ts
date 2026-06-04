import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../componentes_globales/barra_lateral/barra_lateral.component';
import { TopbarComponent } from '../../componentes_globales/barra_superior/barra_superior.component';
import { ToastContainerComponent } from '../../componentes_globales/contenedor_toast/contenedor_toast.component';
import { PushNotificationService } from '../../services/push-notification.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],
  templateUrl: './diseno_principal.component.html',
  styleUrls: ['./diseno_principal.component.css'],
})
export class MainLayoutComponent implements OnInit {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.initializeNotifications();
  }

  /**
   * Inicializar listeners de notificaciones de Firebase
   */
  private async initializeNotifications(): Promise<void> {
    try {
      // Registrar el Service Worker
      await this.pushNotificationService.registerServiceWorker();

      // Registrar listener para mensajes en foreground (espera a que Firebase esté inicializado)
      await this.pushNotificationService.registerForegroundMessageListener(
        (msg) => {
          console.log('[MainLayoutComponent] Message received:', msg);

          const title = msg.title || 'Nueva notificación';
          const body = msg.body || 'Tienes una nueva notificación';

          const incidentId = msg.incidentId || msg.data?.['incidente_id'];
          if (incidentId) {
            this.toastService.incidentNotification(incidentId, {
              label: 'Ver solicitud',
              callback: () => {
                this.router.navigate(['/app/incidentes', incidentId]);
              },
            });
          } else {
            this.toastService.info(title, body);
          }
        },
        (incidentId) => {
          console.log('[MainLayoutComponent] Incident notification:', incidentId);
          this.router.navigate(['/app/incidentes', incidentId]);
        }
      );
    } catch (error) {
      console.error('[MainLayoutComponent] Error initializing notifications:', error);
    }
  }
}
