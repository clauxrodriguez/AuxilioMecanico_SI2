import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final role = auth.userRole ?? '';

    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            accountName: Text(auth.user?.fullName ?? 'Usuario'),
            accountEmail: Text(auth.user?.email ?? ''),
          ),
          ListTile(
            leading: const Icon(Icons.home),
            title: const Text('Inicio'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/');
            },
          ),
          if (role == 'cliente') ...[
            ListTile(
              leading: const Icon(Icons.directions_car),
              title: const Text('Mis vehículos'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/client/vehicles');
              },
            ),
            ListTile(
              leading: const Icon(Icons.add),
              title: const Text('Registrar vehículo'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/client/register-vehicle');
              },
            ),
            ListTile(
              leading: const Icon(Icons.report),
              title: const Text('Mis incidentes'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/client/incidents');
              },
            ),
          ],
          if (role == 'admin' || role == 'empleado') ...[
            ListTile(
              leading: const Icon(Icons.directions_car_filled),
              title: const Text('Vehículos (operativo)'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/admin/vehiculos');
              },
            ),
            ListTile(
              leading: const Icon(Icons.people),
              title: const Text('Empleados'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/admin/empleados');
              },
            ),
            ListTile(
              leading: const Icon(Icons.list),
              title: const Text('Incidentes'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/admin/incidentes');
              },
            ),
          ],
          const Spacer(),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Perfil'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/profile');
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Cerrar sesión'),
            onTap: () async {
              Navigator.pop(context);
              await auth.logout();
              Navigator.pushReplacementNamed(context, '/login');
            },
          ),
        ],
      ),
    );
  }
}
