import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../models/user.dart';
import '../models/vehicle.dart';

/// Servicio API para comunicarse con el backend FastAPI
class ApiService {
  final String? _token;

  ApiService({String? token}) : _token = token;

  /// Headers comunes para todas las requests
  Map<String, String> _getHeaders({bool includeAuth = true}) {
    final headers = {'Content-Type': 'application/json'};
    if (includeAuth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  /// Login - POST /api/auth/login
  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.authEndpoint}/login',
            ),
            headers: _getHeaders(includeAuth: false),
            body: jsonEncode({'username': username, 'password': password}),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Credenciales inválidas');
      } else {
        throw Exception('Error de login: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Registro de cliente - POST /register/client/
  Future<Map<String, dynamic>> registerClient({
    required String nombre,
    required String username,
    required String password,
    String? email,
    String? telefono,
  }) async {
    final response = await http
        .post(
          Uri.parse('${AppConstants.baseUrl}/register/client/'),
          headers: _getHeaders(includeAuth: false),
          body: jsonEncode({
            'nombre': nombre,
            'username': username,
            'password': password,
            'email': email,
            'telefono': telefono,
          }),
        )
        .timeout(AppConstants.requestTimeout);

    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    if (response.statusCode == 400) {
      final detail = jsonDecode(response.body);
      throw Exception(
        detail['detail']?.toString() ?? 'No se pudo registrar el cliente',
      );
    }
    throw Exception('Error de registro: ${response.statusCode}');
  }

  /// Obtener perfil del usuario autenticado - GET /api/auth/me
  Future<User> getProfile() async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConstants.baseUrl}${AppConstants.authEndpoint}/me'),
            headers: _getHeaders(),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return User.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Token inválido o expirado');
      } else {
        throw Exception('Error al obtener perfil: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Vehicle>> getMyVehicles() async {
    final response = await http
        .get(
          Uri.parse(
            '${AppConstants.baseUrl}${AppConstants.clientesEndpoint}/me/vehiculos',
          ),
          headers: _getHeaders(),
        )
        .timeout(AppConstants.requestTimeout);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data
          .map((item) => Vehicle.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    if (response.statusCode == 404) {
      throw Exception('Cliente no encontrado');
    }

    throw Exception('Error al obtener vehículos: ${response.statusCode}');
  }

  /// Obtener todos los vehículos - GET /api/vehiculos
  /// Requiere permisos (admin/operativo)
  Future<List<Vehicle>> getAllVehicles() async {
    final response = await http
        .get(
          Uri.parse('${AppConstants.baseUrl}/api/vehiculos'),
          headers: _getHeaders(),
        )
        .timeout(AppConstants.requestTimeout);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data
          .map((item) => Vehicle.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    if (response.statusCode == 403) {
      throw Exception('No tienes permiso para acceder a esta lista');
    }

    throw Exception('Error al obtener vehículos: ${response.statusCode}');
  }

  Future<Vehicle> createMyVehicle({
    required String marca,
    required String modelo,
    required String placa,
    int? anio,
    bool principal = false,
  }) async {
    final response = await http
        .post(
          Uri.parse(
            '${AppConstants.baseUrl}${AppConstants.clientesEndpoint}/me/vehiculos',
          ),
          headers: _getHeaders(),
          body: jsonEncode({
            'marca': marca,
            'modelo': modelo,
            'placa': placa,
            'anio': anio,
            'principal': principal,
          }),
        )
        .timeout(AppConstants.requestTimeout);

    if (response.statusCode == 201) {
      return Vehicle.fromJson(jsonDecode(response.body));
    }

    if (response.statusCode == 404) {
      throw Exception('Cliente no encontrado');
    }

    throw Exception('Error al registrar vehículo: ${response.statusCode}');
  }

  /// Obtener lista de empleados - GET /api/empleados
  /// Solo para usuarios con permiso
  Future<List<User>> getEmployees() async {
    try {
      final response = await http
          .get(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.empleadosEndpoint}',
            ),
            headers: _getHeaders(),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data
            .map((e) => User.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (response.statusCode == 403) {
        throw Exception('No tienes permiso para acceder');
      } else {
        throw Exception('Error al obtener empleados: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener detalle de un empleado - GET /api/empleados/{id}
  Future<User> getEmployee(int id) async {
    try {
      final response = await http
          .get(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.empleadosEndpoint}/$id',
            ),
            headers: _getHeaders(),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else if (response.statusCode == 404) {
        throw Exception('Empleado no encontrado');
      } else {
        throw Exception('Error al obtener empleado: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Crear un nuevo empleado - POST /api/empleados
  Future<User> createEmployee({
    required String username,
    required String email,
    required String firstName,
    required String lastName,
    required String cargoId,
    required String empresaId,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.empleadosEndpoint}',
            ),
            headers: _getHeaders(),
            body: jsonEncode({
              'username': username,
              'email': email,
              'first_name': firstName,
              'last_name': lastName,
              'cargo_id': cargoId,
              'empresa_id': empresaId,
            }),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 201) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Error al crear empleado: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Actualizar empleado - PUT /api/empleados/{id}
  Future<User> updateEmployee({
    required int id,
    required String email,
    String? firstName,
    String? lastName,
    String? cargoId,
  }) async {
    try {
      final body = {'email': email};
      if (firstName != null) body['first_name'] = firstName;
      if (lastName != null) body['last_name'] = lastName;
      if (cargoId != null) body['cargo_id'] = cargoId;

      final response = await http
          .put(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.empleadosEndpoint}/$id',
            ),
            headers: _getHeaders(),
            body: jsonEncode(body),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Error al actualizar empleado: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Eliminar empleado - DELETE /api/empleados/{id}
  Future<void> deleteEmployee(int id) async {
    try {
      final response = await http
          .delete(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.empleadosEndpoint}/$id',
            ),
            headers: _getHeaders(),
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode != 204 && response.statusCode != 200) {
        throw Exception('Error al eliminar empleado: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Logout - POST /api/auth/logout
  Future<void> logout() async {
    try {
      await http
          .post(
            Uri.parse(
              '${AppConstants.baseUrl}${AppConstants.authEndpoint}/logout',
            ),
            headers: _getHeaders(),
          )
          .timeout(AppConstants.requestTimeout);
    } catch (e) {
      // El logout siempre se considera éxito local aunque falle el backend
      print('Logout error: $e');
    }
  }
}
