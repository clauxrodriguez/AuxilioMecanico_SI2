from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel
from app.schemas.role import RoleOut


class UsuarioOut(ORMModel):
    id: int
    username: str
    first_name: str
    last_name: str
    email: str


class EmpleadoBase(BaseModel):
    ci: str
    apellido_p: str
    apellido_m: str
    direccion: str | None = None
    telefono: str | None = None
    sueldo: Decimal | None = Decimal("0")
    cargo: str | None = None
    departamento: str | None = None
    theme_preference: str | None = None
    theme_custom_color: str | None = None
    theme_glow_enabled: bool | None = None
    roles: list[str] = Field(default_factory=list)


class EmpleadoCreate(EmpleadoBase):
    username: str
    password: str
    first_name: str
    email: EmailStr


class EmpleadoUpdate(BaseModel):
    ci: str | None = None
    apellido_p: str | None = None
    apellido_m: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    sueldo: Decimal | None = None
    cargo: str | None = None
    departamento: str | None = None
    theme_preference: str | None = None
    theme_custom_color: str | None = None
    theme_glow_enabled: bool | None = None
    first_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    roles: list[str] | None = None


class EmpleadoOut(ORMModel):
    id: str
    usuario: UsuarioOut
    ci: str
    apellido_p: str
    apellido_m: str
    direccion: str | None
    telefono: str | None
    sueldo: Decimal
    cargo: str | None
    departamento: str | None
    empresa: str
    foto_perfil: str | None
    theme_preference: str | None
    theme_custom_color: str | None
    theme_glow_enabled: bool
    roles_asignados: list[RoleOut]
    cargo_nombre: str | None
    departamento_nombre: str | None
