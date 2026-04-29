import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { ToastContainerComponent } from '../../components/toast-container.component';
import { PushNotificationService } from '../../services/push-notification.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],
  template: `
    <div class="shell">
      <app-sidebar></app-sidebar>

      <main class="page content">
        <app-topbar></app-topbar>
        <section class="workspace">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>

    <app-toast-container></app-toast-container>
  `,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 280px 1fr;
        min-height: 100vh;
      }

      .content {
        min-width: 0;
      }

      .workspace {
        padding: 1rem;
      }

      @media (max-width: 920px) {
        .shell {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
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
  private initializeNotifications(): void {
    // Registrar el Service Worker
    this.pushNotificationService.registerServiceWorker();

    // Registrar listener para mensajes en foreground
    this.pushNotificationService.registerForegroundMessageListener(
      (payload) => {
        console.log('[MainLayoutComponent] Message received:', payload);

        // Mostrar toast con la notificación
        const title = payload.notification?.title || 'Nueva notificación';
        const body = payload.notification?.body || 'Tienes una nueva notificación';

        const incidentId = payload.data?.['incidente_id'];
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
        // Navegar al incidente
        this.router.navigate(['/app/incidentes', incidentId]);
      }
    );
  }
}
