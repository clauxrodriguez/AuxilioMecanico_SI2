from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.deps.auth import get_current_employee, get_current_user, require_permission
from app.schemas.incidente import (
    AsignarTecnicoRequest,
    IncidenteCreate,
    IncidenteOut,
    IncidenteTrackingOut,
    IncidenteUpdate,
    IncidentePatchEstado,
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
from app.services.asignacion_service import get_active_asignacion_for_incidente
from app.services.file_storage import save_incidente_evidence
from app.services.tracking_ws import tracking_ws_manager
from app.services.cloudinary_service import upload_evidence as cloudinary_upload_evidence
from app.services.transcription_service import transcribe_audio
import tempfile
import os
import shutil
from app.services.notification_service import notify_new_incident

router = APIRouter(prefix="/incidentes", tags=["incidentes"])
settings = get_settings()


# ============================================================
# CRUD BÁSICO
# ============================================================

@router.get("/", response_model=list[IncidenteOut])
def incidentes_list(db: Session = Depends(get_db)) -> list[IncidenteOut]:
    """Listar todos los incidentes (requiere autenticación)"""
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
    # Notify available technicians (don't let FCM errors break creation)
    try:
        notify_new_incident(db, inc)
    except Exception:
        # Log only; creation already completed
        pass
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
def incidentes_retrieve(
    incidente_id: str,
    db: Session = Depends(get_db)
) -> IncidenteOut:
    """Obtener detalle de un incidente"""
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

    # broadcast location updates only for incidents where this technician
    # is actively assigned via asignacion_servicio
    incidentes_asignados = list_incidentes(db)
    for inc in incidentes_asignados:
        asign = get_active_asignacion_for_incidente(db, inc.id)
        if not asign or asign.empleado_id != updated.id:
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


# ============================================================
# ESTADO (Endpoint específico para móvil)
# ============================================================

@router.patch("/{incidente_id}/estado", response_model=dict)
def incidentes_patch_estado(
    incidente_id: str,
    payload: IncidentePatchEstado,  # ← Usa un schema específico
    db: Session = Depends(get_db)
) -> dict:
    """Actualizar solo el estado del incidente (útil para móvil)"""
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    
    inc.estado = payload.estado
    db.commit()
    return {"id": inc.id, "estado": inc.estado}


# ============================================================
# DIAGNÓSTICO
# ============================================================

@router.post("/{incidente_id}/diagnosticos", response_model=dict)
def incidentes_add_diagnostico(
    incidente_id: str,
    body: dict,
    user = Depends(require_permission("manage_incidentes")),
    db: Session = Depends(get_db)
) -> dict:
    """Agregar diagnóstico a un incidente"""
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    
    diag = add_diagnostico(
        db, inc,
        clasificacion=body.get("clasificacion"),
        resumen=body.get("resumen"),
        prioridad=body.get("prioridad")
    )
    return {"id": diag.id, "message": "Diagnóstico agregado"}


@router.get("/{incidente_id}/diagnosticos", response_model=list)
def incidentes_get_diagnosticos(
    incidente_id: str,
    db: Session = Depends(get_db)
) -> list:
    """Obtener diagnóstico(s) de un incidente"""
    try:
        _ = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    
    diagnosticos = list_diagnosticos_for_incidente(db, incidente_id)
    return [
        {
            "id": d.id,
            "clasificacion": d.clasificacion,
            "resumen": d.resumen,
            "prioridad": d.prioridad
        }
        for d in diagnosticos
    ]


@router.put("/diagnosticos/{diagnostico_id}", response_model=dict)
def incidentes_put_diagnostico(
    diagnostico_id: str,
    body: dict,
    user = Depends(require_permission("manage_incidentes")),
    db: Session = Depends(get_db)
) -> dict:
    """Actualizar un diagnóstico existente"""
    try:
        diag = get_diagnostico_or_404(db, diagnostico_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnóstico no encontrado")
    
    updated = update_diagnostico(
        db, diag,
        clasificacion=body.get("clasificacion"),
        resumen=body.get("resumen"),
        prioridad=body.get("prioridad")
    )
    return {"id": updated.id, "message": "Diagnóstico actualizado"}


# ============================================================
# EVIDENCIAS
# ============================================================

@router.post("/{incidente_id}/evidencias", response_model=dict)
def incidentes_add_evidencia(
    incidente_id: str,
    body: dict,
    current_user = Depends(get_current_user),  # Cliente puede subir evidencias
    db: Session = Depends(get_db)
) -> dict:
    """Agregar evidencia a un incidente (foto, texto, etc.)"""
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    ev = add_evidencia(db, inc, tipo, url_archivo=url_archivo, texto=texto)
    return {"id": ev.id}


@router.post("/{incidente_id}/evidencias/upload", response_model=dict)
def incidentes_add_evid_file(
    incidente_id: str,
    archivo: UploadFile = File(...),
    tipo: str | None = Form(default=None),
    texto: str | None = Form(default=None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    inferred_tipo = tipo
    content_type = (archivo.content_type or "").lower()
    if not inferred_tipo:
        if content_type.startswith("image/"):
            inferred_tipo = "foto"
        elif content_type.startswith("audio/"):
            inferred_tipo = "audio"
        else:
            inferred_tipo = "archivo"

    # save to temp file
    tmp_dir = tempfile.mkdtemp(prefix="evidence_")
    tmp_path = os.path.join(tmp_dir, archivo.filename or "upload.bin")
    try:
        with open(tmp_path, "wb") as out:
            out.write(archivo.file.read())

        # upload to Cloudinary
        try:
            folder = f"incidentes/{inc.id}"
            public_url = cloudinary_upload_evidence(tmp_path, folder=folder)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Error subiendo a Cloudinary: {exc}")

        final_text = texto or ""

        # If audio, transcribe
        is_audio = inferred_tipo == "audio" or content_type.startswith("audio/")
        if is_audio:
            try:
                transcription = transcribe_audio(tmp_path)
            except Exception as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Error transcribiendo audio: {exc}")
            if transcription:
                if final_text:
                    final_text = f"{final_text}\n{transcription}"
                else:
                    final_text = transcription

        # persist evidencia
        ev = add_evidencia(db, inc, inferred_tipo, url_archivo=public_url, texto=final_text)

    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass

    return {"id": ev.id, "url_archivo": public_url, "tipo": inferred_tipo, "texto": ev.texto}
