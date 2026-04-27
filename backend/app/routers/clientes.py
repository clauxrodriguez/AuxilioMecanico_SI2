from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.deps.auth import get_current_user, require_permission
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.vehiculo import VehiculoCreate, VehiculoOut
from app.services.cliente_service import (
    create_cliente,
    get_cliente_for_user_or_404,
    get_cliente_historial,
    get_cliente_or_404,
    list_clientes,
    send_verification_sms,
    update_cliente,
    verify_sms,
)
from app.services.vehiculo_service import create_vehiculo_for_cliente, list_vehiculos_for_cliente

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("/", response_model=list[ClienteOut])
def clientes_list(db: Session = Depends(get_db)) -> list[ClienteOut]:
    return list_clientes(db)


@router.post("/", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def clientes_create(payload: ClienteCreate, user=Depends(require_permission("manage_clientes")), db: Session = Depends(get_db)) -> ClienteOut:
    return create_cliente(db, payload)


@router.get("/me/", response_model=ClienteOut)
def clientes_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ClienteOut:
    try:
        return get_cliente_for_user_or_404(db, user.id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


@router.put("/me/", response_model=ClienteOut)
def clientes_update_me(payload: ClienteUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ClienteOut:
    try:
        cliente = get_cliente_for_user_or_404(db, user.id)
        return update_cliente(db, cliente, payload)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


@router.get("/me/vehiculos", response_model=list[VehiculoOut])
def cliente_list_my_vehiculos(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[VehiculoOut]:
    try:
        cliente = get_cliente_for_user_or_404(db, user.id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return list_vehiculos_for_cliente(db, cliente.id)


@router.post("/me/vehiculos", response_model=VehiculoOut, status_code=status.HTTP_201_CREATED)
def cliente_add_my_vehiculo(payload: VehiculoCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> VehiculoOut:
    try:
        cliente = get_cliente_for_user_or_404(db, user.id)
        return create_vehiculo_for_cliente(db, cliente.id, payload)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")


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
    cliente_id = body.get("cliente_id")
    if not cliente_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cliente_id requerido")

    code = body.get("code")
    if code is None:
        try:
            send_verification_sms(db, cliente_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
        return {"status": "code_sent"}

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


@router.post("/{cliente_id}/vehiculos/public", response_model=VehiculoOut, status_code=status.HTTP_201_CREATED)
def cliente_add_vehiculo_public(cliente_id: str, payload: VehiculoCreate, db: Session = Depends(get_db)) -> VehiculoOut:
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
