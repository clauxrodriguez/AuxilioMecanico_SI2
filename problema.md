Problemas encontrados en la asignación de técnicos                                                            
                                                                                                                
  Backend                                                                                                       
                                                                                                                
  1. Raw SQL en asignacion_service.py:43 — Usa una query SQL cruda en lugar del ORM de SQLAlchemy. Además hay un
   riesgo de type mismatch: el incidente_id en BD es entero (generado con get_next_numeric_id) pero la          
  comparación puede fallar si se pasa como string.
                                                                                                                
  # Línea 43 - frágil y fuera de lugar                                                                          
  q = db.execute(
      "SELECT * FROM asignacion_servicio WHERE incidente_id = :inc ...",
      {"inc": incidente_id},
  )

  2. No verifica asignación duplicada — assign_tecnico en incidente_service.py:81 no chequea si ya existe una
  asignación activa para el incidente. Si se llama dos veces, crea dos registros en asignacion_servicio para el
  mismo incidente.

  3. No notifica al técnico asignado por FCM — El router incidentes_asignar_tecnico hace un broadcast por
  WebSocket pero no envía notificación push FCM al técnico específico que fue asignado. Solo notify_new_incident
   existe, que notifica a todos los técnicos disponibles de un nuevo incidente.

  4. Broadcast de ubicación ineficiente — tecnicos_actualizar_mi_ubicacion (router línea 159) carga hasta 1000
  incidentes y hace una query por cada uno para encontrar cuáles tiene asignados ese técnico. Debería consultar
  asignacion_servicio directamente.

  5. /estado sin autenticación — incidentes_patch_estado (línea 240) no tiene ningún Depends(get_current_user),
  cualquiera puede cambiar el estado de cualquier incidente.

  ---
  Frontend

  6. Strings con encoding roto — Varios mensajes en el template tienen caracteres mojibake (UTF-8 leído como
  Latin-1):
  - 'GeolocalizaciÃ³n no disponible' → debería ser 'Geolocalización no disponible'
  - 'UbicaciÃ³n actualizada' → 'Ubicación actualizada'
  - 'TÃ©cnico ... asignado' → 'Técnico ... asignado'

  7. Contador incorrecto — Línea 48 muestra {{ incidents.length }} solicitud(es) sin asignar pero incidents
  contiene todos los incidentes (pendientes + en_proceso + atendidos).

  8. verTracking usa window.location.href — Fuerza recarga completa de la página en lugar de navegar con el
  Router de Angular.

  ---
  ¿Quieres que corrija todos estos problemas, o prefieres que me enfoque en alguno específico primero? Los más
  críticos para el funcionamiento son el #1 (raw SQL con type mismatch), el #2 (asignación duplicada) y el #3
  (notificación FCM al técnico).
