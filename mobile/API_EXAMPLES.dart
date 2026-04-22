// Este archivo es un EJEMPLO de cómo extender el ApiService con más endpoints
// No es necesario para el funcionamiento básico, pero puede servir como referencia

/*
EJEMPLO: Extensiones del ApiService para futuras funcionalidades

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../models/user.dart';

// EXTENSIONES AL ApiService PARA AGREGAR MÁS ENDPOINTS

extension CargoEndpoints on ApiService {
  /// Obtener lista de cargos - GET /api/cargos
  Future<List<Map<String, dynamic>>> getCargos() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/cargos'),
        headers: _getHeaders(),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw Exception('Error al obtener cargos: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Crear nuevo cargo - POST /api/cargos
  Future<Map<String, dynamic>> createCargo({
    required String nombre,
    required String? descripcion,
    required int empresaId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/api/cargos'),
        headers: _getHeaders(),
        body: jsonEncode({
          'nombre': nombre,
          'descripcion': descripcion,
          'empresa_id': empresaId,
        }),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Error al crear cargo: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Actualizar cargo - PUT /api/cargos/{id}
  Future<Map<String, dynamic>> updateCargo({
    required int id,
    required String nombre,
    String? descripcion,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('${AppConstants.baseUrl}/api/cargos/$id'),
        headers: _getHeaders(),
        body: jsonEncode({
          'nombre': nombre,
          'descripcion': descripcion,
        }),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Error al actualizar cargo: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Eliminar cargo - DELETE /api/cargos/{id}
  Future<void> deleteCargo(int id) async {
    try {
      final response = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/api/cargos/$id'),
        headers: _getHeaders(),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode != 204 && response.statusCode != 200) {
        throw Exception('Error al eliminar cargo: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}

extension RolEndpoints on ApiService {
  /// Obtener lista de roles - GET /api/roles
  Future<List<Map<String, dynamic>>> getRoles() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/roles'),
        headers: _getHeaders(),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw Exception('Error al obtener roles: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Crear nuevo rol - POST /api/roles
  Future<Map<String, dynamic>> createRole({
    required String nombre,
    required String? descripcion,
    required List<int> permisos,
    required int empresaId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/api/roles'),
        headers: _getHeaders(),
        body: jsonEncode({
          'nombre': nombre,
          'descripcion': descripcion,
          'permisos': permisos,
          'empresa_id': empresaId,
        }),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Error al crear rol: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}

extension PermisoEndpoints on ApiService {
  /// Obtener lista de permisos - GET /api/permisos
  Future<List<Map<String, dynamic>>> getPermisos() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/permisos'),
        headers: _getHeaders(),
      ).timeout(AppConstants.requestTimeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw Exception('Error al obtener permisos: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}

// EJEMPLO DE USO EN UN PROVIDER

import 'package:flutter/material.dart';
import '../data/api_service.dart';

class CargoProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _cargos = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get cargos => _cargos;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final ApiService _apiService;

  CargoProvider({required String token}) 
    : _apiService = ApiService(token: token);

  /// Cargar lista de cargos
  Future<void> loadCargos() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _cargos = await _apiService.getCargos();
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Error al cargar cargos: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crear nuevo cargo
  Future<bool> createCargo({
    required String nombre,
    required String? descripcion,
    required int empresaId,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final newCargo = await _apiService.createCargo(
        nombre: nombre,
        descripcion: descripcion,
        empresaId: empresaId,
      );

      _cargos.add(newCargo);
      
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Error al crear cargo: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Actualizar cargo
  Future<bool> updateCargo({
    required int id,
    required String nombre,
    String? descripcion,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final updatedCargo = await _apiService.updateCargo(
        id: id,
        nombre: nombre,
        descripcion: descripcion,
      );

      final index = _cargos.indexWhere((c) => c['id'] == id);
      if (index != -1) {
        _cargos[index] = updatedCargo;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Error al actualizar cargo: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Eliminar cargo
  Future<bool> deleteCargo(int id) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _apiService.deleteCargo(id);

      _cargos.removeWhere((c) => c['id'] == id);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Error al eliminar cargo: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

// EJEMPLO DE USO EN UN WIDGET

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class CargoListScreen extends StatefulWidget {
  const CargoListScreen({super.key});

  @override
  State<CargoListScreen> createState() => _CargoListScreenState();
}

class _CargoListScreenState extends State<CargoListScreen> {
  @override
  void initState() {
    super.initState();
    // Cargar cargos cuando se abre la pantalla
    Future.microtask(() {
      Provider.of<CargoProvider>(context, listen: false).loadCargos();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cargos')),
      body: Consumer<CargoProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(child: Text(provider.error!));
          }

          return ListView.builder(
            itemCount: provider.cargos.length,
            itemBuilder: (context, index) {
              final cargo = provider.cargos[index];
              return ListTile(
                title: Text(cargo['nombre'] ?? ''),
                subtitle: Text(cargo['descripcion'] ?? ''),
                trailing: PopupMenuButton(
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      child: const Text('Editar'),
                      onTap: () {
                        // Navegar a pantalla de edición
                      },
                    ),
                    PopupMenuItem(
                      child: const Text('Eliminar'),
                      onTap: () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Eliminar'),
                            content: const Text('¿Estás seguro?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Cancelar'),
                              ),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Eliminar'),
                              ),
                            ],
                          ),
                        ) ?? false;

                        if (confirmed) {
                          await provider.deleteCargo(cargo['id']);
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navegar a pantalla de crear cargo
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
*/
