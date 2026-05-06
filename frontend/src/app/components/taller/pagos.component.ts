import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <h2>Pagos / Comisiones</h2>
        <p class="muted">Gestión de pagos y comisiones (placeholder).</p>
      </header>
      <div class="inner">
        <p>Funcionalidad no implementada aún.</p>
      </div>
    </section>
  `,
})
export class PagosComponent {}
