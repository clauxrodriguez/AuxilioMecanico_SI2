import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="home-wrap">
      <article class="card home-card">
        <p class="eyebrow">Auxilio Mecanico</p>
        <h1>Gestion de taller</h1>
        <p class="muted">
          Administra empleados, roles y permisos desde un solo lugar.
        </p>

        <div class="actions">
          <a class="btn btn-primary" routerLink="/login">Iniciar sesion</a>
          <a class="btn btn-ghost" routerLink="/register">Registrarse</a>
        </div>
      </article>
    </section>
  `,
  styles: [
    `
      .home-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .home-card {
        width: min(620px, 95vw);
        padding: 1.5rem;
      }

      .eyebrow {
        margin: 0;
        color: var(--brand-2);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.78rem;
      }

      h1 {
        margin: 0.35rem 0 0;
      }

      .muted {
        color: var(--muted);
        margin-bottom: 1.2rem;
      }

      .actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
      }

      .actions .btn {
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class HomeComponent {}
