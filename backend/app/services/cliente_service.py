import uuid
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Cliente, Vehiculo
from app.schemas.cliente import ClienteCreate, ClienteUpdate

# Simple in-memory store for SMS codes (demo only)
_sms_codes: dict[str, str] = {}


def list_clientes(db: Session) -> list[Cliente]:
    return db.execute(select(Cliente)).scalars().all()


def create_cliente(db: Session, payload: ClienteCreate) -> Cliente:
    # generate simple sequential numeric id as string: '1','2','3',...
    # collect existing numeric ids and pick next
    try:
        rows = db.execute(select(Cliente.id)).scalars().all()
        numeric_ids = [int(x) for x in rows if isinstance(x, str) and x.isdigit()]
        next_id = str((max(numeric_ids) + 1) if numeric_ids else 1)
    except Exception:
        # fallback to uuid if anything goes wrong
        next_id = str(uuid.uuid4())

    obj = Cliente(id=next_id, nombre=payload.nombre, email=str(payload.email) if payload.email else None, telefono=payload.telefono, activo=bool(payload.activo))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_cliente_or_404(db: Session, cliente_id: str) -> Cliente:
    obj = db.get(Cliente, cliente_id)
    if not obj:
        raise ValueError("Cliente no encontrado")
    return obj


def update_cliente(db: Session, cliente: Cliente, payload: ClienteUpdate) -> Cliente:
    if payload.nombre is not None:
        cliente.nombre = payload.nombre
    if payload.email is not None:
        cliente.email = str(payload.email)
    if payload.telefono is not None:
        cliente.telefono = payload.telefono
    if payload.activo is not None:
        cliente.activo = bool(payload.activo)

    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


def send_verification_sms(db: Session, cliente_id: str) -> str:
    # generate a 6-digit code and "send" it. In production integrate with SMS provider.
    code = f"{random.randint(0, 999999):06d}"
    _sms_codes[cliente_id] = code
    return code


def verify_sms(db: Session, cliente_id: str, code: str) -> bool:
    expected = _sms_codes.get(cliente_id)
    if not expected:
        return False
    if expected == code:
        del _sms_codes[cliente_id]
        return True
    return False


def get_cliente_historial(db: Session, cliente_id: str) -> list[Vehiculo]:
    # For now, historial returns the list of vehicles associated to the cliente
    cliente = get_cliente_or_404(db, cliente_id)
    return cliente.vehiculos
