from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Incidente, Evidencia, Diagnostico, Vehiculo, Cliente
from app.schemas.incidente import IncidenteCreate, IncidenteUpdate


def list_incidentes(db: Session) -> list[Incidente]:
    return db.execute(select(Incidente).order_by(Incidente.creado_en.desc())).scalars().all()


def create_incidente(db: Session, payload: IncidenteCreate, cliente_id: str | None = None) -> Incidente:
    now = datetime.now(timezone.utc)
    obj = Incidente(
        id=str(uuid.uuid4()),
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        estado="pendiente",
        prioridad=payload.prioridad if hasattr(payload, 'prioridad') else None,
        latitud=payload.latitud,
        longitud=payload.longitud,
        creado_en=now,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_incidente_or_404(db: Session, incidente_id: str) -> Incidente:
    obj = db.get(Incidente, incidente_id)
    if not obj:
        raise ValueError("Incidente no encontrado")
    return obj


def update_incidente(db: Session, incidente: Incidente, payload: IncidenteUpdate) -> Incidente:
    if payload.estado is not None:
        incidente.estado = payload.estado
    if payload.prioridad is not None:
        incidente.prioridad = payload.prioridad
    if payload.descripcion is not None:
        incidente.descripcion = payload.descripcion
    if payload.tiempo_estimado_minutos is not None:
        incidente.tiempo_estimado_minutos = payload.tiempo_estimado_minutos

    db.add(incidente)
    db.commit()
    db.refresh(incidente)
    return incidente


def add_diagnostico(db: Session, incidente: Incidente, clasificacion: int | None = None, resumen: str | None = None, prioridad: int | None = None) -> Diagnostico:
    diag = Diagnostico(
        id=str(uuid.uuid4()),
        incidente_id=incidente.id,
        clasificacion=clasificacion,
        resumen=resumen,
        prioridad=prioridad,
        creado_en=datetime.now(timezone.utc),
    )
    db.add(diag)
    db.commit()
    db.refresh(diag)
    return diag


def add_evidencia(db: Session, incidente: Incidente, tipo: str, url_archivo: str | None = None, texto: str | None = None) -> Evidencia:
    ev = Evidencia(id=str(uuid.uuid4()), incidente_id=incidente.id, tipo=tipo, url_archivo=url_archivo, texto=texto)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


__all__ = [
    "list_incidentes",
    "create_incidente",
    "get_incidente_or_404",
    "update_incidente",
    "add_diagnostico",
    "add_evidencia",
]
