from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Cliente, Diagnostico, Empleado, Evidencia, Incidente, Vehiculo
from app.schemas.incidente import IncidenteCreate, IncidenteUpdate, TecnicoCercanoOut, TecnicoUbicacionUpdate
from app.services.asignacion_service import create_asignacion, get_active_asignacion_for_incidente
from app.services.id_utils import get_next_numeric_id


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def list_incidentes(db: Session) -> list[Incidente]:
    # existing DB doesn't have `creado_en` on incidente; order by id desc instead
    return db.execute(select(Incidente).order_by(Incidente.id.desc())).scalars().all()


def create_incidente(db: Session, payload: IncidenteCreate, cliente_id: str | None = None) -> Incidente:
    # Create incidente with provided cliente_id (DB uses integer PK for id)
    obj = Incidente(
        id=get_next_numeric_id(db, Incidente),
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        estado="pendiente",
        prioridad=payload.prioridad,
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
    # ETA / tiempo estimado now belongs to asignacion_servicio and is not
    # stored on the incidente record.

    db.add(incidente)
    db.commit()
    db.refresh(incidente)
    return incidente


def assign_tecnico(db: Session, incidente: Incidente, empleado_id: str, actor: Empleado | None = None) -> Incidente:
    # Create an operational assignment record (asignacion_servicio) instead of
    # mutating the incidente table. The assignment service will validate the
    # empleado and set empresa_id automatically.
    empleado = db.get(Empleado, empleado_id)
    if not empleado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    if actor and actor.empresa_id != empleado.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes asignar técnicos de otro taller")

    asign = create_asignacion(db, incidente=incidente, empleado_id=empleado.id, empresa_id=empleado.empresa_id)
    if incidente.estado == "pendiente":
        incidente.estado = "en_proceso"
        db.add(incidente)
        db.commit()
        db.refresh(incidente)

    # return incidente (unchanged except estado)
    return incidente


def update_tecnico_ubicacion(db: Session, empleado: Empleado, payload: TecnicoUbicacionUpdate) -> Empleado:
    empleado.latitud_actual = payload.latitud
    empleado.longitud_actual = payload.longitud
    empleado.ubicacion_actualizada_en = datetime.now(timezone.utc)
    if payload.disponible is not None:
        empleado.disponible = payload.disponible

    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def update_incidente_tecnico_ubicacion(db: Session, incidente: Incidente, empleado: Empleado, payload: TecnicoUbicacionUpdate) -> Empleado:
    # Only the active assigned technician for the incidente may update location
    asign = get_active_asignacion_for_incidente(db, incidente.id)
    if not asign or asign.empleado_id != empleado.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el técnico asignado puede actualizar esta ubicación")
    return update_tecnico_ubicacion(db, empleado, payload)


def get_incidente_tracking(db: Session, incidente: Incidente) -> dict:
    asign = get_active_asignacion_for_incidente(db, incidente.id)
    tecnico = db.get(Empleado, asign.empleado_id) if asign else None

    return {
        "incidente_id": incidente.id,
        "estado": incidente.estado,
        "latitud_incidente": float(incidente.latitud) if incidente.latitud is not None else None,
        "longitud_incidente": float(incidente.longitud) if incidente.longitud is not None else None,
        "asignacion_id": asign.id if asign else None,
        "empleado_id": tecnico.id if tecnico else None,
        "tecnico_nombre": tecnico.nombre_completo if tecnico else None,
        "tecnico_latitud": float(tecnico.latitud_actual) if tecnico and tecnico.latitud_actual is not None else None,
        "tecnico_longitud": float(tecnico.longitud_actual) if tecnico and tecnico.longitud_actual is not None else None,
        "tecnico_disponible": tecnico.disponible if tecnico else None,
        "tecnico_ubicacion_actualizada_en": tecnico.ubicacion_actualizada_en.isoformat() if tecnico and tecnico.ubicacion_actualizada_en else None,
    }


def list_tecnicos_cercanos(
    db: Session,
    latitud: float,
    longitud: float,
    radio_km: float,
    empresa_id: str | None = None,
) -> list[TecnicoCercanoOut]:
    stmt = select(Empleado).where(Empleado.latitud_actual.isnot(None), Empleado.longitud_actual.isnot(None))
    if empresa_id:
        stmt = stmt.where(Empleado.empresa_id == empresa_id)

    candidatos = db.execute(stmt).scalars().all()
    resultados: list[TecnicoCercanoOut] = []

    for tecnico in candidatos:
        tecnico_lat = float(tecnico.latitud_actual)
        tecnico_lon = float(tecnico.longitud_actual)
        distancia = _distance_km(latitud, longitud, tecnico_lat, tecnico_lon)
        if distancia <= radio_km:
            resultados.append(
                TecnicoCercanoOut(
                    empleado_id=tecnico.id,
                    nombre_completo=tecnico.nombre_completo,
                    latitud=tecnico_lat,
                    longitud=tecnico_lon,
                    distancia_km=round(distancia, 3),
                    disponible=bool(tecnico.disponible),
                )
            )

    resultados.sort(key=lambda item: item.distancia_km)
    return resultados


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
    "assign_tecnico",
    "update_tecnico_ubicacion",
    "update_incidente_tecnico_ubicacion",
    "get_incidente_tracking",
    "list_tecnicos_cercanos",
    "add_diagnostico",
    "add_evidencia",
]
