import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="panel-wrap">
      <header class="hero card">
        <div>
          <p class="eyebrow">Panel del Administrador</p>
          <h2>{{ auth.currentUser?.nombre_completo || 'Mi panel' }}</h2>
          <p class="muted">
            Revisa tu información personal.
          </p>
        </div>
      </header>

      <!-- SECCIÓN: MI INFORMACIÓN -->
      <div class="grid">
        <article class="card block">
          <div class="section-head">
            <div>
              <p class="eyebrow">Perfil</p>
              <h3>Mi información</h3>
            </div>
            <span class="badge badge--ok">Administrador</span>
          </div>

          <div class="profile-grid">
            <div>
              <span class="label">Usuario</span>
              <strong>{{ auth.currentUser?.username }}</strong>
            </div>
            <div>
              <span class="label">Correo</span>
              <strong>{{ auth.currentUser?.email || 'N/A' }}</strong>
            </div>
            <div>
              <span class="label">Nombre completo</span>
              <strong>{{ auth.currentUser?.nombre_completo || 'N/A' }}</strong>
            </div>
            <div>
              <span class="label">Empresa</span>
              <strong>{{ auth.currentUser?.empresa_nombre || 'N/A' }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .panel-wrap {
        display: grid;
        gap: 1rem;
      }

      .hero {
        padding: 1.2rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.76rem;
        color: var(--brand-2);
        font-weight: 700;
      }

      h2,
      h3 {
        margin: 0;
      }

      .muted {
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        align-items: start;
      }

      .block {
        padding: 1rem;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }

      .profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
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

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.3rem 0.6rem;
        border-radius: 999px;
        border: 1px solid var(--line);
        font-size: 0.75rem;
      }

      .badge--ok {
        background: #22c55e22;
        color: #86efac;
        border-color: #22c55e;
      }
    `,
  ],
})
export class AdminProfileComponent {
  constructor(public readonly auth: AuthService) {}
}
