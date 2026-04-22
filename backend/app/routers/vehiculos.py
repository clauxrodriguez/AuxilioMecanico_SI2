from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import require_permission
from app.schemas.vehiculo import VehiculoOut, VehiculoUpdate
from app.services.vehiculo_service import (
    get_vehiculo_or_404,
    update_vehiculo,
    delete_vehiculo,
    set_principal,
)

router = APIRouter(prefix="/vehiculos", tags=["vehiculos"])


@router.put("/{vehiculo_id}/", response_model=VehiculoOut)
def vehiculo_update(vehiculo_id: str, payload: VehiculoUpdate, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> VehiculoOut:
    try:
        v = get_vehiculo_or_404(db, vehiculo_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado")
    return update_vehiculo(db, v, payload)


@router.delete("/{vehiculo_id}/", status_code=status.HTTP_204_NO_CONTENT)
def vehiculo_delete(vehiculo_id: str, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)):
    try:
        v = get_vehiculo_or_404(db, vehiculo_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado")
    delete_vehiculo(db, v)
    return None


@router.patch("/{vehiculo_id}/principal", response_model=VehiculoOut)
def vehiculo_set_principal(vehiculo_id: str, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> VehiculoOut:
    try:
        v = get_vehiculo_or_404(db, vehiculo_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado")
    return set_principal(db, v)
