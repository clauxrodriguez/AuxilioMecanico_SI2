import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <h2>Reportes</h2>
        <p class="muted">Reportes y estadísticas (placeholder).</p>
      </header>
      <div class="inner">
        <p>Funcionalidad no implementada aún.</p>
      </div>
    </section>
  `,
})
export class ReportesComponent {}
