import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Cargo } from '../../models/user-management.models';

@Component({
  selector: 'app-cargo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Cargos</h2>
          <p class="muted">Registro y mantenimiento de cargos para asignar a empleados.</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage">
        <h3>{{ editingId ? 'Editar cargo' : 'Nuevo cargo' }}</h3>

        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="nombre" />
        </div>

        <div>
          <label class="label">Descripcion</label>
          <input class="input" formControlName="descripcion" />
        </div>

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
            <th *ngIf="canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let cargo of cargos">
            <td>{{ cargo.nombre }}</td>
            <td>{{ cargo.descripcion || 'N/A' }}</td>
            <td *ngIf="canManage">
              <button class="btn btn-ghost" (click)="edit(cargo)">Editar</button>
              <button class="btn btn-danger" (click)="remove(cargo)">Eliminar</button>
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

      .actions {
        display: flex;
        gap: 0.6rem;
        margin-top: 1rem;
      }
    `,
  ],
})
export class CargoComponent implements OnInit {
  cargos: Cargo[] = [];
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_cargo');
  }

  ngOnInit(): void {
    this.fetchCargos();
  }

  fetchCargos(): void {
    this.api.getCargos().subscribe({
      next: (rows) => {
        this.cargos = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar cargos.';
      },
    });
  }

  edit(cargo: Cargo): void {
    this.editingId = cargo.id;
    this.form.patchValue({
      nombre: cargo.nombre,
      descripcion: cargo.descripcion || '',
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '' });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updateCargo(this.editingId, payload)
      : this.api.createCargo(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchCargos();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar cargo.';
      },
    });
  }

  remove(cargo: Cargo): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar cargo ${cargo.nombre}?`)) {
      return;
    }

    this.api.deleteCargo(cargo.id).subscribe({
      next: () => this.fetchCargos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar cargo.';
      },
    });
  }
}