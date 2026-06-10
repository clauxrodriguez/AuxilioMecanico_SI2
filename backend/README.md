# Backend - AuxilioMecánico SI2

Este es el backend principal de la aplicación **AuxilioMecánico**, desarrollado en **FastAPI**, **SQLAlchemy** y **Alembic**. Proporciona toda la lógica de negocio, autenticación de usuarios, gestión de incidentes y seguimiento en tiempo real de técnicos y servicios.

---

## 📚 Documentación y Referencias

Para un entendimiento completo del sistema, la arquitectura y los flujos de trabajo, consulta los siguientes documentos clave:

- [**FLUJOS_OPERATIVOS.md**](./FLUJOS_OPERATIVOS.md): Detalla cómo se mueven los datos a través del sistema, desde el registro de un cliente hasta el cierre de un servicio de auxilio mecánico, pasando por la asignación de técnicos y el seguimiento GPS en tiempo real.
- [**SCHEMA_REFERENCE.md**](./SCHEMA_REFERENCE.md): Contiene el modelo completo de la base de datos, relaciones entre tablas (usuarios, clientes, empresas, empleados, incidentes, asignaciones, etc.), enumeraciones de estado y validaciones de negocio.
- [**MIGRATION_FCM_TOKEN.md**](./MIGRATION_FCM_TOKEN.md): Explica la migración específica realizada para añadir soporte de notificaciones push (FCM) a los clientes.

---

## 🚀 Funcionalidades Principales (Basado en los Routers)

El sistema expone las siguientes funcionalidades a través de sus rutas (routers):

### 1. 🔐 Autenticación y Registro (`autenticacion_router.py`)
Manejo seguro de sesiones y usuarios con JWT.
- **Login y Tokens:** Obtención (`/token/`) y refresco (`/token/refresh/`) de tokens JWT.
- **Registro Multipaso:** Registro de empresas (`/register/company/`), administradores (`/register/admin/`) y clientes (`/register/client/`).
- **Invitaciones:** Activación de cuentas de empleados por invitación (`/employee-invitations/activate/`).
- **Notificaciones Push:** Actualización del FCM Token (`/fcm-token`) para recibir alertas en la app móvil.
- **Sesión actual:** Obtención de información del usuario autenticado y sus permisos (`/me`, `/my-permissions/`).

### 2. 🆘 Gestión de Incidentes y Tracking (`incidentes_router.py`)
El núcleo operativo de la plataforma para atender emergencias.
- **Creación y Listado:** Los clientes pueden crear incidentes de auxilio mecánico con ubicación, tipo de problema y evidencias.
- **Técnicos Cercanos:** Búsqueda de técnicos disponibles en base a la ubicación (`/tecnicos/disponibles`).
- **Asignación Operativa:** Los despachadores asignan un técnico a un incidente (`/asignacion`).
- **Seguimiento en Tiempo Real (GPS):** 
  - Actualización constante de la ubicación del técnico (`/tecnicos/mi-ubicacion`, `/tecnico/ubicacion`).
  - Consulta de tracking y **WebSockets** (`/ws/tracking`) para seguimiento en vivo en el mapa.
- **Transiciones de Estado:** Actualización del estado del incidente (pendiente, en camino, atendido, etc.).
- **Diagnósticos y Evidencias:** Los técnicos pueden subir diagnósticos, textos, fotos (con soporte de subida a Cloudinary/S3) y notas de audio que se transcriben automáticamente.

### 3. 👥 Clientes y sus Vehículos (`clientes_router.py` y `vehiculos_router.py`)
- **Gestión de Perfil:** Visualización y actualización del perfil del cliente autenticado (`/me`).
- **Vehículos:** CRUD de vehículos del cliente, permitiendo definir un vehículo como `principal`.
- **Historial:** Consulta del historial de servicios del cliente y validación SMS.
- **Operativo Vehículos:** Gestión de vehículos desde el backoffice (actualización, eliminación y listado de vehículos atendidos).

### 4. 🏢 Empresas, Empleados y Cargos (`empresas_router.py`, `empleados_router.py`, `cargos_router.py`)
- **Gestión del Taller:** Información de la empresa/taller prestador del servicio.
- **Personal:** CRUD de empleados, asignación de cargos, definición de sueldos y disponibilidad.
- **Cargos:** Gestión del catálogo de cargos del taller.

### 5. 🛠️ Servicios Ofrecidos (`servicios_router.py`)
- **Catálogo de Servicios:** Gestión de los tipos de auxilio mecánico que la empresa provee (Grúa, Cambio de Batería, Pinchazo, Mecánica General, etc.).

### 6. 🛡️ Roles y Permisos (`roles_router.py`, `permisos_router.py`)
- Sistema de control de acceso basado en roles (RBAC).
- Asignación de permisos granulares a roles y roles a empleados.

### 7. 💳 Pagos y 🔔 Notificaciones (`pagos_router.py`, `notificaciones_router.py`)
- **Pagos:** Flujo de creación, listado, confirmación y rechazo de pagos asociados a asignaciones de servicio.
- **Alertas:** Manejo de notificaciones en el sistema para eventos importantes (asignación de técnico, servicio completado, etc.).

---

## 💻 Instalación y Configuración Local

### Requisitos Previos
1. **Python 3.10+**
2. **PostgreSQL** instalado y corriendo.
3. Estar ubicado en la carpeta `backend/`.

### Pasos

1. **Entorno Virtual**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Instalar Dependencias**
   ```powershell
   pip install -r requirements.txt
   # Instalar utilidades multimedia
   pip install cloudinary openai python-multipart
   ```

3. **Variables de Entorno**
   Copia el archivo de ejemplo para crear tu configuración:
   ```powershell
   Copy-Item .env.example .env
   ```
   Asegúrate de configurar en el `.env`:
   - `DATABASE_URL`: Conexión a tu PostgreSQL.
   - `SECRET_KEY`: Clave secreta para JWT.
   - `SMTP_*`: Configuración de correo para enviar invitaciones a empleados.
   - Credenciales de Cloudinary (si usas subida de fotos en la nube).

4. **Base de Datos y Migraciones**
   Aplica el esquema y las migraciones iniciales a PostgreSQL:
   ```powershell
   alembic upgrade head
   ```

5. **Levantar el Servidor**
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

### 🧪 Verificación Rápida
- **Health check:** `GET http://localhost:8001/health`
- **Swagger UI (Documentación interactiva de la API):** `http://localhost:8001/docs`
- **ReDoc:** `http://localhost:8001/redoc`