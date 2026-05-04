import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService } from '../../services/empleado.service';
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
    `,
  ],
})
export class EmpleadoPanelComponent implements OnInit {
  empleado: Empleado | null = null;
  loadingProfile = false;
  errorMsg = '';

  constructor(
    public readonly auth: AuthService,
    private readonly empleadoApi: EmpleadoApiService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
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
}
