from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Incidente, Evidencia, Diagnostico, Vehiculo, Cliente
from app.schemas.incidente import IncidenteCreate, IncidenteUpdate


def list_incidentes(db: Session) -> list[Incidente]:
    # existing DB doesn't have `creado_en` on incidente; order by id desc instead
    return db.execute(select(Incidente).order_by(Incidente.id.desc())).scalars().all()


def create_incidente(db: Session, payload: IncidenteCreate, cliente_id: str | None = None) -> Incidente:
    obj = Incidente(
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        estado="pendiente",
        prioridad=payload.prioridad if hasattr(payload, 'prioridad') else None,
        latitud=payload.latitud,
        longitud=payload.longitud,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_incidente_or_404(db: Session, incidente_id: str) -> Incidente:
    # incidente.id in DB is integer; allow passing str or int
    try:
        key = int(incidente_id)
    except Exception:
        key = incidente_id
    obj = db.get(Incidente, key)
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
    # note: tiempo_estimado_minutos not present in current DB schema; skip if provided

    db.add(incidente)
    db.commit()
    db.refresh(incidente)
    return incidente


def add_diagnostico(db: Session, incidente: Incidente, clasificacion: int | None = None, resumen: str | None = None, prioridad: int | None = None) -> Diagnostico:
    diag = Diagnostico(
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
    ev = Evidencia(incidente_id=incidente.id, tipo=tipo, url_archivo=url_archivo, texto=texto)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def list_evidencias_for_incidente(db: Session, incidente_id: str) -> list[Evidencia]:
    stmt = select(Evidencia).where(Evidencia.incidente_id == incidente_id)
    return db.execute(stmt).scalars().all()


def get_evidencia_or_404(db: Session, evidencia_id: str) -> Evidencia:
    obj = db.get(Evidencia, evidencia_id)
    if not obj:
        raise ValueError("Evidencia no encontrada")
    return obj


def delete_evidencia(db: Session, evidencia: Evidencia) -> None:
    db.delete(evidencia)
    db.commit()


def list_diagnosticos_for_incidente(db: Session, incidente_id: str) -> list[Diagnostico]:
    stmt = select(Diagnostico).where(Diagnostico.incidente_id == incidente_id)
    return db.execute(stmt).scalars().all()


def get_diagnostico_or_404(db: Session, diagnostico_id: str) -> Diagnostico:
    obj = db.get(Diagnostico, diagnostico_id)
    if not obj:
        raise ValueError("Diagnostico no encontrado")
    return obj


def update_diagnostico(db: Session, diagnostico: Diagnostico, clasificacion: int | None = None, resumen: str | None = None, prioridad: int | None = None) -> Diagnostico:
    if clasificacion is not None:
        diagnostico.clasificacion = clasificacion
    if resumen is not None:
        diagnostico.resumen = resumen
    if prioridad is not None:
        diagnostico.prioridad = prioridad
    db.add(diagnostico)
    db.commit()
    db.refresh(diagnostico)
    return diagnostico


__all__ = [
    "list_incidentes",
    "create_incidente",
    "get_incidente_or_404",
    "update_incidente",
    "add_diagnostico",
    "add_evidencia",
]
