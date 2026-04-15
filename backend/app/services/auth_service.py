from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.security import create_token, decode_token, verify_password
from app.db.models import Empleado, Rol, User

settings = get_settings()


def _employee_with_relations(db: Session, user_id: int) -> Empleado | None:
    stmt = (
        select(Empleado)
        .where(Empleado.usuario_id == user_id)
        .options(joinedload(Empleado.empresa), joinedload(Empleado.roles).joinedload(Rol.permisos))
    )
    return db.execute(stmt).scalars().first()


def build_user_claims(db: Session, user: User) -> dict:
    empleado = _employee_with_relations(db, user.id)

    if empleado:
        full_name = f"{user.first_name} {empleado.apellido_p}".strip()
        role_names = [rol.nombre for rol in empleado.roles]
        return {
            "username": user.username,
            "email": user.email,
            "nombre_completo": full_name or user.username,
            "empresa_id": empleado.empresa_id,
            "empresa_nombre": empleado.empresa.nombre if empleado.empresa else None,
            "roles": role_names,
            "is_admin": bool(user.is_staff),
            "empleado_id": empleado.id,
            "theme_preference": empleado.theme_preference,
            "theme_custom_color": empleado.theme_custom_color,
            "theme_glow_enabled": bool(empleado.theme_glow_enabled),
            "foto_perfil": empleado.foto_perfil,
        }

    return {
        "username": user.username,
        "email": user.email,
        "nombre_completo": user.username,
        "empresa_id": None,
        "empresa_nombre": None,
        "roles": [],
        "is_admin": bool(user.is_staff),
        "empleado_id": None,
        "theme_preference": None,
        "theme_custom_color": None,
        "theme_glow_enabled": None,
        "foto_perfil": None,
    }


def authenticate_user(db: Session, username: str, password: str) -> User:
    stmt = select(User).where(User.username == username)
    user = db.execute(stmt).scalars().first()

    if not user or not user.is_active or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active account found with the given credentials",
        )

    return user


def create_token_pair(db: Session, user: User) -> dict[str, str]:
    claims = build_user_claims(db, user)
    access = create_token(
        subject=user.id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra=claims,
    )
    refresh = create_token(
        subject=user.id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )
    return {"access": access, "refresh": refresh}


def refresh_access_token(db: Session, refresh_token: str) -> str:
    try:
        payload = decode_token(refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = db.get(User, int(subject))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inválido")

    claims = build_user_claims(db, user)
    return create_token(
        subject=user.id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra=claims,
    )
