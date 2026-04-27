from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import AsignacionServicio, Empleado, Incidente


def create_asignacion(
    db: Session,
    incidente: Incidente,
    empleado_id: str,
    servicio_id: str | None = None,
    empresa_id: str | None = None,
    tiempo_estimado_llegada_minutos: int | None = None,
) -> AsignacionServicio:
    empleado = db.get(Empleado, empleado_id)
    if not empleado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")

    obj = AsignacionServicio(
        id=str(uuid.uuid4()),
        incidente_id=incidente.id,
        empleado_id=empleado.id,
        servicio_id=servicio_id or "",
        empresa_id=empresa_id or empleado.empresa_id,
        estado_tarea="asignada",
        tiempo_estimado_llegada_minutos=tiempo_estimado_llegada_minutos,
        fecha_asignacion=datetime.now(timezone.utc),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_active_asignacion_for_incidente(db: Session, incidente_id: str) -> AsignacionServicio | None:
    # look for active assignment for the incidente
    q = db.execute(
        "SELECT * FROM asignacion_servicio WHERE incidente_id = :inc AND estado_tarea IN ('asignada','aceptada','en_proceso') LIMIT 1",
        {"inc": incidente_id},
    )
    row = q.first()
    if not row:
        return None
    # map row to ORM object
    return db.get(AsignacionServicio, row.id)


__all__ = ["create_asignacion", "get_active_asignacion_for_incidente"]
