from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from datetime import datetime
from sqlalchemy import select
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
from app.schemas.cliente import ClienteLogin
from app.core.security import hash_password
from app.db.models import User, Cliente
from app.services.auth_service import create_token_pair, authenticate_user, refresh_access_token
import re
import secrets


def _slugify_name(name: str) -> str:
    # simple slug: lowercase, keep letters/numbers, replace spaces with dot
    s = (name or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", ".", s)
    s = re.sub(r"\.+", ".", s).strip(".")
    return s or "cliente"


def _unique_username(db: Session, base: str) -> str:
    username = base
    suffix = 1
    stmt = select(User).where(User.username == username)
    exists = db.execute(stmt).scalars().first()
    while exists:
        username = f"{base}{suffix}"
        stmt = select(User).where(User.username == username)
        exists = db.execute(stmt).scalars().first()
        suffix += 1
    return username


def _generate_password() -> str:
    # 6-digit numeric password
    return f"{secrets.randbelow(1000000):06d}"

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("/", response_model=list[ClienteOut])
def clientes_list(db: Session = Depends(get_db)) -> list[ClienteOut]:
    return list_clientes(db)





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


@router.post("/cliente/verify-otp", status_code=status.HTTP_200_OK)
def cliente_verify_otp(body: dict, db: Session = Depends(get_db)) -> dict:
    # alias for mobile clients: use same logic as /clientes/verificar-sms
    return clientes_verificar_sms(body, db)


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


# (removed public vehicle-by-client endpoint; vehicles should be created via admin endpoints or a dedicated mobile flow)


@router.get("/{cliente_id}/vehiculos", response_model=list[VehiculoOut])
def cliente_list_vehiculos(cliente_id: str, db: Session = Depends(get_db)) -> list[VehiculoOut]:
    try:
        return list_vehiculos_for_cliente(db, cliente_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")





@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def clientes_register(payload: ClienteCreate, db: Session = Depends(get_db)) -> dict:
    """Register a mobile client and create an associated User for authentication.
    Returns access/refresh tokens.
    """
    # create cliente record (uses sequential id logic in service)
    cliente = create_cliente(db, ClienteCreate(**{k: v for k, v in payload.dict().items() if k != 'password'}))

    # create auth User using email or telefono as username
    # always generate a 6-digit password (do not accept password from client)
    gen_password = _generate_password()

    base_username = None
    if payload.email:
        # try local part of email
        base_username = payload.email.split("@", 1)[0].lower()
    else:
        base_username = _slugify_name(payload.nombre) or f"cliente_{cliente.id}"

    username = _unique_username(db, base_username)
    hashed = hash_password(gen_password)
    user = User(username=username, password=hashed, email=payload.email or "", is_active=True, date_joined=datetime.utcnow())
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = create_token_pair(db, user)
    # return tokens + plaintext credentials so mobile app can show username/password
    return {"access": tokens["access"], "refresh": tokens["refresh"], "username": username, "password": gen_password}


@router.post("/login", response_model=dict)
def clientes_login(payload: ClienteLogin, db: Session = Depends(get_db)) -> dict:
    user = authenticate_user(db, payload.username, payload.password)
    return create_token_pair(db, user)


@router.post("/refresh", response_model=dict)
def clientes_refresh(payload: dict, db: Session = Depends(get_db)) -> dict:
    # expects {"refresh": "..."}
    refresh = payload.get("refresh")
    if not refresh:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh token requerido")
    access = refresh_access_token(db, refresh)
    return {"access": access}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def clientes_logout(user=Depends(get_current_user)):
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Aliases with singular path to support mobile clients using /cliente/*
# (redundant aliases removed: use /clientes/refresh and /clientes/logout)


def _find_cliente_for_user(db: Session, user: User) -> Cliente | None:
    # try match by email, then by username/telefono
    if user.email:
        cliente = db.execute(select(Cliente).where(Cliente.email == user.email)).scalars().first()
        if cliente:
            return cliente
    # try phone match
    cliente = db.execute(select(Cliente).where(Cliente.telefono == user.username)).scalars().first()
    if cliente:
        return cliente
    # last resort, try username equal to telefono
    cliente = db.execute(select(Cliente).where(Cliente.telefono == user.username)).scalars().first()
    return cliente


@router.get("/me", response_model=ClienteOut)
def clientes_me(user=Depends(get_current_user), db: Session = Depends(get_db)) -> ClienteOut:
    cliente = _find_cliente_for_user(db, user)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return cliente


@router.put("/me", response_model=ClienteOut)
def clientes_me_put(payload: ClienteUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)) -> ClienteOut:
    cliente = _find_cliente_for_user(db, user)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return update_cliente(db, cliente, payload)


@router.patch("/me", response_model=ClienteOut)
def clientes_me_patch(payload: ClienteUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)) -> ClienteOut:
    cliente = _find_cliente_for_user(db, user)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return update_cliente(db, cliente, payload)


# (removed /me/vehiculos endpoints — vehicles are created via admin endpoint or separate public flow)
