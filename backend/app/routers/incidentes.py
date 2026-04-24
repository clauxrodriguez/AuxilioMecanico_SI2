from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user, require_permission
from app.schemas.incidente import IncidenteCreate, IncidenteOut, IncidenteUpdate, IncidentePatchEstado
from app.services.incidente_service import (
    list_incidentes,
    create_incidente,
    get_incidente_or_404,
    update_incidente,
    add_diagnostico,
    add_evidencia,
)
from app.services.incidente_service import (
    list_evidencias_for_incidente,
    get_evidencia_or_404,
    delete_evidencia,
    list_diagnosticos_for_incidente,
    get_diagnostico_or_404,
    update_diagnostico,
)

router = APIRouter(prefix="/incidentes", tags=["incidentes"])


# ============================================================
# CRUD BÁSICO
# ============================================================

@router.get("/", response_model=list[IncidenteOut])
def incidentes_list(db: Session = Depends(get_db)) -> list[IncidenteOut]:
    """Listar todos los incidentes (requiere autenticación)"""
    return list_incidentes(db)



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
def incidentes_update(
    incidente_id: str,
    payload: IncidenteUpdate,
    user = Depends(require_permission("manage_incidentes")),
    db: Session = Depends(get_db)
) -> IncidenteOut:
    """Actualizar incidente (requiere permiso)"""
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    return update_incidente(db, inc, payload)


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
    
    ev = add_evidencia(
        db, inc,
        tipo=body.get("tipo"),
        url_archivo=body.get("url_archivo") or body.get("archivo"),
        texto=body.get("texto")
    )
    return {"id": ev.id, "message": "Evidencia agregada"}


@router.get("/{incidente_id}/evidencias", response_model=list)
def incidentes_get_evidencias(
    incidente_id: str,
    db: Session = Depends(get_db)
) -> list:
    """Listar todas las evidencias de un incidente"""
    try:
        _ = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    
    rows = list_evidencias_for_incidente(db, incidente_id)
    return [
        {
            "id": e.id,
            "tipo": e.tipo,
            "url_archivo": e.url_archivo,
            "texto": e.texto
        }
        for e in rows
    ]


@router.delete("/evidencias/{evidencia_id}", response_model=dict)
def incidentes_delete_evidencia(
    evidencia_id: str,
    user = Depends(require_permission("manage_incidentes")),
    db: Session = Depends(get_db)
) -> dict:
    """Eliminar una evidencia (requiere permiso)"""
    try:
        ev = get_evidencia_or_404(db, evidencia_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidencia no encontrada")
    
    delete_evidencia(db, ev)
    return {"id": evidencia_id, "message": "Evidencia eliminada"}