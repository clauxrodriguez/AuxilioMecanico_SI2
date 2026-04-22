import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="card side">
      <h2>Gestion Usuario</h2>
      <p class="muted" *ngIf="auth.currentUser as user">
        {{ user.nombre_completo }}<br />
        <span class="badge">{{ user.empresa_nombre || 'Sin empresa' }}</span>
      </p>

      <nav>
        <a routerLink="/app/empleados" routerLinkActive="active">Empleados</a>
        <a routerLink="/app/cargos" routerLinkActive="active">Cargos</a>
        <a routerLink="/app/servicios" routerLinkActive="active">Servicios</a>
        <a routerLink="/app/roles" routerLinkActive="active">Roles</a>
        <a routerLink="/app/permisos" routerLinkActive="active">Permisos</a>
      </nav>

      <button class="btn btn-ghost" (click)="logout()">Cerrar sesion</button>
    </aside>
  `,
  styles: [
    `
      .side {
        margin: 1rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .muted {
        color: var(--muted);
      }

      nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      nav a {
        text-decoration: none;
        color: var(--text);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0.55rem 0.7rem;
      }

      nav a.active {
        background: var(--brand);
        color: white;
        border-color: var(--brand);
      }
    `,
  ],
})
export class SidebarComponent {
  constructor(public readonly auth: AuthService) {}

  logout(): void {
    this.auth.logout();
  }
}
