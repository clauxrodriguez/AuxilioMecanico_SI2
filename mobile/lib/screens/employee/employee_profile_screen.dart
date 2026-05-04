import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';

class EmployeeProfileScreen extends StatefulWidget {
  const EmployeeProfileScreen({super.key});

  @override
  State<EmployeeProfileScreen> createState() => _EmployeeProfileScreenState();
}

class _EmployeeProfileScreenState extends State<EmployeeProfileScreen> {
  void _logout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Deseas salir de la app?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<AuthProvider>().logout();
              if (!context.mounted) {
                return;
              }
              Navigator.pushReplacementNamed(context, '/login');
            },
            child: const Text('Salir'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Mi perfil'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: _logout,
              tooltip: 'Cerrar sesión',
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Perfil'),
              Tab(text: 'Tareas'),
            ],
          ),
        ),
        drawer: const AppDrawer(),
        body: TabBarView(
          children: [
            _EmployeeProfileTab(auth: auth),
            const _EmployeeAssignmentsTab(),
          ],
        ),
      ),
    );
  }
}

class _EmployeeProfileTab extends StatefulWidget {
  final AuthProvider auth;

  const _EmployeeProfileTab({required this.auth});

  @override
  State<_EmployeeProfileTab> createState() => _EmployeeProfileTabState();
}

class _EmployeeProfileTabState extends State<_EmployeeProfileTab> {
  late Future<Map<String, dynamic>> _profileFuture;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  void _loadProfile() {
    final token = widget.auth.token;
    if (token == null) {
      _profileFuture = Future.value(const <String, dynamic>{});
      return;
    }

    _profileFuture = ApiService(token: token).getMyEmployeeProfile();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _profileFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'No se pudo cargar el perfil del empleado',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${snapshot.error}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          );
        }

        final profile = snapshot.data ?? const <String, dynamic>{};
        final usuario = (profile['usuario'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
        final rolesAsignados = (profile['roles_asignados'] as List?)
                ?.whereType<Map>()
                .map((e) => e.cast<String, dynamic>())
                .toList() ??
            const <Map<String, dynamic>>[];
        final displayName = (profile['nombre_completo'] ?? usuario['first_name'] ?? usuario['username'] ?? 'Empleado').toString();
        final avatarInitial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'E';

        return RefreshIndicator(
          onRefresh: () async {
            setState(_loadProfile);
            await _profileFuture;
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        child: Text(
                          avatarInitial,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Perfil del empleado', style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 4),
                            Text('Datos reales de tu cuenta de trabajo', style: Theme.of(context).textTheme.bodyMedium),
                            const SizedBox(height: 8),
                            Text(displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _SectionCard(
                title: 'Datos personales',
                children: [
                  _InfoRow(label: 'Nombre', value: profile['nombre_completo']?.toString()),
                  _InfoRow(label: 'Cédula', value: profile['ci']?.toString()),
                  _InfoRow(label: 'Teléfono', value: profile['telefono']?.toString()),
                  _InfoRow(label: 'Dirección', value: profile['direccion']?.toString()),
                  _InfoRow(label: 'Cargo', value: profile['cargo_nombre']?.toString()),
                  _InfoRow(label: 'Empresa', value: profile['empresa']?.toString()),
                ],
              ),
              const SizedBox(height: 16),
              _SectionCard(
                title: 'Cuenta de acceso',
                children: [
                  _InfoRow(label: 'Usuario', value: usuario['username']?.toString()),
                  _InfoRow(label: 'Correo', value: usuario['email']?.toString()),
                  _InfoRow(label: 'Activo', value: usuario['is_active'] == true ? 'Sí' : 'No'),
                ],
              ),
              const SizedBox(height: 16),
              _SectionCard(
                title: 'Roles asignados',
                children: [
                  if (rolesAsignados.isEmpty)
                    const Text('Sin roles asignados')
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: rolesAsignados
                          .map((role) => Chip(label: Text((role['nombre'] ?? role['id'] ?? 'rol').toString())))
                          .toList(),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.notifications),
                  title: const Text('Mis notificaciones'),
                  subtitle: const Text('Ver los avisos asignados a tu cuenta'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/notificaciones'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _EmployeeAssignmentsTab extends StatefulWidget {
  const _EmployeeAssignmentsTab();

  @override
  State<_EmployeeAssignmentsTab> createState() => _EmployeeAssignmentsTabState();
}

class _EmployeeAssignmentsTabState extends State<_EmployeeAssignmentsTab> {
  late Future<List<Map<String, dynamic>>> _assignmentsFuture;

  @override
  void initState() {
    super.initState();
    _loadAssignments();
  }

  void _loadAssignments() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.token;
    if (token != null) {
      _assignmentsFuture = ApiService(token: token).getMyAsignaciones();
    } else {
      _assignmentsFuture = Future.value([]);
    }
  }

  Future<void> _refresh() async {
    setState(_loadAssignments);
    await _assignmentsFuture;
  }

  List<Map<String, dynamic>> _splitByStatus(
    List<Map<String, dynamic>> items,
    bool attended,
  ) {
    final attendedStatuses = {'atendido', 'cerrado', 'finalizado', 'completado'};
    final pendingStatuses = {'pendiente', 'en_proceso', 'asignado', 'aceptada'};
    return items.where((item) {
      final status = (item['incidente_estado'] ?? '').toString().toLowerCase();
      if (attended) {
        return attendedStatuses.contains(status);
      }
      return pendingStatuses.contains(status) || status.isEmpty;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _assignmentsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text('Error: ${snapshot.error}'),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _refresh, child: const Text('Reintentar')),
              ],
            ),
          );
        }

        final assignments = snapshot.data ?? [];
        final activeAssignments = _splitByStatus(assignments, false);
        final completedAssignments = _splitByStatus(assignments, true);

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        child: Text(
                          (user?.fullName.isNotEmpty == true
                                  ? user!.fullName[0]
                                  : (user?.username.isNotEmpty == true ? user!.username[0] : '?'))
                              .toUpperCase(),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Tareas del empleado', style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 4),
                            Text('Solicitudes activas y completadas', style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _AssignmentsSection(
                title: 'Solicitudes activas',
                subtitle: 'Pendientes o en proceso',
                count: activeAssignments.length,
                assignments: activeAssignments,
                isCompleted: false,
              ),
              const SizedBox(height: 24),
              _AssignmentsSection(
                title: 'Solicitudes completadas',
                subtitle: 'Atendidas o finalizadas',
                count: completedAssignments.length,
                assignments: completedAssignments,
                isCompleted: true,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AssignmentsSection extends StatelessWidget {
  final String title;
  final String subtitle;
  final int count;
  final List<Map<String, dynamic>> assignments;
  final bool isCompleted;

  const _AssignmentsSection({
    required this.title,
    required this.subtitle,
    required this.count,
    required this.assignments,
    required this.isCompleted,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isCompleted ? Colors.grey[300] : Colors.blue[100],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                count.toString(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (assignments.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'No hay solicitudes',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                ),
              ),
            ),
          )
        else
          Column(
            children: assignments.map((assignment) {
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  assignment['incidente_tipo'] ?? 'Solicitud',
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  assignment['incidente_descripcion'] ?? 'Sin descripción',
                                  style: Theme.of(context).textTheme.bodySmall,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isCompleted ? Colors.green[100] : Colors.orange[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              assignment['incidente_estado'] ?? 'Desconocido',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isCompleted ? Colors.green[700] : Colors.orange[700],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _DetailChip(
                            icon: Icons.info,
                            label: assignment['servicio_nombre'] ?? 'Sin servicio',
                          ),
                          const SizedBox(width: 8),
                          _DetailChip(
                            icon: Icons.calendar_today,
                            label: assignment['fecha_asignacion'] ?? 'Sin fecha',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey[600]),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.grey),
            ),
          ),
          Expanded(
            child: Text(
              value?.isNotEmpty == true ? value! : 'N/A',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
