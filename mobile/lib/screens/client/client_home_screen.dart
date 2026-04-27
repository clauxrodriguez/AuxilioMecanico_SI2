import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_service.dart';
import '../../models/vehicle.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_app_bar.dart';
import 'vehicle_register_screen.dart';

class ClientHomeScreen extends StatefulWidget {
  const ClientHomeScreen({super.key});

  @override
  State<ClientHomeScreen> createState() => _ClientHomeScreenState();
}

class _ClientHomeScreenState extends State<ClientHomeScreen> {
  Future<List<Vehicle>> _vehiclesFuture = Future.value(<Vehicle>[]);

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  void _loadVehicles() {
    final auth = context.read<AuthProvider>();
    if (auth.token != null) {
      _vehiclesFuture = ApiService(token: auth.token).getMyVehicles();
    } else {
      _vehiclesFuture = Future.value(<Vehicle>[]);
    }
  }

  Future<void> _refreshVehicles() async {
    setState(_loadVehicles);
    await _vehiclesFuture;
  }

  Future<void> _openVehicleForm() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const VehicleRegisterScreen()),
    );

    if (saved == true && mounted) {
      setState(_loadVehicles);
    }
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Deseas salir de la app?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthProvider>().logout();
            },
            child: const Text('Salir'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Área de cliente',
        user: user,
        onLogout: _logout,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openVehicleForm,
        icon: const Icon(Icons.add),
        label: const Text('Registrar vehículo'),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshVehicles,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenido, ${user?.fullName ?? 'Cliente'}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Aquí puedes registrar y ver tus vehículos',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Datos de acceso', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      _InfoRow(label: 'Usuario', value: user?.username ?? 'N/A'),
                      _InfoRow(label: 'Correo', value: user?.email.isNotEmpty == true ? user!.email : 'N/A'),
                      _InfoRow(label: 'Estado', value: (user?.isActive ?? false) ? 'Activo' : 'Inactivo'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Mis vehículos',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              FutureBuilder<List<Vehicle>>(
                future: _vehiclesFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }

                  if (snapshot.hasError) {
                    return Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text('Error: ${snapshot.error}'),
                    );
                  }

                  final vehicles = snapshot.data ?? [];
                  if (vehicles.isEmpty) {
                    return const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No tienes vehículos registrados todavía.'),
                      ),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemBuilder: (context, index) {
                      final vehicle = vehicles[index];
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            child: Icon(vehicle.principal ? Icons.star : Icons.directions_car),
                          ),
                          title: Text('${vehicle.marca ?? 'N/A'} ${vehicle.modelo ?? ''}'.trim()),
                          subtitle: Text('Placa: ${vehicle.placa ?? 'N/A'}\nAño: ${vehicle.anio?.toString() ?? 'N/A'}'),
                          trailing: vehicle.principal ? const Chip(label: Text('Principal')) : null,
                        ),
                      );
                    },
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemCount: vehicles.length,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text('$label:', style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
