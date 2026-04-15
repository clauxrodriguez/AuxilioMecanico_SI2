from __future__ import annotations

import re
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.db.models import Cargo, Departamento, Empleado, Empresa, Permiso, Rol, Suscripcion, User
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate
from app.schemas.register import RegisterEmpresaRequest

PLAN_LIMITS = {
    "basico": {"usuarios": 15, "activos": 100},
    "profesional": {"usuarios": 40, "activos": 350},
    "empresarial": {"usuarios": 9999, "activos": 99999},
}

DEFAULT_PERMISSIONS: list[tuple[str, str]] = [
    ("manage_empleado", "Gestionar empleados (crear, editar y eliminar)."),
    ("manage_rol", "Gestionar roles (crear, editar y eliminar)."),
    ("manage_permiso", "Gestionar permisos del sistema."),
    ("view_empleado", "Ver empleados."),
    ("view_rol", "Ver roles."),
    ("view_permiso", "Ver permisos."),
]


# -----------------------------
# Shared mapping helpers
# -----------------------------

def _serialize_permiso(permiso: Permiso) -> dict:
    return {
        "id": permiso.id,
        "nombre": permiso.nombre,
        "descripcion": permiso.descripcion,
    }


def _serialize_role(role: Rol) -> dict:
    return {
        "id": role.id,
        "empresa": role.empresa_id,
        "nombre": role.nombre,
        "permisos": [_serialize_permiso(p) for p in role.permisos],
    }


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    }


def _serialize_empleado(empleado: Empleado, base_url: str) -> dict:
    foto = empleado.foto_perfil
    if foto:
        foto = f"{base_url}/media/{foto}".replace("//media", "/media")

    return {
        "id": empleado.id,
        "usuario": _serialize_user(empleado.usuario),
        "ci": empleado.ci,
        "apellido_p": empleado.apellido_p,
        "apellido_m": empleado.apellido_m,
        "direccion": empleado.direccion,
        "telefono": empleado.telefono,
        "sueldo": empleado.sueldo,
        "cargo": empleado.cargo_id,
        "departamento": empleado.departamento_id,
        "empresa": empleado.empresa_id,
        "foto_perfil": foto,
        "theme_preference": empleado.theme_preference,
        "theme_custom_color": empleado.theme_custom_color,
        "theme_glow_enabled": bool(empleado.theme_glow_enabled),
        "roles": [r.id for r in empleado.roles],
        "roles_asignados": [_serialize_role(r) for r in empleado.roles],
        "cargo_nombre": empleado.cargo.nombre if empleado.cargo else None,
        "departamento_nombre": empleado.departamento.nombre if empleado.departamento else None,
    }


# -----------------------------
# Permissions CRUD
# -----------------------------

def list_permisos(db: Session) -> list[Permiso]:
    return db.execute(select(Permiso).order_by(Permiso.nombre)).scalars().all()


def ensure_default_permissions(db: Session) -> list[Permiso]:
    existing = {perm.nombre: perm for perm in list_permisos(db)}

    for name, description in DEFAULT_PERMISSIONS:
        if name in existing:
            continue
        permiso = Permiso(id=str(uuid.uuid4()), nombre=name, descripcion=description)
        db.add(permiso)

    db.flush()
    return list_permisos(db)


def get_permiso_or_404(db: Session, permiso_id: str) -> Permiso:
    permiso = db.get(Permiso, permiso_id)
    if not permiso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")
    return permiso


def create_permiso(db: Session, nombre: str, descripcion: str) -> Permiso:
    exists = db.execute(select(Permiso).where(func.lower(Permiso.nombre) == nombre.lower())).scalars().first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un permiso con ese nombre")

    permiso = Permiso(id=str(uuid.uuid4()), nombre=nombre, descripcion=descripcion)
    db.add(permiso)
    db.commit()
    db.refresh(permiso)
    return permiso


def update_permiso(db: Session, permiso: Permiso, nombre: str | None, descripcion: str | None) -> Permiso:
    if nombre and nombre.lower() != permiso.nombre.lower():
        exists = db.execute(select(Permiso).where(func.lower(Permiso.nombre) == nombre.lower())).scalars().first()
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un permiso con ese nombre")
        permiso.nombre = nombre

    if descripcion is not None:
        permiso.descripcion = descripcion

    db.add(permiso)
    db.commit()
    db.refresh(permiso)
    return permiso


def delete_permiso(db: Session, permiso: Permiso) -> None:
    db.delete(permiso)
    db.commit()


# -----------------------------
# Roles CRUD
# -----------------------------

def _resolve_role_permissions(db: Session, permission_ids: list[str]) -> list[Permiso]:
    if not permission_ids:
        return []

    permisos = db.execute(select(Permiso).where(Permiso.id.in_(permission_ids))).scalars().all()
    found = {p.id for p in permisos}
    missing = [pid for pid in permission_ids if pid not in found]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permisos no encontrados: {', '.join(missing)}",
        )
    return permisos


def list_roles(db: Session, empresa_id: str | None) -> list[Rol]:
    stmt = select(Rol).options(joinedload(Rol.permisos))
    if empresa_id:
        stmt = stmt.where(Rol.empresa_id == empresa_id)
    return db.execute(stmt.order_by(Rol.nombre)).unique().scalars().all()


def get_role_or_404(db: Session, role_id: str, empresa_id: str | None) -> Rol:
    stmt = select(Rol).where(Rol.id == role_id).options(joinedload(Rol.permisos))
    role = db.execute(stmt).unique().scalars().first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    if empresa_id and role.empresa_id != empresa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return role


def create_role(db: Session, empresa_id: str, nombre: str, permission_ids: list[str]) -> Rol:
    exists_stmt = select(Rol).where(Rol.empresa_id == empresa_id, func.lower(Rol.nombre) == nombre.lower())
    if db.execute(exists_stmt).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un rol con ese nombre en la empresa")

    role = Rol(id=str(uuid.uuid4()), empresa_id=empresa_id, nombre=nombre)
    role.permisos = _resolve_role_permissions(db, permission_ids)

    db.add(role)
    db.commit()
    db.refresh(role)
    return db.execute(select(Rol).where(Rol.id == role.id).options(joinedload(Rol.permisos))).unique().scalars().one()


def update_role(db: Session, role: Rol, nombre: str | None, permission_ids: list[str] | None) -> Rol:
    if nombre and nombre.lower() != role.nombre.lower():
        exists_stmt = select(Rol).where(
            Rol.empresa_id == role.empresa_id,
            func.lower(Rol.nombre) == nombre.lower(),
            Rol.id != role.id,
        )
        if db.execute(exists_stmt).scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un rol con ese nombre en la empresa")
        role.nombre = nombre

    if permission_ids is not None:
        role.permisos = _resolve_role_permissions(db, permission_ids)

    db.add(role)
    db.commit()
    db.refresh(role)
    return db.execute(select(Rol).where(Rol.id == role.id).options(joinedload(Rol.permisos))).unique().scalars().one()


def delete_role(db: Session, role: Rol) -> None:
    db.delete(role)
    db.commit()


# -----------------------------
# Empleados CRUD
# -----------------------------

def _validate_optional_fk(db: Session, model: type[Cargo] | type[Departamento], model_id: str | None, name: str) -> str | None:
    if not model_id:
        return None
    row = db.get(model, model_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{name} no encontrado")
    return model_id


def _validate_role_ids(db: Session, role_ids: list[str], empresa_id: str) -> list[Rol]:
    if not role_ids:
        return []

    roles = db.execute(select(Rol).where(Rol.id.in_(role_ids), Rol.empresa_id == empresa_id)).scalars().all()
    found = {r.id for r in roles}
    missing = [rid for rid in role_ids if rid not in found]
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Roles no válidos para la empresa: {', '.join(missing)}")
    return roles


def _validate_subscription_user_limit(db: Session, empresa_id: str) -> None:
    suscripcion = db.execute(select(Suscripcion).where(Suscripcion.empresa_id == empresa_id)).scalars().first()
    if not suscripcion:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error: No se encontró una suscripción para tu taller.")

    if suscripcion.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu suscripción no está activa. No puedes añadir nuevos registros en el taller.",
        )

    current_count = db.execute(select(func.count(Empleado.id)).where(Empleado.empresa_id == empresa_id)).scalar_one()
    if current_count >= suscripcion.max_usuarios:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Has alcanzado el límite de {suscripcion.max_usuarios} empleados para tu plan "
                f"{suscripcion.plan}. Por favor, actualiza tu plan."
            ),
        )


def list_empleados(db: Session, empresa_id: str | None) -> list[Empleado]:
    stmt = (
        select(Empleado)
        .options(
            joinedload(Empleado.usuario),
            joinedload(Empleado.cargo),
            joinedload(Empleado.departamento),
            joinedload(Empleado.roles).joinedload(Rol.permisos),
        )
        .order_by(Empleado.apellido_p)
    )
    if empresa_id:
        stmt = stmt.where(Empleado.empresa_id == empresa_id)
    return db.execute(stmt).unique().scalars().all()


def get_empleado_or_404(db: Session, empleado_id: str, empresa_id: str | None) -> Empleado:
    stmt = (
        select(Empleado)
        .where(Empleado.id == empleado_id)
        .options(
            joinedload(Empleado.usuario),
            joinedload(Empleado.cargo),
            joinedload(Empleado.departamento),
            joinedload(Empleado.roles).joinedload(Rol.permisos),
        )
    )
    empleado = db.execute(stmt).unique().scalars().first()
    if not empleado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")
    if empresa_id and empleado.empresa_id != empresa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empleado no encontrado")
    return empleado


def create_empleado(db: Session, payload: EmpleadoCreate, empresa_id: str, foto_path: str | None = None) -> Empleado:
    _validate_subscription_user_limit(db, empresa_id)

    exists_user = db.execute(select(User).where(func.lower(User.username) == payload.username.lower())).scalars().first()
    if exists_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este nombre de usuario ya está en uso")

    role_rows = _validate_role_ids(db, payload.roles, empresa_id)
    cargo_id = _validate_optional_fk(db, Cargo, payload.cargo, "Cargo")
    departamento_id = _validate_optional_fk(db, Departamento, payload.departamento, "Departamento")

    user = User(
        username=payload.username,
        password=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.apellido_p,
        email=payload.email,
        is_staff=False,
        is_superuser=False,
        is_active=True,
        date_joined=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()

    empleado = Empleado(
        id=str(uuid.uuid4()),
        usuario_id=user.id,
        empresa_id=empresa_id,
        ci=payload.ci,
        apellido_p=payload.apellido_p,
        apellido_m=payload.apellido_m,
        direccion=payload.direccion,
        telefono=payload.telefono,
        sueldo=payload.sueldo or Decimal("0"),
        cargo_id=cargo_id,
        departamento_id=departamento_id,
        foto_perfil=foto_path,
        theme_preference=payload.theme_preference,
        theme_custom_color=payload.theme_custom_color,
        theme_glow_enabled=bool(payload.theme_glow_enabled) if payload.theme_glow_enabled is not None else False,
    )
    empleado.roles = role_rows

    db.add(empleado)
    db.commit()

    return get_empleado_or_404(db, empleado.id, empresa_id=None)


def update_empleado(db: Session, empleado: Empleado, payload: EmpleadoUpdate, foto_path: str | None = None) -> Empleado:
    user = empleado.usuario

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.email is not None:
        user.email = payload.email
    if payload.apellido_p is not None:
        user.last_name = payload.apellido_p
    if payload.password:
        user.password = hash_password(payload.password)

    if payload.ci is not None:
        empleado.ci = payload.ci
    if payload.apellido_p is not None:
        empleado.apellido_p = payload.apellido_p
    if payload.apellido_m is not None:
        empleado.apellido_m = payload.apellido_m
    if payload.direccion is not None:
        empleado.direccion = payload.direccion
    if payload.telefono is not None:
        empleado.telefono = payload.telefono
    if payload.sueldo is not None:
        empleado.sueldo = payload.sueldo

    if payload.cargo is not None:
        empleado.cargo_id = _validate_optional_fk(db, Cargo, payload.cargo, "Cargo")
    if payload.departamento is not None:
        empleado.departamento_id = _validate_optional_fk(db, Departamento, payload.departamento, "Departamento")

    if payload.theme_preference is not None:
        empleado.theme_preference = payload.theme_preference
    if payload.theme_custom_color is not None:
        empleado.theme_custom_color = payload.theme_custom_color
    if payload.theme_glow_enabled is not None:
        empleado.theme_glow_enabled = payload.theme_glow_enabled

    if foto_path is not None:
        empleado.foto_perfil = foto_path

    if payload.roles is not None:
        empleado.roles = _validate_role_ids(db, payload.roles, empleado.empresa_id)

    db.add(user)
    db.add(empleado)
    db.commit()
    return get_empleado_or_404(db, empleado.id, empresa_id=None)


def delete_empleado(db: Session, empleado: Empleado) -> None:
    user = empleado.usuario
    db.delete(empleado)
    db.flush()
    if user:
        db.delete(user)
    db.commit()


# -----------------------------
# Register Empresa + Admin
# -----------------------------

def _validate_register_payload(db: Session, payload: RegisterEmpresaRequest) -> None:
    if db.execute(select(Empresa).where(func.lower(Empresa.nombre) == payload.empresa_nombre.lower())).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un taller con este nombre.")

    if db.execute(select(Empresa).where(func.lower(Empresa.nit) == payload.empresa_nit.lower())).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un taller con este NIT.")

    if db.execute(select(User).where(func.lower(User.username) == payload.admin_username.lower())).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este nombre de usuario ya está en uso.")

    if not re.match(r"^\d{16}$", payload.card_number):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El número de tarjeta debe contener exactamente 16 dígitos.")

    if not re.match(r"^(0[1-9]|1[0-2])\/\d{2}$", payload.card_expiry):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de expiración debe tener el formato MM/AA.")

    if not re.match(r"^\d{3,4}$", payload.card_cvc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El CVC debe contener 3 o 4 dígitos.")

    if payload.plan not in PLAN_LIMITS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Plan '{payload.plan}' inválido seleccionado.")


def register_empresa_with_admin(db: Session, payload: RegisterEmpresaRequest) -> User:
    _validate_register_payload(db, payload)

    now = datetime.now(timezone.utc)

    empresa = Empresa(
        id=str(uuid.uuid4()),
        nombre=payload.empresa_nombre,
        nit=payload.empresa_nit,
        fecha_creacion=now,
    )
    db.add(empresa)
    db.flush()

    user = User(
        username=payload.admin_username,
        password=hash_password(payload.admin_password),
        first_name=payload.admin_first_name,
        last_name=payload.admin_apellido_p,
        email=payload.admin_email,
        is_staff=False,
        is_superuser=False,
        is_active=True,
        date_joined=now,
    )
    db.add(user)
    db.flush()

    empleado = Empleado(
        id=str(uuid.uuid4()),
        usuario_id=user.id,
        empresa_id=empresa.id,
        ci=payload.admin_ci,
        apellido_p=payload.admin_apellido_p,
        apellido_m=payload.admin_apellido_m,
        sueldo=Decimal("0"),
        theme_preference="dark",
        theme_custom_color="#6366F1",
        theme_glow_enabled=False,
    )
    db.add(empleado)
    db.flush()

    plan_limits = PLAN_LIMITS[payload.plan]
    suscripcion = Suscripcion(
        id=str(uuid.uuid4()),
        empresa_id=empresa.id,
        plan=payload.plan,
        estado="activa",
        fecha_inicio=date.today(),
        fecha_fin=date.today() + timedelta(days=30),
        max_usuarios=plan_limits["usuarios"],
        max_activos=plan_limits["activos"],
    )
    db.add(suscripcion)
    db.flush()

    admin_role = db.execute(select(Rol).where(Rol.empresa_id == empresa.id, Rol.nombre == "Admin")).scalars().first()
    if not admin_role:
        admin_role = Rol(id=str(uuid.uuid4()), empresa_id=empresa.id, nombre="Admin")
        db.add(admin_role)
        db.flush()

    all_perms = ensure_default_permissions(db)
    admin_role.permisos = all_perms
    empleado.roles = [admin_role]

    db.add(admin_role)
    db.add(empleado)
    db.commit()

    db.refresh(user)
    return user


__all__ = [
    "create_permiso",
    "update_permiso",
    "delete_permiso",
    "get_permiso_or_404",
    "list_permisos",
    "create_role",
    "update_role",
    "delete_role",
    "get_role_or_404",
    "list_roles",
    "create_empleado",
    "update_empleado",
    "delete_empleado",
    "get_empleado_or_404",
    "list_empleados",
    "register_empresa_with_admin",
    "_serialize_role",
    "_serialize_permiso",
    "_serialize_empleado",
]
