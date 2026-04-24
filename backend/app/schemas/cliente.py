from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel


class ClienteBase(BaseModel):
    nombre: str
    email: EmailStr | None = None
    telefono: str | None = None
    activo: bool | None = True


class ClienteCreate(ClienteBase):
    pass
# Use ClienteCreate for registration payload; do not accept password from client.


class ClienteLogin(BaseModel):
    username: str
    password: str


class ClienteUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    telefono: str | None = None
    activo: bool | None = None


class ClienteOut(ORMModel):
    id: str
    nombre: str
    email: str | None
    telefono: str | None
    activo: bool
