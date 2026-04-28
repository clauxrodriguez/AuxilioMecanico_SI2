import 'api_service.dart';
import 'auth_service.dart';
import 'empleado_service.dart';
import 'cliente_service.dart';
import 'incidente_service.dart';

/// Cliente central que crea servicios con el token actual
class ApiClient {
  String? _token;

  ApiClient({String? token}) : _token = token;

  void setToken(String? token) {
    _token = token;
  }

  AuthService auth() => AuthService(ApiService(token: _token));
  EmpleadoService empleado() => EmpleadoService(ApiService(token: _token));
  ClienteService cliente() => ClienteService(ApiService(token: _token));
  IncidenteService incidente() => IncidenteService(ApiService(token: _token));
}
