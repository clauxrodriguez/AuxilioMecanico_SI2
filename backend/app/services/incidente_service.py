from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Cliente, Diagnostico, Empleado, Evidencia, Incidente, Vehiculo
from app.schemas.incidente import IncidenteCreate, IncidenteUpdate, TecnicoCercanoOut, TecnicoUbicacionUpdate


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
    return db.execute(select(Incidente).order_by(Incidente.creado_en.desc())).scalars().all()


def create_incidente(db: Session, payload: IncidenteCreate, cliente_id: str | None = None) -> Incidente:
    now = datetime.now(timezone.utc)

    resolved_cliente_id = cliente_id
    if not resolved_cliente_id and payload.vehiculo_id:
        vehiculo = db.get(Vehiculo, payload.vehiculo_id)
        if vehiculo:
            resolved_cliente_id = vehiculo.cliente_id

    obj = Incidente(
        id=str(uuid.uuid4()),
        cliente_id=resolved_cliente_id,
        vehiculo_id=payload.vehiculo_id,
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        estado="pendiente",
        prioridad=payload.prioridad,
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


def assign_tecnico(db: Session, incidente: Incidente, empleado_id: str, actor: Empleado | None = None) -> Incidente:
    empleado = db.get(Empleado, empleado_id)
    if not empleado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    if actor and actor.empresa_id != empleado.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes asignar técnicos de otro taller")

    incidente.empleado_asignado_id = empleado.id
    if incidente.estado == "pendiente":
        incidente.estado = "en_proceso"

    db.add(incidente)
    db.commit()
    db.refresh(incidente)
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
    if incidente.empleado_asignado_id != empleado.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el técnico asignado puede actualizar esta ubicación")
    return update_tecnico_ubicacion(db, empleado, payload)


def get_incidente_tracking(db: Session, incidente: Incidente) -> dict:
    tecnico = db.get(Empleado, incidente.empleado_asignado_id) if incidente.empleado_asignado_id else None

    return {
        "incidente_id": incidente.id,
        "estado": incidente.estado,
        "latitud_incidente": float(incidente.latitud) if incidente.latitud is not None else None,
        "longitud_incidente": float(incidente.longitud) if incidente.longitud is not None else None,
        "empleado_asignado_id": incidente.empleado_asignado_id,
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
    "assign_tecnico",
    "update_tecnico_ubicacion",
    "update_incidente_tecnico_ubicacion",
    "get_incidente_tracking",
    "list_tecnicos_cercanos",
    "add_diagnostico",
    "add_evidencia",
]
