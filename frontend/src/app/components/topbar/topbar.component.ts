import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="card topbar">
      <div>
        <strong>Panel de gestion</strong>
        <p class="muted">Administracion de usuarios, roles y permisos</p>
      </div>

      <div class="user" *ngIf="auth.currentUser as user">
        <span>{{ user.nombre_completo }}</span>
        <span class="badge">{{ user.username }}</span>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        margin: 1rem 1rem 0;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .muted {
        color: var(--muted);
        margin: 0.2rem 0 0;
      }

      .user {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class TopbarComponent {
  constructor(public readonly auth: AuthService) {}
}
