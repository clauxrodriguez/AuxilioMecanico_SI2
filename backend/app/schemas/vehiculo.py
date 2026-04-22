from pydantic import BaseModel

from app.schemas.common import ORMModel


class VehiculoBase(BaseModel):
    anio: int | None = None
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None


class VehiculoCreate(VehiculoBase):
    pass


class VehiculoUpdate(BaseModel):
    anio: int | None = None
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    principal: bool | None = None


class VehiculoOut(ORMModel):
    id: str
    cliente_id: str
    anio: int | None
    placa: str | None
    marca: str | None
    modelo: str | None
    principal: bool
