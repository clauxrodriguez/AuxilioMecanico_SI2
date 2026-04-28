import 'api_service.dart';
import '../models/vehicle.dart';
import '../models/user.dart';

class IncidenteService {
  final ApiService _api;
  IncidenteService(this._api);

  Future<List<dynamic>> listIncidentes() async {
    // ApiService does not provide a typed list for incidents in this sample,
    // call via getProfile or extend ApiService as needed. For now we call the endpoint generically.
    // If ApiService had a listIncidentes method, replace this with that.
    throw UnimplementedError('listIncidentes not implemented in ApiService');
  }

  Future<dynamic> createIncidente(Map<String, dynamic> payload) async {
    // quick generic POST using low-level http not provided here; extend ApiService if needed
    throw UnimplementedError('createIncidente not implemented in ApiService');
  }
}
