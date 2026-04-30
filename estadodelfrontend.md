  ---                                                                                     
  Estado del Frontend — Análisis Funcional                                                                      
                                                                                                                
  ✅ Funciona correctamente                                                                                     
                                                                                                                
  ┌───────────────────┬────────────────────────────┬────────────────────────────────────────────────────────┐ 
  │      Sección      │            Ruta            │                         Estado                         │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Login             │ /login                     │ Completo — formulario reactivo, manejo de errores 401, │
  │                   │                            │  token en localStorage                                 │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Registro de       │ /register                  │ Completo — flujo 2 pasos: empresa + admin              │
  │ empresa           │                            │                                                        │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Activar           │ /activate-invite?token=... │ Completo — activa cuenta de empleado con token         │
  │ invitación        │                            │                                                        │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Empleados         │ /app/empleados             │ Completo — CRUD, roles, foto de perfil con FormData    │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Cargos            │ /app/cargos                │ Completo — CRUD básico                                 │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Roles             │ /app/roles                 │ Completo — CRUD con asignación de permisos             │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Permisos          │ /app/permisos              │ Completo — listado y gestión                           │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Servicios         │ /app/servicios             │ Completo — CRUD con toggle activo/inactivo             │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Clientes          │ /app/clientes              │ Completo — listado y detalle/edición                   │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Perfil de cliente │ /app/cliente/perfil        │ Completo — lazy loaded, gestión de vehículos propios   │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Vehículos (admin) │ /app/vehiculos             │ Completo — lista todos los vehículos de todos los      │
  │                   │                            │ clientes, edición, eliminar                            │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Ubicación del     │ /app/taller/ubicacion      │ Completo — mapa Leaflet, clic para ubicar,             │
  │ taller            │                            │ geolocalización, guarda en API                         │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Solicitudes de    │ /app/incidentes            │ Parcialmente funcional (ver detalles abajo)            │
  │ auxilio           │                            │                                                        │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Layout + Sidebar  │ —                          │ Completo — navegación, logout, notificaciones Firebase │
  │                   │                            │  en foreground                                         │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Auth Guard        │ —                          │ Funciona — redirige a /login si no hay token           │
  ├───────────────────┼────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Interceptor HTTP  │ —                          │ Funciona — agrega Bearer a todas las requests, logout  │
  │                   │                            │ en 401                                                 │
  └───────────────────┴────────────────────────────┴────────────────────────────────────────────────────────┘

  ---
  ⚠️  Parcialmente funcional

  Solicitudes de Auxilio (/app/incidentes)
  - ✅ Lista incidentes con estados y prioridades
  - ✅ Modal para asignar técnico con técnicos cercanos (geolocalización real)
  - ✅ Botón "Ver en mapa" → abre Google Maps
  - ✅ Actualizar ubicación del técnico (navigator.geolocation)
  - ✅ Llamadas HTTP reales al backend
  - ❌ "Ver tracking" navega a /tracking/{id} con window.location.href — esa ruta no existe en app.routes.ts,
  redirige al home
  - ❌ El contador dice X solicitud(es) sin asignar pero cuenta todos los incidentes, no solo los pendiente
  - ❌ Los textos en español están con encoding roto (mojibake): "GeolocalizaciÃ³n", "TÃ©cnico", etc.

  ---
  ❌ Sin implementar (placeholder)

  ┌────────────────────┬───────────────────────────┬─────────────────────────────────────────────────┐
  │      Sección       │           Ruta            │                     Estado                      │
  ├────────────────────┼───────────────────────────┼─────────────────────────────────────────────────┤
  │ Pagos / Comisiones │ /app/taller/pagos         │ Solo texto "Funcionalidad no implementada aún." │
  ├────────────────────┼───────────────────────────┼─────────────────────────────────────────────────┤
  │ Reportes           │ /app/taller/reportes      │ Solo texto "Funcionalidad no implementada aún." │
  ├────────────────────┼───────────────────────────┼─────────────────────────────────────────────────┤
  │ Configuración      │ /app/taller/configuracion │ Solo texto "Funcionalidad no implementada aún." │
  └────────────────────┴───────────────────────────┴─────────────────────────────────────────────────┘

  ---
  🐛 Bug crítico — Notificaciones push

  En MainLayoutComponent (línea 96), cuando llega una notificación FCM de incidente, navega a:
  this.router.navigate(['/app/incidentes', incidentId]);
  // Genera: /app/incidentes/42 — RUTA NO EXISTE
  Las rutas definidas son solo /app/incidentes e /app/incidentes/lista, sin parámetro :id. La navegación falla
  silenciosamente y el wildcard redirige al home.

  ---
  Resumen rápido

  Total rutas definidas:    20
  ✅ Funcionando bien:       14
  ⚠️   Con bugs menores:       1 (incidentes)
  ❌ Sin implementar:         3 (pagos, reportes, configuracion)
  🐛 Bug crítico:             1 (tracking + notif push van a ruta inexistente)

  ¿Quieres que corrija el bug del tracking/notificaciones, los textos con encoding roto, o implementamos alguna
  de las secciones faltantes?