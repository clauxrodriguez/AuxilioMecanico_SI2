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
    is_active: bool


class EmpleadoBase(BaseModel):
    ci: str
    nombre_completo: str
    direccion: str | None = None
    telefono: str | None = None
    sueldo: Decimal | None = Decimal("0")
    cargo: str | None = None
    roles: list[str] = Field(default_factory=list)


class EmpleadoCreate(EmpleadoBase):
    email: EmailStr
    send_credentials: bool = False


class EmpleadoInvitationActivateRequest(BaseModel):
    token: str
    username: str
    password: str


class EmpleadoUpdate(BaseModel):
    ci: str | None = None
    nombre_completo: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    sueldo: Decimal | None = None
    cargo: str | None = None
    email: EmailStr | None = None
    roles: list[str] | None = None


class EmpleadoOut(ORMModel):
    id: str
    usuario: UsuarioOut
    ci: str
    nombre_completo: str
    direccion: str | None
    telefono: str | None
    sueldo: Decimal
    cargo: str | None
    empresa: str
    foto_perfil: str | None
    roles_asignados: list[RoleOut]
    cargo_nombre: str | None
