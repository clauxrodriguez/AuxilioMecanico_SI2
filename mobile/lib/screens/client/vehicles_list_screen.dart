import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';
import '../../data/api_service.dart';
import '../../models/vehicle.dart';

class VehiclesListScreen extends StatefulWidget {
  const VehiclesListScreen({super.key});

  @override
  State<VehiclesListScreen> createState() => _VehiclesListScreenState();
}

class _VehiclesListScreenState extends State<VehiclesListScreen> {
  Future<List<Vehicle>>? _future;

  @override
  void initState() {
    super.initState();
    // token will be provided by AuthProvider in real app; keep simple placeholder
    _future = ApiService().getAllVehicles();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vehículos')),
      drawer: const AppDrawer(),
      body: FutureBuilder<List<Vehicle>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final vehicles = snapshot.data ?? [];
          if (vehicles.isEmpty)
            return const Center(child: Text('No hay vehículos'));
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemBuilder: (context, index) {
              final v = vehicles[index];
              return ListTile(
                leading: CircleAvatar(
                  child: Icon(v.principal ? Icons.star : Icons.directions_car),
                ),
                title: Text('${v.marca ?? 'N/A'} ${v.modelo ?? ''}'.trim()),
                subtitle: Text(
                  'Placa: ${v.placa ?? 'N/A'} • Año: ${v.anio ?? 'N/A'}',
                ),
              );
            },
            separatorBuilder: (_, __) => const Divider(),
            itemCount: vehicles.length,
          );
        },
      ),
    );
  }
}
