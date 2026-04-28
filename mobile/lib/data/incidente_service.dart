import 'api_service.dart';

class IncidenteService {
  final ApiService _api;

  IncidenteService({String? token}) : _api = ApiService(token: token);

  Future<Map<String, dynamic>> crearIncidente(
    Map<String, dynamic> payload,
  ) async {
    return _api.createIncidente(payload);
  }

  // TODO: implementar listar/obtener/tracking/evidencias cuando ApiService los exponga
}
