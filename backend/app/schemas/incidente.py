from pydantic import BaseModel
from app.schemas.common import ORMModel
from typing import List


class IncidenteCreate(BaseModel):
    vehiculo_id: str | None = None
    tipo: str | None = None
    descripcion: str | None = None
    latitud: float | None = None
    longitud: float | None = None


class IncidenteUpdate(BaseModel):
    estado: str | None = None
    prioridad: str | None = None
    descripcion: str | None = None
    tiempo_estimado_minutos: int | None = None


class EvidenciaOut(ORMModel):
    id: str
    incidente_id: str
    tipo: str
    url_archivo: str | None
    texto: str | None


class DiagnosticoOut(ORMModel):
    id: str
    incidente_id: str
    clasificacion: int | None
    resumen: str | None
    prioridad: int | None
    creado_en: str


class IncidenteOut(ORMModel):
    id: str
    cliente_id: str | None
    vehiculo_id: str | None
    tipo: str | None
    descripcion: str | None
    estado: str
    prioridad: int | None
    latitud: float | None
    longitud: float | None
    tiempo_estimado_minutos: int | None
    creado_en: str
    evidencias: List[EvidenciaOut] | None = []
    diagnosticos: List[DiagnosticoOut] | None = []
