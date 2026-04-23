from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user, require_permission
from app.schemas.incidente import IncidenteCreate, IncidenteOut, IncidenteUpdate
from app.services.incidente_service import (
    list_incidentes,
    create_incidente,
    get_incidente_or_404,
    update_incidente,
    add_diagnostico,
    add_evidencia,
)

router = APIRouter(prefix="/incidentes", tags=["incidentes"])


@router.get("/", response_model=list[IncidenteOut])
def incidentes_list(db: Session = Depends(get_db)) -> list[IncidenteOut]:
    return list_incidentes(db)


@router.post("/", response_model=IncidenteOut, status_code=status.HTTP_201_CREATED)
def incidentes_create(payload: IncidenteCreate, user=Depends(get_current_user), db: Session = Depends(get_db)) -> IncidenteOut:
    # If authenticated as cliente, bind cliente id
    cliente_id = None
    # try to get cliente id from token claims if present
    try:
        cliente_id = user.get("empleado_id") if isinstance(user, dict) else None
    except Exception:
        cliente_id = None
    inc = create_incidente(db, payload, cliente_id=cliente_id)
    return inc


@router.get("/{incidente_id}/", response_model=IncidenteOut)
def incidentes_retrieve(incidente_id: str, db: Session = Depends(get_db)) -> IncidenteOut:
    try:
        return get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")


@router.patch("/{incidente_id}/", response_model=IncidenteOut)
def incidentes_update(incidente_id: str, payload: IncidenteUpdate, user=Depends(require_permission("manage_incidentes")), db: Session = Depends(get_db)) -> IncidenteOut:
    try:
        inc = get_incidente_or_404(db, incidente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    return update_incidente(db, inc, payload)


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
