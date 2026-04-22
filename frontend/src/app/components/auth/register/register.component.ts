import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="register-wrap">
      <article class="card register-card">
        <h1>Registro</h1>
        <p class="muted">Paso {{ step }} de 2</p>

        <form [formGroup]="empresaForm" *ngIf="step === 1" class="form-grid" (ngSubmit)="goToStepTwo()">
          <div>
            <label class="label">Nombre de empresa</label>
            <input class="input" formControlName="empresa_nombre" />
          </div>

          <div>
            <label class="label">NIT</label>
            <input class="input" formControlName="empresa_nit" />
          </div>

          <div>
            <label class="label">Correo empresa</label>
            <input class="input" type="email" formControlName="empresa_email" autocomplete="email" />
          </div>

          <div>
            <label class="label">Telefono</label>
            <input class="input" formControlName="empresa_telefono" />
          </div>

          <div class="full-width">
            <label class="label">Direccion</label>
            <input class="input" formControlName="empresa_direccion" />
          </div>

          <div>
            <label class="label">Plan</label>
            <select class="select" formControlName="plan">
              <option value="basico">Basico</option>
              <option value="profesional">Profesional</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>

          <div class="full-width">
            <p class="helper">Pago (opcional). Si completas uno, debes completar los 3 campos.</p>
          </div>

          <div>
            <label class="label">Tarjeta (16 digitos)</label>
            <input class="input" formControlName="card_number" inputmode="numeric" />
          </div>

          <div>
            <label class="label">Vencimiento (MM/AA)</label>
            <input class="input" formControlName="card_expiry" placeholder="MM/AA" />
          </div>

          <div>
            <label class="label">CVC</label>
            <input class="input" formControlName="card_cvc" inputmode="numeric" />
          </div>

          <div class="actions full-width">
            <a class="btn btn-ghost" routerLink="/">Volver</a>
            <button class="btn btn-primary" type="submit" [disabled]="loading || empresaForm.invalid">
              {{ loading ? 'Registrando empresa...' : 'Continuar a administrador' }}
            </button>
          </div>
        </form>

        <form [formGroup]="adminForm" *ngIf="step === 2" class="form-grid" (ngSubmit)="submit()">
          <div>
            <label class="label">Usuario administrador</label>
            <input class="input" formControlName="admin_username" autocomplete="username" />
          </div>

          <div>
            <label class="label">Contrasena</label>
            <div class="password-field">
              <input
                class="input password-input"
                [type]="showAdminPassword ? 'text' : 'password'"
                formControlName="admin_password"
                autocomplete="new-password"
              />
              <button
                class="password-toggle"
                type="button"
                (click)="toggleAdminPassword()"
                [attr.aria-label]="showAdminPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" *ngIf="!showAdminPassword">
                  <path
                    d="M2 12s3.5-6 10-6s10 6 10 6s-3.5 6-10 6S2 12 2 12Zm10 3.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"
                    fill="currentColor"
                  />
                </svg>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" *ngIf="showAdminPassword">
                  <path
                    d="m3 3 18 18-1.4 1.4-3.2-3.2A11.7 11.7 0 0 1 12 20c-6.5 0-10-6-10-6a19.8 19.8 0 0 1 4.7-5.1L1.6 4.4 3 3Zm6.4 8.8 2.8 2.8a2.2 2.2 0 0 1-2.8-2.8Zm4.7 4.7L12 14.4l-2.5-2.5a2.2 2.2 0 0 1 3-3l2.9 2.9a2.2 2.2 0 0 1-1.3 4.7Zm7.8-2.5a19.7 19.7 0 0 1-4.4 4.8l-2.1-2.1a4.2 4.2 0 0 0 1.3-1.7 4.3 4.3 0 0 0-1-4.7l-3-3a4.3 4.3 0 0 0-4.7-1L6 4.5A11.7 11.7 0 0 1 12 4c6.5 0 10 6 10 6Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="label">Nombres</label>
            <input class="input" formControlName="admin_first_name" />
          </div>

          <div>
            <label class="label">Apellidos</label>
            <input class="input" formControlName="admin_last_names" />
          </div>

          <div>
            <label class="label">Correo</label>
            <input class="input" type="email" formControlName="admin_email" autocomplete="email" />
          </div>

          <div>
            <label class="label">CI</label>
            <input class="input" formControlName="admin_ci" />
          </div>

          <div class="actions full-width">
            <button class="btn btn-ghost" type="button" (click)="step = 1" [disabled]="loading">Volver a empresa</button>
            <button class="btn btn-primary" type="submit" [disabled]="loading || adminForm.invalid">
              {{ loading ? 'Registrando...' : 'Registrar administrador' }}
            </button>
          </div>
        </form>

        <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      .register-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .register-card {
        width: min(620px, 95vw);
        padding: 1.5rem;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .muted {
        color: var(--muted);
      }

      .helper {
        margin: 0;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .password-field {
        position: relative;
      }

      .password-input {
        padding-right: 2.8rem;
      }

      .password-toggle {
        position: absolute;
        right: 0.45rem;
        top: 50%;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: var(--muted);
        padding: 0.2rem;
        width: 1.9rem;
        height: 1.9rem;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .password-toggle:hover {
        background: var(--surface-2);
        color: var(--text);
      }

      .password-toggle svg {
        width: 1.1rem;
        height: 1.1rem;
      }

      .actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
        margin-top: 1rem;
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
export class RegisterComponent {
  step = 1;
  loading = false;
  errorMsg = '';
  showAdminPassword = false;
  private registrationToken: string | null = null;

  readonly empresaForm = this.fb.nonNullable.group({
    empresa_nombre: ['', [Validators.required, Validators.maxLength(100)]],
    empresa_nit: ['', [Validators.required, Validators.maxLength(20)]],
    empresa_email: ['', [Validators.email, Validators.maxLength(254)]],
    empresa_telefono: ['', Validators.maxLength(20)],
    empresa_direccion: ['', Validators.maxLength(255)],
    plan: ['basico', Validators.required],
    card_number: [''],
    card_expiry: [''],
    card_cvc: [''],
  });

  readonly adminForm = this.fb.nonNullable.group({
    admin_username: ['', [Validators.required, Validators.maxLength(100)]],
    admin_password: ['', Validators.required],
    admin_first_name: ['', [Validators.required, Validators.maxLength(100)]],
    admin_last_names: ['', [Validators.required, Validators.maxLength(201)]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_ci: ['', [Validators.required, Validators.maxLength(20)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  goToStepTwo(): void {
    if (this.loading) {
      return;
    }
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    const payment = this.normalizedPayment();
    const hasAnyPayment = Boolean(payment.card_number || payment.card_expiry || payment.card_cvc);
    const hasAllPayment = Boolean(payment.card_number && payment.card_expiry && payment.card_cvc);
    if (hasAnyPayment && !hasAllPayment) {
      this.errorMsg = 'Si envias datos de pago, debes completar tarjeta, vencimiento y CVC.';
      return;
    }

    const empresa = this.empresaForm.getRawValue();
    this.loading = true;
    this.errorMsg = '';
    this.auth.registerCompany({
      empresa_nombre: empresa.empresa_nombre.trim(),
      empresa_nit: empresa.empresa_nit.trim(),
      empresa_email: this.optionalValue(empresa.empresa_email),
      empresa_telefono: this.optionalValue(empresa.empresa_telefono),
      empresa_direccion: this.optionalValue(empresa.empresa_direccion),
      plan: empresa.plan,
      card_number: payment.card_number,
      card_expiry: payment.card_expiry,
      card_cvc: payment.card_cvc,
    }).subscribe({
      next: (result) => {
        this.loading = false;
        this.registrationToken = result.registration_token;
        this.step = 2;
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar la empresa.';
      },
    });
  }

  submit(): void {
    if (this.loading) {
      return;
    }
    if (this.empresaForm.invalid) {
      this.step = 1;
      this.empresaForm.markAllAsTouched();
      return;
    }
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const payment = this.normalizedPayment();
    const hasAnyPayment = Boolean(payment.card_number || payment.card_expiry || payment.card_cvc);
    const hasAllPayment = Boolean(payment.card_number && payment.card_expiry && payment.card_cvc);
    if (hasAnyPayment && !hasAllPayment) {
      this.errorMsg = 'Si envias datos de pago, debes completar tarjeta, vencimiento y CVC.';
      this.step = 1;
      return;
    }

    const admin = this.adminForm.getRawValue();
    if (!this.registrationToken) {
      this.loading = false;
      this.errorMsg = 'Debes registrar primero la empresa.';
      this.step = 1;
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const surnames = this.splitLastNames(admin.admin_last_names);

    this.auth.registerAdmin({
      registration_token: this.registrationToken,
      admin_username: admin.admin_username.trim(),
      admin_password: admin.admin_password,
      admin_first_name: admin.admin_first_name.trim(),
      admin_email: admin.admin_email.trim(),
      admin_ci: admin.admin_ci.trim(),
      admin_apellido_p: surnames.apellidoP,
      admin_apellido_m: surnames.apellidoM,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.registrationToken = null;
        this.router.navigate(['/app/empleados']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo completar el registro.';
      },
    });
  }

  toggleAdminPassword(): void {
    this.showAdminPassword = !this.showAdminPassword;
  }

  private splitLastNames(fullLastNames: string): { apellidoP: string; apellidoM: string } {
    const normalized = fullLastNames.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return { apellidoP: '', apellidoM: '' };
    }

    const [apellidoP, ...rest] = normalized.split(' ');
    return {
      apellidoP: apellidoP.slice(0, 100),
      apellidoM: rest.join(' ').slice(0, 100),
    };
  }

  private optionalValue(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizedPayment(): { card_number: string | null; card_expiry: string | null; card_cvc: string | null } {
    const payment = this.empresaForm.getRawValue();
    const cardNumber = payment.card_number.trim();
    const cardExpiry = payment.card_expiry.trim();
    const cardCvc = payment.card_cvc.trim();

    return {
      card_number: cardNumber || null,
      card_expiry: cardExpiry || null,
      card_cvc: cardCvc || null,
    };
  }
}
