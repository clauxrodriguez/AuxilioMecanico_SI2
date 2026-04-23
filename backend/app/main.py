from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.routers import auth, empleados, permisos, roles, clientes, vehiculos, incidentes
from app.routers import auth, cargos, empleados, permisos, roles, servicios


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

app.include_router(auth.router)
app.include_router(auth.router, prefix="/api/auth")
app.include_router(cargos.router)
app.include_router(cargos.router, prefix="/api")
app.include_router(permisos.router)
app.include_router(permisos.router, prefix="/api")
app.include_router(roles.router)
app.include_router(roles.router, prefix="/api")
app.include_router(empleados.router)
app.include_router(clientes.router)
app.include_router(vehiculos.router)
app.include_router(incidentes.router)
app.include_router(empleados.router, prefix="/api")
app.include_router(servicios.router)
app.include_router(servicios.router, prefix="/api")
media_root = Path(settings.media_root)
media_root.mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url, StaticFiles(directory=media_root), name="media")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
