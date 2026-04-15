from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.schemas.auth import AccessTokenResponse, LoginRequest, RefreshRequest, TokenResponse
from app.schemas.register import RegisterEmpresaRequest
from app.schemas.theme import ThemeOut, ThemePatch
from app.services.auth_service import authenticate_user, create_token_pair, refresh_access_token
from app.services.permission_service import get_user_permissions, resolve_employee
from app.services.user_management import register_empresa_with_admin

router = APIRouter(tags=["auth"])


@router.post("/token/", response_model=TokenResponse)
def token_obtain(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = authenticate_user(db, payload.username, payload.password)
    return create_token_pair(db, user)


@router.post("/token/refresh/", response_model=AccessTokenResponse)
def token_refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    access = refresh_access_token(db, payload.refresh)
    return {"access": access}


@router.post("/register/", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterEmpresaRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = register_empresa_with_admin(db, payload)
    return create_token_pair(db, user)


@router.get("/my-permissions/")
def my_permissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[str]:
    return sorted(list(get_user_permissions(db, user)))


@router.get("/me/theme/", response_model=ThemeOut)
def my_theme(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ThemeOut:
    empleado = resolve_employee(db, user)
    if empleado:
        return ThemeOut(
            theme_preference=empleado.theme_preference,
            theme_custom_color=empleado.theme_custom_color,
            theme_glow_enabled=bool(empleado.theme_glow_enabled),
        )

    return ThemeOut(
        theme_preference="dark",
        theme_custom_color="#6366F1",
        theme_glow_enabled=False,
    )


@router.patch("/me/theme/", response_model=ThemeOut)
def update_my_theme(
    payload: ThemePatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ThemeOut:
    empleado = resolve_employee(db, user)
    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El SuperAdmin no tiene preferencias de tema guardadas.",
        )

    if payload.theme_preference is not None and payload.theme_preference not in {"light", "dark", "custom", "", None}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valor inválido para theme_preference")

    if payload.theme_custom_color is not None and payload.theme_custom_color not in {""}:
        if not isinstance(payload.theme_custom_color, str) or not payload.theme_custom_color.startswith("#") or len(payload.theme_custom_color) not in {4, 7}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de color inválido")

    if payload.theme_preference is not None:
        empleado.theme_preference = payload.theme_preference
    if payload.theme_custom_color is not None:
        empleado.theme_custom_color = payload.theme_custom_color
    if payload.theme_glow_enabled is not None:
        empleado.theme_glow_enabled = payload.theme_glow_enabled

    db.add(empleado)
    db.commit()
    db.refresh(empleado)

    return ThemeOut(
        theme_preference=empleado.theme_preference,
        theme_custom_color=empleado.theme_custom_color,
        theme_glow_enabled=bool(empleado.theme_glow_enabled),
    )
