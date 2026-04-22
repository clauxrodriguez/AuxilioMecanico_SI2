from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.schemas.auth import AccessTokenResponse, LoginRequest, RefreshRequest, TokenResponse
from app.schemas.empleado import EmpleadoInvitationActivateRequest
from app.schemas.register import RegisterAdminRequest, RegisterCompanyRequest, RegisterCompanyResponse, RegisterEmpresaRequest

from app.services.auth_service import authenticate_user, create_token_pair, refresh_access_token
from app.services.permission_service import get_user_permissions, resolve_employee
from app.services.user_management import activate_empleado_invitation, register_admin_step, register_empresa_step, register_empresa_with_admin

router = APIRouter(tags=["auth"])


@router.post("/token/", response_model=TokenResponse)
def token_obtain(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = authenticate_user(db, payload.username, payload.password)
    return create_token_pair(db, user)


@router.post("/login", response_model=TokenResponse)
def login_legacy(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
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


@router.post("/register/company/", response_model=RegisterCompanyResponse, status_code=status.HTTP_201_CREATED)
def register_company(payload: RegisterCompanyRequest, db: Session = Depends(get_db)) -> RegisterCompanyResponse:
    result = register_empresa_step(db, payload)
    return RegisterCompanyResponse(**result)


@router.post("/register/admin/", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_admin(payload: RegisterAdminRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = register_admin_step(db, payload)
    return create_token_pair(db, user)


@router.post("/employee-invitations/activate/", response_model=TokenResponse)
def activate_employee_invitation(payload: EmpleadoInvitationActivateRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = activate_empleado_invitation(db, payload)
    return create_token_pair(db, user)


@router.get("/me")
def me_legacy(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    empleado = resolve_employee(db, user)
    role_names = {(role.nombre or "").strip().lower() for role in (empleado.roles if empleado else [])}
    is_admin_role = "admin" in role_names or "administrador" in role_names

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "es_admin": bool(user.is_staff) or is_admin_role,
        "empresa_id": empleado.empresa_id if empleado else None,
        "is_active": bool(user.is_active),
        "created_at": user.date_joined.isoformat() if user.date_joined else None,
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_legacy() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/my-permissions/")
def my_permissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[str]:
    return sorted(list(get_user_permissions(db, user)))
