from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class EmpresaOut(BaseModel):
    id: str
    nombre: str
    nit: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    class Config:
        orm_mode = True


class EmpresaUbicacionUpdate(BaseModel):
    latitud: float = Field(..., ge=-90.0, le=90.0)
    longitud: float = Field(..., ge=-180.0, le=180.0)
