from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user, require_permission
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.vehiculo import VehiculoCreate, VehiculoOut
from app.services.cliente_service import (
    create_cliente,
    get_cliente_or_404,
    list_clientes,
    update_cliente,
    send_verification_sms,
    verify_sms,
    get_cliente_historial,
)
from app.services.vehiculo_service import create_vehiculo_for_cliente, list_vehiculos_for_cliente

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("/", response_model=list[ClienteOut])
def clientes_list(db: Session = Depends(get_db)) -> list[ClienteOut]:
    return list_clientes(db)


@router.post("/", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def clientes_create(payload: ClienteCreate, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> ClienteOut:
    return create_cliente(db, payload)


@router.get("/{cliente_id}/", response_model=ClienteOut)
def clientes_retrieve(cliente_id: str, db: Session = Depends(get_db)) -> ClienteOut:
    try:
        return get_cliente_or_404(db, cliente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


@router.put("/{cliente_id}/", response_model=ClienteOut)
def clientes_update(cliente_id: str, payload: ClienteUpdate, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> ClienteOut:
    try:
        cliente = get_cliente_or_404(db, cliente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return update_cliente(db, cliente, payload)


@router.post("/verificar-sms", status_code=status.HTTP_200_OK)
def clientes_verificar_sms(body: dict, db: Session = Depends(get_db)) -> dict:
    # body should contain {"cliente_id": "..."} to send code, or {"cliente_id":"...", "code":"..."} to verify
    cliente_id = body.get("cliente_id")
    if not cliente_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cliente_id requerido")

    code = body.get("code")
    if code is None:
        # send code
        try:
            send_verification_sms(db, cliente_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
        return {"status": "code_sent"}
    else:
        ok = verify_sms(db, cliente_id, str(code))
        return {"verified": ok}


@router.get("/{cliente_id}/historial", response_model=list[VehiculoOut])
def clientes_historial(cliente_id: str, db: Session = Depends(get_db)) -> list[VehiculoOut]:
    try:
        rows = get_cliente_historial(db, cliente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return rows


@router.post("/{cliente_id}/vehiculos", response_model=VehiculoOut, status_code=status.HTTP_201_CREATED)
def cliente_add_vehiculo(cliente_id: str, payload: VehiculoCreate, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> VehiculoOut:
    try:
        return create_vehiculo_for_cliente(db, cliente_id, payload)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


@router.get("/{cliente_id}/vehiculos", response_model=list[VehiculoOut])
def cliente_list_vehiculos(cliente_id: str, db: Session = Depends(get_db)) -> list[VehiculoOut]:
    try:
        return list_vehiculos_for_cliente(db, cliente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
