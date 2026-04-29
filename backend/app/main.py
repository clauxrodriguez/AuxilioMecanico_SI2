from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    auth,
    cargos,
    empleados,
    permisos,
    roles,
    clientes,
    vehiculos,
    incidentes,
    servicios,
    empresa,
    pagos,
)


settings = get_settings()

app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose auth endpoints at both root (e.g. /token/) and under /api/auth (e.g. /api/auth/token/)
app.include_router(auth.router)
app.include_router(auth.router, prefix="/api/auth")

# Resource routers exposed under /api
# Note: `clientes` router already defines prefix "/api/clientes" so include it directly
app.include_router(clientes.router)
app.include_router(cargos.router, prefix="/api")
app.include_router(permisos.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(empleados.router, prefix="/api")
app.include_router(servicios.router, prefix="/api")
app.include_router(vehiculos.router, prefix="/api")
app.include_router(incidentes.router, prefix="/api")
app.include_router(empresa.router, prefix="/api")
app.include_router(pagos.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
