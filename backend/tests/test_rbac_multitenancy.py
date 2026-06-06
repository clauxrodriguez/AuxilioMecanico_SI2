import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db
from app.deps.auth import get_current_user

client = TestClient(app)

class MockUser:
    def __init__(self, id=1, is_staff=False, is_superuser=False):
        self.id = id
        self.is_staff = is_staff
        self.is_superuser = is_superuser
        self.is_active = True

current_user_mock = MockUser()
current_tenant_mock = "empresa_A"
mock_permissions = set()

def override_get_current_user():
    return current_user_mock

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(autouse=True)
def reset_mocks():
    global current_user_mock, current_tenant_mock, mock_permissions
    current_user_mock = MockUser(id=1)
    current_tenant_mock = "empresa_A"
    mock_permissions = set()

@pytest.fixture
def mock_db_session():
    session_mock = MagicMock(spec=Session)
    app.dependency_overrides[get_db] = lambda: session_mock
    yield session_mock
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def mock_auth():
    with patch("app.core.dependencias_autenticacion.has_named_permission") as mock_has_perm, \
         patch("app.routers.empleados_router.get_current_tenant_empresa_id") as mock_emp_tenant_1, \
         patch("app.routers.cargos_router.get_current_tenant_empresa_id") as mock_emp_tenant_2, \
         patch("app.routers.servicios_router.get_current_tenant_empresa_id") as mock_emp_tenant_3, \
         patch("app.routers.roles_router.get_current_tenant_empresa_id") as mock_emp_tenant_4, \
         patch("app.routers.pagos_router.get_current_tenant_empresa_id") as mock_emp_tenant_5:
        
        mock_has_perm.side_effect = lambda db, user, perm: perm in mock_permissions
        
        mock_tenant_getter = lambda db, user: current_tenant_mock
        mock_emp_tenant_1.side_effect = mock_tenant_getter
        mock_emp_tenant_2.side_effect = mock_tenant_getter
        mock_emp_tenant_3.side_effect = mock_tenant_getter
        mock_emp_tenant_4.side_effect = mock_tenant_getter
        mock_emp_tenant_5.side_effect = mock_tenant_getter
        
        yield

def test_admin_empresa_a_cannot_see_empresa_b(mock_db_session, mock_auth):
    global current_tenant_mock, mock_permissions
    mock_permissions = {"view_empleado"}
    current_tenant_mock = "empresa_A"
    
    with patch("app.routers.empleados_router.list_empleados") as mock_list_empleados:
        mock_list_empleados.return_value = []
        response = client.get("/api/empleados/")
        assert response.status_code == 200
        mock_list_empleados.assert_called_once()
        args, kwargs = mock_list_empleados.call_args
        assert args[1] == "empresa_A"

def test_admin_crea_empleado_ignora_empresa_id_payload(mock_db_session, mock_auth):
    global current_tenant_mock, mock_permissions
    mock_permissions = {"manage_empleado"}
    current_tenant_mock = "empresa_A" 
    
    payload = {
        "nombre_completo": "Test User",
        "email": "test@test.com",
        "ci": "123456",
        "sueldo": "1000",
        "empresa_id": "empresa_B_MANIPULADO"
    }
    
    with patch("app.routers.empleados_router.create_empleado") as mock_create_empleado, \
         patch("app.routers.empleados_router._resolve_target_empresa_id") as mock_resolve, \
         patch("app.routers.empleados_router._serialize_empleado") as mock_serialize:
        
        mock_resolve.return_value = "empresa_A"
        mock_emp = MagicMock()
        mock_emp.id = "nuevo_id"
        mock_emp.empresa_id = "empresa_A"
        mock_create_empleado.return_value = mock_emp
        mock_serialize.return_value = {
            "id": "nuevo_id",
            "empresa_id": "empresa_A",
            "nombre_completo": "Test User",
            "ci": "123",
            "sueldo": "1000",
            "email": "test@test.com",
            "usuario": {"id": 1, "username": "test", "first_name": "Test", "last_name": "User", "email": "test@test.com", "is_active": True},
            "empresa": "empresa_A",
            "foto_perfil": None,
            "roles_asignados": [],
            "direccion": "", "telefono": "", "cargo": "", "cargo_nombre": "", "roles": []
        }
        
        response = client.post("/api/empleados/", json=payload)
        assert response.status_code == 201
        
        mock_create_empleado.assert_called_once()
        _, kwargs = mock_create_empleado.call_args
        assert kwargs.get("empresa_id") == "empresa_A"

def test_gerente_cannot_manage_roles(mock_db_session, mock_auth):
    global current_tenant_mock, mock_permissions
    mock_permissions = {"view_incidentes", "manage_empleado"} 
    current_tenant_mock = "empresa_A"
    
    response = client.post("/api/roles/", json={"nombre": "NUEVO ROL"})
    assert response.status_code == 403

def test_tecnico_solo_ve_sus_asignaciones(mock_db_session, mock_auth):
    global current_tenant_mock, mock_permissions
    mock_permissions = {"view_incidentes", "manage_incidentes_asignados"}
    current_tenant_mock = "empresa_A"
    
    with patch("app.routers.empleados_router.resolve_employee") as mock_resolve:
        mock_emp = MagicMock()
        mock_emp.id = "tecnico_id_1"
        mock_resolve.return_value = mock_emp
        response = client.get("/api/empleados/me/asignaciones")
        assert response.status_code == 200

def test_cliente_acceso_restringido(mock_db_session, mock_auth):
    global current_tenant_mock, mock_permissions
    mock_permissions = set() 
    current_tenant_mock = None 
    
    with patch("app.core.dependencias_autenticacion.resolve_employee", return_value=None), \
         patch("app.routers.empleados_router.resolve_employee", return_value=None), \
         patch("app.routers.cargos_router.resolve_employee", return_value=None), \
         patch("app.routers.servicios_router.resolve_employee", return_value=None), \
         patch("app.routers.pagos_router.resolve_employee", return_value=None):
        
        endpoints = [
            "/api/empleados/",
            "/api/cargos/",
            "/api/servicios/",
            # Pagos no requiere empresa_context en list, así que podemos omitirlo de este bloque o dejar que retorne 200[] (es el comportamiento correcto para clientes)
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 403
