import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <h2>Configuración</h2>
        <p class="muted">Opciones de configuración del panel (placeholder).</p>
      </header>
      <div class="inner">
        <p>Funcionalidad no implementada aún.</p>
      </div>
    </section>
  `,
})
export class ConfiguracionComponent {}
