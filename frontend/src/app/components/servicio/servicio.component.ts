import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Servicio } from '../../models/user-management.models';
import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';

@Component({
  selector: 'app-servicio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Servicios</h2>
          <p class="muted">Registro y mantenimiento de servicios del taller.</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage">
        <h3>{{ editingId ? 'Editar servicio' : 'Nuevo servicio' }}</h3>

        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="nombre" />
        </div>

        <div>
          <label class="label">Descripcion</label>
          <input class="input" formControlName="descripcion" />
        </div>

        <label class="check-row">
          <input type="checkbox" formControlName="activo" />
          <span>Activo</span>
        </label>

        <div class="actions">
          <button class="btn btn-primary" [disabled]="form.invalid || loading">
            {{ editingId ? 'Actualizar' : 'Crear' }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="resetForm()">Cancelar</button>
        </div>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripcion</th>
            <th>Estado</th>
            <th *ngIf="canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let servicio of servicios">
            <td>{{ servicio.nombre }}</td>
            <td>{{ servicio.descripcion || 'N/A' }}</td>
            <td>
              <span class="badge" [class.badge--inactive]="!servicio.activo">
                {{ servicio.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td *ngIf="canManage">
              <button class="btn btn-ghost" (click)="edit(servicio)">Editar</button>
              <button class="btn btn-danger" (click)="remove(servicio)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
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

      .check-row {
        margin-top: 0.8rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .actions {
        display: flex;
        gap: 0.6rem;
        margin-top: 1rem;
      }

      .badge--inactive {
        background: #64748b;
      }
    `,
  ],
})
export class ServicioComponent implements OnInit {
  servicios: Servicio[] = [];
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    activo: [true],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_servicio');
  }

  ngOnInit(): void {
    this.fetchServicios();
  }

  fetchServicios(): void {
    this.api.getServicios().subscribe({
      next: (rows) => {
        this.servicios = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar servicios.';
      },
    });
  }

  edit(servicio: Servicio): void {
    this.editingId = servicio.id_servicio;
    this.form.patchValue({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      activo: servicio.activo,
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '', activo: true });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updateServicio(this.editingId, payload)
      : this.api.createServicio(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchServicios();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar servicio.';
      },
    });
  }

  remove(servicio: Servicio): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar servicio ${servicio.nombre}?`)) {
      return;
    }

    this.api.deleteServicio(servicio.id_servicio).subscribe({
      next: () => this.fetchServicios(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar servicio.';
      },
    });
  }
}
