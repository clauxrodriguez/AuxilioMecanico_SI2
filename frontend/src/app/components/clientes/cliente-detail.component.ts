import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto, VehiculoDto } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card page-block" *ngIf="cliente; else notFound">
      <header class="head">
        <div>
          <h2>Editar cliente</h2>
          <p class="muted">Actualiza datos del cliente. El registro de vehiculo es opcional.</p>
        </div>
        <a [routerLink]="['/app/clientes']" class="btn btn-ghost">Volver al listado</a>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="saveCliente()">
        <h3>Datos del cliente</h3>
        <div class="form-grid">
          <div>
            <label class="label">Nombre</label>
            <input class="input" formControlName="nombre" />
            <small class="error" *ngIf="form.get('nombre')?.invalid && form.get('nombre')?.touched">Nombre requerido</small>
          </div>

          <div>
            <label class="label">Correo</label>
            <input class="input" type="email" formControlName="email" />
          </div>

          <div>
            <label class="label">Telefono</label>
            <input class="input" formControlName="telefono" />
          </div>
        </div>

        <label class="check-row">
          <input type="checkbox" formControlName="activo" />
          <span>Cliente activo</span>
        </label>

        <hr style="border:none; border-top:1px solid var(--line); margin:0.4rem 0;" />

        <h3>Agregar vehiculo (opcional)</h3>
        <p class="muted">Si no deseas agregar uno ahora, deja todos estos campos vacios.</p>

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

        <label class="check-row">
          <input type="checkbox" formControlName="vehiculo_principal" />
          <span>Marcar como principal</span>
        </label>

        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>

      <section class="card inner">
        <h3>Vehiculos registrados</h3>
        <div *ngIf="loadingVehiculos" class="muted">Cargando vehículos...</div>
        <div *ngIf="!loadingVehiculos && vehiculos.length === 0" class="muted">Sin vehículos.</div>

        <table class="table" *ngIf="!loadingVehiculos && vehiculos.length > 0">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Placa</th>
              <th>Año</th>
              <th>Principal</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of vehiculos">
              <td>{{ v.marca || 'N/A' }}</td>
              <td>{{ v.modelo || 'N/A' }}</td>
              <td>{{ v.placa || 'N/A' }}</td>
              <td>{{ v.anio || 'N/A' }}</td>
              <td>{{ v.principal ? 'Si' : 'No' }}</td>
              <td>
                <button class="btn btn-ghost" (click)="editVehiculo(v)">Editar</button>
                <button class="btn btn-ghost" (click)="setPrincipal(v)">{{ v.principal ? 'Principal' : 'Hacer principal' }}</button>
                <button class="btn btn-danger" (click)="removeVehiculo(v)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>

    <ng-template #notFound>
      <div class="muted card page-block">Cliente no encontrado</div>
    </ng-template>
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
        margin-top: 1rem;
        display: flex;
        gap: 0.6rem;
      }
    `,
  ],
})
export class ClienteDetailComponent implements OnInit {
  clienteId = '';
  cliente: ClienteDto | undefined;
  vehiculos: VehiculoDto[] = [];
  loading = false;
  loadingVehiculos = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
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
    private readonly route: ActivatedRoute,
    private readonly api: ClienteApiService,
    private readonly fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      return;
    }

    this.clienteId = id;
    this.api.get(id).subscribe({
      next: (c) => {
        this.cliente = c;
        this.form.patchValue({
          nombre: c.nombre || '',
          email: c.email || '',
          telefono: c.telefono || '',
          activo: c.activo !== false,
        });
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar el cliente.';
      },
    });

    this.loadVehiculos(id);
  }

  loadVehiculos(id: string) {
    this.loadingVehiculos = true;
    this.api.listVehiculos(id).subscribe({
      next: (rows) => {
        this.vehiculos = rows || [];
        this.loadingVehiculos = false;
      },
      error: () => (this.loadingVehiculos = false),
    });
  }

  saveCliente(): void {
    if (!this.cliente || this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const raw = this.form.getRawValue();
    const clientePayload = {
      nombre: raw.nombre.trim(),
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
    const markPrincipal = !!raw.vehiculo_principal;

    this.api.update(this.cliente.id, clientePayload).subscribe({
      next: (updated) => {
        this.cliente = updated;

        if (!hasVehiculo) {
          this.loading = false;
          this.form.patchValue({
            vehiculo_marca: '',
            vehiculo_modelo: '',
            vehiculo_placa: '',
            vehiculo_anio: null,
            vehiculo_principal: true,
          });
          return;
        }

        this.api.createVehiculo(this.clienteId, vehiculoPayload).subscribe({
          next: (vehiculo) => {
            if (!markPrincipal) {
              this.loading = false;
              this.loadVehiculos(this.clienteId);
              this.form.patchValue({
                vehiculo_marca: '',
                vehiculo_modelo: '',
                vehiculo_placa: '',
                vehiculo_anio: null,
                vehiculo_principal: true,
              });
              return;
            }

            this.api.setPrincipal(vehiculo.id).subscribe({
              next: () => {
                this.loading = false;
                this.loadVehiculos(this.clienteId);
                this.form.patchValue({
                  vehiculo_marca: '',
                  vehiculo_modelo: '',
                  vehiculo_placa: '',
                  vehiculo_anio: null,
                  vehiculo_principal: true,
                });
              },
              error: (error) => {
                this.loading = false;
                this.errorMsg = error?.error?.detail || 'Cliente actualizado, pero no se pudo marcar el vehiculo como principal.';
              },
            });
          },
          error: (error) => {
            this.loading = false;
            this.errorMsg = error?.error?.detail || 'Cliente actualizado, pero no se pudo registrar el vehiculo.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo actualizar el cliente.';
      },
    });
  }

  setPrincipal(v: VehiculoDto) {
    this.api.setPrincipal(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  editVehiculo(v: VehiculoDto): void {
    const marca = prompt('Marca', v.marca || '') ?? v.marca ?? '';
    const modelo = prompt('Modelo', v.modelo || '') ?? v.modelo ?? '';
    const placa = prompt('Placa', v.placa || '') ?? v.placa ?? '';
    const anioInput = prompt('Año', v.anio ? String(v.anio) : '') ?? (v.anio ? String(v.anio) : '');
    const anio = anioInput.trim() ? Number(anioInput) : undefined;

    this.api.updateVehiculo(v.id, {
      marca: marca || undefined,
      modelo: modelo || undefined,
      placa: placa || undefined,
      anio: Number.isNaN(anio) ? undefined : anio,
    }).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  removeVehiculo(v: VehiculoDto) {
    if (!window.confirm(`Eliminar vehículo ${v.placa || v.id}?`)) {
      return;
    }
    this.api.deleteVehiculo(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  private optional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }
}
