# Backend FastAPI - Gestion de Usuarios

API de gestion de usuarios para AuxilioMecanico, construida con FastAPI + SQLAlchemy + Alembic.

## Estructura actual

```text
backend/
  alembic.ini
  requirements.txt
  .env.example
  alembic/
    env.py
    versions/
      20260415_01_initial_schema.py
      20260415_02_seed_default_permissions.py
  app/
    main.py
    core/
      config.py
      security.py
    db/
      models.py
      session.py
    deps/
      auth.py
    routers/
      auth.py
      empleados.py
      permisos.py
      roles.py
    schemas/
      auth.py
      common.py
      empleado.py
      permiso.py
      register.py
      role.py
      theme.py
    services/
      auth_service.py
      file_storage.py
      permission_service.py
      user_management.py
```

## Requisitos

1. Python 3.11 o superior.
2. PostgreSQL disponible.
3. Estar ubicado en la carpeta `backend/` para ejecutar los comandos.

## Instalacion y configuracion (paso a paso)

1. Entrar a la carpeta del backend.

```powershell
cd backend
```

2. Crear y activar entorno virtual.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Instalar dependencias.

```powershell
pip install -r requirements.txt
```

4. Crear archivo de variables de entorno.

```powershell
Copy-Item .env.example .env
```

5. Ajustar valores importantes en `.env`:

- `DATABASE_URL`: conexion a PostgreSQL.
- `SECRET_KEY`: clave segura para JWT.
- `CORS_ORIGINS`: origenes permitidos del frontend.
- `MEDIA_ROOT`: ruta donde se guardan archivos subidos.
- `FRONTEND_BASE_URL`: URL del frontend para construir enlaces de invitacion.

## Configuracion SMTP (invitaciones de empleados)

Para que el correo de invitacion funcione, completa estas variables en `.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_USE_TLS`
- `SMTP_FROM_EMAIL`

Ejemplo (Gmail con App Password):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tu_correo@gmail.com
SMTP_PASSWORD=tu_app_password
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=tu_correo@gmail.com
FRONTEND_BASE_URL=http://localhost:4200
```

Notas:

- Con Gmail debes usar App Password (no la contrasena normal).
- Si `SMTP_HOST` esta vacio, el backend crea el empleado pero no envia correo.
- El enlace de invitacion usa la ruta frontend: `/activate-invite?token=...`.

## Migraciones (Alembic)

Aplicar migraciones pendientes:

```powershell
alembic upgrade head
```

Crear una nueva migracion (si cambias modelos):

```powershell
alembic revision --autogenerate -m "descripcion_del_cambio"
alembic upgrade head
```

## Ejecutar la API

Con el entorno virtual activo y desde `backend/`:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Endpoints principales

- Auth:
  - `POST /token/`
  - `POST /token/refresh/`
  - `POST /register/company/`
  - `POST /register/admin/`
  - `POST /employee-invitations/activate/`
  - `POST /register/`
  - `GET /my-permissions/`
- Empleados:
  - `GET /empleados/`
  - `GET /empleados/{empleado_id}/`
  - `POST /empleados/`
  - `PUT/PATCH /empleados/{empleado_id}/`
  - `DELETE /empleados/{empleado_id}/`
- Roles:
  - `GET /roles/`
  - `GET /roles/{role_id}/`
  - `POST /roles/`
  - `PUT/PATCH /roles/{role_id}/`
  - `DELETE /roles/{role_id}/`
- Permisos:
  - `GET /permisos/`
  - `GET /permisos/{permiso_id}/`
  - `POST /permisos/`
  - `PUT/PATCH /permisos/{permiso_id}/`
  - `DELETE /permisos/{permiso_id}/`

## Verificacion rapida

- Health check: `GET /health`
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Notas

- La app carga configuracion desde `.env`.
- Alembic toma la URL de base de datos desde `app/core/config.py`.
