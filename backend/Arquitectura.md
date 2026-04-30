Arquitectura bien estructurada en 4 capas limpias:                                                        
                                                                                                            
  main.py → routers/ → services/ → db/models.py
                  ↑ schemas/ (validación I/O)
                  ↑ deps/auth.py (autenticación/permisos)

  Es un sistema SaaS multi-tenant completo con:
  - Gestión de talleres, empleados/técnicos, clientes, vehículos
  - Tracking en tiempo real (WebSocket + geolocalización Haversine)
  - Evidencias multimedia (Cloudinary + transcripción OpenAI Whisper)
  - Notificaciones push (Firebase FCM)
  - Planes de suscripción (Basico/Profesional/Empresarial)

  ---
  Endpoints que faltan

  ┌────────────────┬──────────────────────────────────────────────────────────────────────────────┐
  │      Área      │                              Endpoint faltante                               │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Empleados      │ GET /api/empleados/me — empleado ve su propio perfil                         │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Empleados      │ PATCH /api/empleados/me/ubicacion — duplica lógica de /tecnicos/mi-ubicacion │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Clientes       │ GET /api/clientes/{id}/incidentes — historial de incidentes por cliente      │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Incidentes     │ PATCH /{id}/cancelar — cancelar incidente con motivo                         │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Incidentes     │ GET / filtrado por estado, cliente, técnico (actualmente sin filtros)        │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Pagos          │ GET /api/pagos/cliente/me — historial de pagos del cliente                   │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Suscripciones  │ CRUD completo — no hay endpoints para gestionar planes                       │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Notificaciones │ GET/PATCH /api/notificaciones — listar/marcar como leídas                    │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Auth           │ POST /password/reset/ — recuperación de contraseña por email                 │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Auth           │ PATCH /me/password — cambio de contraseña                                    │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Reportes       │ GET /api/reportes/incidentes, /reportes/pagos — protegidos por plan          │
  └────────────────┴──────────────────────────────────────────────────────────────────────────────┘

  ---
  Errores potenciales

  Críticos:

  1. Firebase rota — auxiliomecanico-f0789-firebase-adminsdk-fbsvc-64671a09f7.json fue borrado y hay un
  nuevo auxiliomecanico.json sin trackear. Si notification_service.py apunta al nombre viejo, las
  notificaciones push van a fallar en producción.
  2. Registro en 2 pasos deja datos huérfanos — Si el paso 1 (/register/company/) crea la Empresa pero el
  paso 2 falla o el token expira (30 min), queda una empresa sin admin en la BD sin limpieza.
  3. Verificación SMS sin proveedor real — send_verification_sms existe pero no hay credencial de ningún
  proveedor SMS (Twilio, etc.) en .env. El método probablemente falla silenciosamente.

  Importantes:

  4. Sin paginación en todos los listados (GET /api/empleados/, /incidentes/, etc.) — con volumen de datos
  real, las queries van a ser costosas.
  5. Sin rate limiting en POST /token/ ni POST /login — vulnerable a fuerza bruta.
  6. auxiliomecanico.json en git status como untracked — si tiene credenciales Firebase, no debería
  commitearse (agregar a .gitignore).
  7. CORS demasiado abierto — revisar que cors_origins en producción no sea *.

  Menores:

  8. id_utils.py con get_next_numeric_id parece conflictuar con el uso de UUIDs en todos los modelos —
  posible lógica muerta o inconsistente.
  9. Los endpoints de pagos tienen prefijos mixtos: algunos en pagos.router sin prefix, el de creación en
  incidentes.router — puede causar confusión en el cliente mobile.