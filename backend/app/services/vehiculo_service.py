import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.models import Vehiculo, Cliente
from app.schemas.vehiculo import VehiculoCreate, VehiculoUpdate


def create_vehiculo_for_cliente(db: Session, cliente_id: str, payload: VehiculoCreate) -> Vehiculo:
    # ensure cliente exists
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise ValueError("Cliente no encontrado")
    # generate sequential numeric id as string: '1','2','3',... if possible
    try:
        rows = db.execute(select(Vehiculo.id)).scalars().all()
        numeric_ids = [int(x) for x in rows if isinstance(x, str) and x.isdigit()]
        next_id = str((max(numeric_ids) + 1) if numeric_ids else 1)
    except Exception:
        next_id = str(uuid.uuid4())

    obj = Vehiculo(
        id=next_id,
        cliente_id=cliente_id,
        anio=payload.anio,
        placa=payload.placa,
        marca=payload.marca,
        modelo=payload.modelo,
        principal=bool(payload.principal),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_vehiculos(db: Session) -> list[Vehiculo]:
    """Listar todos los vehículos (para uso administrativo/operativo)."""
    stmt = select(Vehiculo)
    rows = db.execute(stmt).scalars().all()
    return rows


def list_vehiculos_for_cliente(db: Session, cliente_id: str) -> list[Vehiculo]:
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise ValueError("Cliente no encontrado")
    return cliente.vehiculos


def get_vehiculo_or_404(db: Session, vehiculo_id: str) -> Vehiculo:
    obj = db.get(Vehiculo, vehiculo_id)
    if not obj:
        raise ValueError("Vehiculo no encontrado")
    return obj


def update_vehiculo(db: Session, vehiculo: Vehiculo, payload: VehiculoUpdate) -> Vehiculo:
    if payload.anio is not None:
        vehiculo.anio = payload.anio
    if payload.placa is not None:
        vehiculo.placa = payload.placa
    if payload.marca is not None:
        vehiculo.marca = payload.marca
    if payload.modelo is not None:
        vehiculo.modelo = payload.modelo
    if payload.principal is not None:
        vehiculo.principal = bool(payload.principal)

    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo


def delete_vehiculo(db: Session, vehiculo: Vehiculo) -> None:
    db.delete(vehiculo)
    db.commit()


def set_principal(db: Session, vehiculo: Vehiculo) -> Vehiculo:
    # unset other principal vehicles for the cliente
    stmt = update(Vehiculo).where(Vehiculo.cliente_id == vehiculo.cliente_id).values(principal=False)
    db.execute(stmt)
    vehiculo.principal = True
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo
