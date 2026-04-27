from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_employee, get_current_user, require_permission
from app.schemas.incidente import (
    AsignarTecnicoRequest,
    IncidenteCreate,
    IncidenteOut,
    IncidenteTrackingOut,
    IncidenteUpdate,
    TecnicoCercanoOut,
    TecnicoUbicacionUpdate,
)
from app.services.cliente_service import get_cliente_for_user
from app.services.permission_service import resolve_employee
from app.services.incidente_service import (
    assign_tecnico,
    list_incidentes,
    list_tecnicos_cercanos,
    create_incidente,
    get_incidente_or_404,
    get_incidente_tracking,
    update_incidente,
    update_incidente_tecnico_ubicacion,
    update_tecnico_ubicacion,
    add_diagnostico,
    add_evidencia,
)
from app.services.tracking_ws import tracking_ws_manager

router = APIRouter(prefix="/incidentes", tags=["incidentes"])


@router.get("/", response_model=list[IncidenteOut])
def incidentes_list(db: Session = Depends(get_db)) -> list[IncidenteOut]:
    return list_incidentes(db)


@router.get("/tecnicos/cercanos", response_model=list[TecnicoCercanoOut])
def tecnicos_cercanos(
    latitud: float = Query(..., ge=-90, le=90),
    longitud: float = Query(..., ge=-180, le=180),
    radio_km: float = Query(default=5, gt=0, le=100),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TecnicoCercanoOut]:
    actor = resolve_employee(db, user)
    empresa_id = None if user.is_staff else (actor.empresa_id if actor else None)
    return list_tecnicos_cercanos(db, latitud=latitud, longitud=longitud, radio_km=radio_km, empresa_id=empresa_id)


@router.post("/", response_model=IncidenteOut, status_code=status.HTTP_201_CREATED)
def incidentes_create(payload: IncidenteCreate, user=Depends(get_current_user), db: Session = Depends(get_db)) -> IncidenteOut:
    cliente_id = None
    cliente = get_cliente_for_user(db, user.id)
    if cliente:
        cliente_id = cliente.id

    inc = create_incidente(db, payload, cliente_id=cliente_id)
    return inc


@router.post("/{incidente_id}/asignacion", response_model=IncidenteOut)
async def incidentes_asignar_tecnico(
    incidente_id: str,
    payload: AsignarTecnicoRequest,
    user=Depends(require_permission("manage_incidentes")),
    db: Session = Depends(get_db),
) -> IncidenteOut:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    actor = resolve_employee(db, user)
    updated = assign_tecnico(db, inc, payload.empleado_id, actor=actor)
    tracking = get_incidente_tracking(db, updated)
    await tracking_ws_manager.broadcast(
        updated.id,
        {
            "event": "assignment_updated",
            "tracking": tracking,
        },
    )
    return updated


@router.get("/{incidente_id}/", response_model=IncidenteOut)
def incidentes_retrieve(incidente_id: str, db: Session = Depends(get_db)) -> IncidenteOut:
    try:
        return get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")


@router.patch("/{incidente_id}/", response_model=IncidenteOut)
async def incidentes_update(incidente_id: str, payload: IncidenteUpdate, user=Depends(require_permission("manage_incidentes")), db: Session = Depends(get_db)) -> IncidenteOut:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    updated = update_incidente(db, inc, payload)
    tracking = get_incidente_tracking(db, updated)
    await tracking_ws_manager.broadcast(
        updated.id,
        {
            "event": "incident_updated",
            "tracking": tracking,
        },
    )
    return updated


@router.patch("/tecnicos/mi-ubicacion", response_model=dict)
async def tecnicos_actualizar_mi_ubicacion(
    payload: TecnicoUbicacionUpdate,
    empleado=Depends(get_current_employee),
    db: Session = Depends(get_db),
) -> dict:
    updated = update_tecnico_ubicacion(db, empleado, payload)

    incidentes_asignados = list_incidentes(db)
    for inc in incidentes_asignados:
        if inc.empleado_asignado_id != updated.id:
            continue

        tracking = get_incidente_tracking(db, inc)
        await tracking_ws_manager.broadcast(
            inc.id,
            {
                "event": "technician_location_updated",
                "tracking": tracking,
            },
        )

    return {
        "empleado_id": updated.id,
        "latitud": float(updated.latitud_actual) if updated.latitud_actual is not None else None,
        "longitud": float(updated.longitud_actual) if updated.longitud_actual is not None else None,
        "disponible": updated.disponible,
        "ubicacion_actualizada_en": updated.ubicacion_actualizada_en.isoformat() if updated.ubicacion_actualizada_en else None,
    }


@router.patch("/{incidente_id}/tecnico/ubicacion", response_model=dict)
async def incidentes_actualizar_ubicacion_tecnico(
    incidente_id: str,
    payload: TecnicoUbicacionUpdate,
    empleado=Depends(get_current_employee),
    db: Session = Depends(get_db),
) -> dict:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    updated = update_incidente_tecnico_ubicacion(db, inc, empleado, payload)
    tracking = get_incidente_tracking(db, inc)
    await tracking_ws_manager.broadcast(
        inc.id,
        {
            "event": "technician_location_updated",
            "tracking": tracking,
        },
    )

    return {
        "incidente_id": incidente_id,
        "empleado_id": updated.id,
        "latitud": float(updated.latitud_actual) if updated.latitud_actual is not None else None,
        "longitud": float(updated.longitud_actual) if updated.longitud_actual is not None else None,
        "disponible": updated.disponible,
        "ubicacion_actualizada_en": updated.ubicacion_actualizada_en.isoformat() if updated.ubicacion_actualizada_en else None,
    }


@router.get("/{incidente_id}/tracking", response_model=IncidenteTrackingOut)
def incidentes_tracking(incidente_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)) -> IncidenteTrackingOut:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    return get_incidente_tracking(db, inc)


@router.websocket("/{incidente_id}/ws/tracking")
async def incidentes_tracking_ws(websocket: WebSocket, incidente_id: str) -> None:
    await tracking_ws_manager.connect(incidente_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        tracking_ws_manager.disconnect(incidente_id, websocket)
    except Exception:
        tracking_ws_manager.disconnect(incidente_id, websocket)


@router.post("/{incidente_id}/diagnosticos", response_model=dict)
def incidentes_add_diag(incidente_id: str, body: dict, user=Depends(require_permission("manage_incidentes")), db: Session = Depends(get_db)) -> dict:
    clasificacion = body.get("clasificacion")
    resumen = body.get("resumen")
    prioridad = body.get("prioridad")
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    diag = add_diagnostico(db, inc, clasificacion=clasificacion, resumen=resumen, prioridad=prioridad)
    return {"id": diag.id}


@router.post("/{incidente_id}/evidencias", response_model=dict)
def incidentes_add_evid(incidente_id: str, body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    tipo = body.get("tipo")
    url_archivo = body.get("url_archivo") or body.get("archivo")
    texto = body.get("texto")
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    ev = add_evidencia(db, inc, tipo, url_archivo=url_archivo, texto=texto)
    return {"id": ev.id}
