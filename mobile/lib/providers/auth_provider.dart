import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:jwt_decode/jwt_decode.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../core/constants.dart';
import '../data/api_service.dart';
import '../models/user.dart';
import '../services/notification_service.dart';

/// Proveedor de autenticación con Provider
class AuthProvider with ChangeNotifier {
  final _storage = const FlutterSecureStorage();

  String? _token;
  String? _refreshToken;
  User? _user;
  bool _isLoading = true;
  String? _error;

  // Getters
  String? get token => _token;
  User? get user => _user;
  bool get isAuthenticated => _token != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Obtiene el rol del usuario actual
  String? get userRole => _user?.role;

  /// Obtiene si el usuario es admin
  bool get isAdmin => _user?.role == AppConstants.roleAdmin;

  /// Obtiene si el usuario autenticado es cliente
  bool get isClient => _user?.role == 'cliente';

  AuthProvider() {
    _initializeAuth();
  }

  /// Inicializa la autenticación verificando si hay un token guardado
  Future<void> _initializeAuth() async {
    try {
      _isLoading = true;
      _token = await _storage.read(key: AppConstants.storageKeyToken);
      _refreshToken = await _storage.read(
        key: AppConstants.storageKeyRefreshToken,
      );

      if (_token != null && !Jwt.isExpired(_token!)) {
        // Token válido, decodificar usuario del token
        final decodedToken = Jwt.parseJwt(_token!);
        print('Token decodificado: $decodedToken');

        // Obtener perfil completo del usuario desde el backend
        try {
          final apiService = ApiService(token: _token);
          _user = await apiService.getProfile();
        } catch (e) {
          print('Error al obtener perfil: $e');
          // Si no se puede obtener el perfil, hacer logout
          await logout();
        }
      } else {
        // Token expirado o no existe
        _token = null;
        _refreshToken = null;
        _user = null;
      }
    } catch (e) {
      print('Error inicializando autenticación: $e');
      _error = 'Error al inicializar sesión';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Realizar login con usuario y contraseña
  Future<bool> login(String username, String password) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final apiService = ApiService();
      final response = await apiService.login(
        username: username,
        password: password,
      );

      _token = response['access'];
      _refreshToken = response.containsKey('refresh')
          ? response['refresh']
          : null;

      // Verificar que el token no esté expirado
      if (_token == null || Jwt.isExpired(_token!)) {
        throw Exception('Token inválido');
      }

      // Guardar tokens en almacenamiento seguro
      await _storage.write(key: AppConstants.storageKeyToken, value: _token!);
      if (_refreshToken != null) {
        await _storage.write(
          key: AppConstants.storageKeyRefreshToken,
          value: _refreshToken!,
        );
      }

      // Obtener perfil del usuario
      final authApiService = ApiService(token: _token);
      _user = await authApiService.getProfile();

      // Obtener FCM token y enviarlo al backend
      await _sendFcmToken(authApiService);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _getErrorMessage(e.toString());
      _token = null;
      _refreshToken = null;
      _user = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Registrar un cliente y dejarlo autenticado
  Future<bool> registerClient({
    required String nombre,
    required String username,
    required String password,
    String? email,
    String? telefono,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final apiService = ApiService();
      final response = await apiService.registerClient(
        nombre: nombre,
        username: username,
        password: password,
        email: email,
        telefono: telefono,
      );

      _token = response['access'];
      _refreshToken = response.containsKey('refresh')
          ? response['refresh']
          : null;

      if (_token == null || Jwt.isExpired(_token!)) {
        throw Exception('Token inválido');
      }

      await _storage.write(key: AppConstants.storageKeyToken, value: _token!);
      if (_refreshToken != null) {
        await _storage.write(
          key: AppConstants.storageKeyRefreshToken,
          value: _refreshToken!,
        );
      }

      final authApiService = ApiService(token: _token);
      _user = await authApiService.getProfile();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _getErrorMessage(e.toString());
      _token = null;
      _refreshToken = null;
      _user = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Realizar logout
  Future<void> logout() async {
    try {
      if (_token != null) {
        final apiService = ApiService(token: _token);
        await apiService.logout();
      }
    } catch (e) {
      print('Error en logout remoto: $e');
    } finally {
      // Limpiar datos locales
      await _storage.delete(key: AppConstants.storageKeyToken);
      await _storage.delete(key: AppConstants.storageKeyRefreshToken);
      await _storage.delete(key: AppConstants.storageKeyUser);

      _token = null;
      _refreshToken = null;
      _user = null;
      _error = null;
      notifyListeners();
    }
  }

  /// Obtener FCM token y enviarlo al backend
  Future<void> _sendFcmToken(ApiService apiService) async {
    try {
      final fcmToken = await NotificationService.getToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        await apiService.updateFcmToken(fcmToken);
        print('[AuthProvider] FCM token enviado al backend');
      }
    } catch (e) {
      print('[AuthProvider] Error enviando FCM token: $e');
      // No fallar el login si hay error con FCM
    }
  }

  /// Inicializar listeners de notificaciones
  void initializeNotificationListeners(BuildContext context) {
    NotificationService.initializeNotifications(context, (incidentId) {
      _handleIncidentNotification(incidentId);
    });
  }

  /// Manejar notificación de incidente
  void _handleIncidentNotification(String? incidentId) {
    if (incidentId != null) {
      print('[AuthProvider] Notificación de incidente recibida: $incidentId');
      // Notificar a los listeners que hay una nueva notificación
      notifyListeners();
    }
  }

  /// Obtener mensaje de error legible
  String _getErrorMessage(String error) {
    if (error.contains('Credenciales inválidas')) {
      return 'Usuario o contraseña incorrectos';
    } else if (error.contains('Connection refused') ||
        error.contains('Failed host lookup')) {
      return 'No se puede conectar al servidor';
    } else if (error.contains('Token inválido')) {
      return 'Token de autenticación inválido';
    } else if (error.contains('timed out')) {
      return 'Tiempo de espera agotado';
    } else {
      return 'Error: ${error.length > 50 ? error.substring(0, 50) + '...' : error}';
    }
  }

  /// Limpiar mensaje de error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
