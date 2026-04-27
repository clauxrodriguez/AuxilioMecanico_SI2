import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Nuevo cliente</h2>
          <p class="muted">Completa los datos del cliente. El vehiculo es opcional.</p>
        </div>
        <a routerLink="/app/clientes" class="btn btn-ghost">Volver al listado</a>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="submit()">
        <h3>Datos del cliente</h3>
        <div class="form-grid">
          <div>
            <label class="label">Nombre</label>
            <input class="input" formControlName="nombre" />
            <div class="error" *ngIf="isInvalid('nombre')">Nombre requerido (max 120).</div>
          </div>

          <div>
            <label class="label">Usuario</label>
            <input class="input" formControlName="username" autocomplete="username" />
            <div class="error" *ngIf="isInvalid('username')">Usuario requerido (min 4, max 120).</div>
          </div>

          <div>
            <label class="label">Contrasena</label>
            <input class="input" type="password" formControlName="password" autocomplete="new-password" />
            <div class="error" *ngIf="isInvalid('password')">Contrasena requerida (min 8).</div>
          </div>

          <div>
            <label class="label">Confirmar contrasena</label>
            <input class="input" type="password" formControlName="password_confirm" autocomplete="new-password" />
            <div class="error" *ngIf="passwordMismatch">Las contrasenas no coinciden.</div>
          </div>

          <div>
            <label class="label">Correo</label>
            <input class="input" formControlName="email" type="email" />
            <div class="error" *ngIf="isInvalid('email')">Correo invalido.</div>
          </div>

          <div>
            <label class="label">Telefono</label>
            <input class="input" formControlName="telefono" />
            <div class="error" *ngIf="isInvalid('telefono')">Telefono demasiado largo.</div>
          </div>
        </div>

        <label style="display:flex; align-items:center; gap:0.5rem;">
          <input type="checkbox" formControlName="activo" />
          Cliente activo
        </label>

        <hr style="border:none; border-top:1px solid var(--line); margin:0.4rem 0;" />

        <h3>Vehiculo inicial (opcional)</h3>
        <p class="muted">Puedes dejar estos campos vacios y registrar el vehiculo despues.</p>

        <div class="form-grid">
          <div>
            <label class="label">Marca</label>
            <input class="input" formControlName="vehiculo_marca" />
          </div>

          <div>
            <label class="label">Modelo</label>
            <input class="input" formControlName="vehiculo_modelo" />
          </div>

          <div>
            <label class="label">Placa</label>
            <input class="input" formControlName="vehiculo_placa" />
          </div>

          <div>
            <label class="label">Año</label>
            <input class="input" type="number" formControlName="vehiculo_anio" />
          </div>
        </div>

        <label style="display:flex; align-items:center; gap:0.5rem;">
          <input type="checkbox" formControlName="vehiculo_principal" />
          Marcar vehiculo como principal
        </label>

        <div class="actions">
          <a routerLink="/app/clientes" class="btn btn-ghost">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Guardando...' : 'Guardar cliente' }}
          </button>
        </div>
      </form>
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
      }

      .muted {
        color: var(--muted);
      }

      .inner {
        padding: 1rem;
        margin: 1rem 0;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
        margin-top: 0.6rem;
      }
    `,
  ],
})
export class ClienteCreateComponent {
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    password_confirm: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(30)]],
    activo: [true],
    vehiculo_marca: [''],
    vehiculo_modelo: [''],
    vehiculo_placa: [''],
    vehiculo_anio: [null as number | null],
    vehiculo_principal: [true],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ClienteApiService,
    private readonly router: Router,
  ) {}

  isInvalid(control: 'nombre' | 'username' | 'password' | 'email' | 'telefono'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  get passwordMismatch(): boolean {
    const password = this.form.controls.password.value;
    const confirm = this.form.controls.password_confirm.value;
    if (!confirm) {
      return false;
    }
    return password !== confirm;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid || this.passwordMismatch) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre.trim(),
      username: raw.username.trim(),
      password: raw.password,
      email: this.optional(raw.email),
      telefono: this.optional(raw.telefono),
      activo: !!raw.activo,
    };

    const vehiculoPayload = {
      marca: this.optional(raw.vehiculo_marca),
      modelo: this.optional(raw.vehiculo_modelo),
      placa: this.optional(raw.vehiculo_placa),
      anio: raw.vehiculo_anio ?? undefined,
    };
    const hasVehiculo = Boolean(
      vehiculoPayload.marca || vehiculoPayload.modelo || vehiculoPayload.placa || vehiculoPayload.anio,
    );
    const markVehiculoPrincipal = !!raw.vehiculo_principal;

    this.loading = true;
    this.errorMsg = '';

    this.api.create(payload).subscribe({
      next: (created) => {
        if (!hasVehiculo) {
          this.loading = false;
          this.router.navigate(['/app/clientes', created.id]);
          return;
        }

        this.api.createVehiculo(created.id, vehiculoPayload).subscribe({
          next: (vehiculo) => {
            if (!markVehiculoPrincipal) {
              this.loading = false;
              this.router.navigate(['/app/clientes', created.id]);
              return;
            }

            this.api.setPrincipal(vehiculo.id).subscribe({
              next: () => {
                this.loading = false;
                this.router.navigate(['/app/clientes', created.id]);
              },
              error: (error) => {
                this.loading = false;
                this.errorMsg = error?.error?.detail || 'Cliente guardado, pero no se pudo marcar el vehiculo como principal.';
              },
            });
          },
          error: (error) => {
            this.loading = false;
            this.errorMsg = error?.error?.detail || 'Cliente guardado, pero no se pudo registrar el vehiculo.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar el cliente.';
      },
    });
  }

  private optional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }
}
