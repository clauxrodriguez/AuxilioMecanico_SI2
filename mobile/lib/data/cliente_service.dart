import 'api_service.dart';
import '../models/vehicle.dart';

class ClienteService {
  final ApiService _api;
  ClienteService(this._api);

  Future<List<Vehicle>> getMyVehicles() async {
    return _api.getMyVehicles();
  }

  Future<Vehicle> createMyVehicle({
    required String marca,
    required String modelo,
    required String placa,
    int? anio,
    bool principal = false,
  }) async {
    return _api.createMyVehicle(
      marca: marca,
      modelo: modelo,
      placa: placa,
      anio: anio,
      principal: principal,
    );
  }
}
