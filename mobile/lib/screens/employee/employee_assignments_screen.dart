import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_service.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';

class EmployeeAssignmentsScreen extends StatefulWidget {
  const EmployeeAssignmentsScreen({super.key});

  @override
  State<EmployeeAssignmentsScreen> createState() => _EmployeeAssignmentsScreenState();
}

class _EmployeeAssignmentsScreenState extends State<EmployeeAssignmentsScreen> {
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
              Navigator.pushReplacementNamed(context, '/login');
            },
            child: const Text('Salir'),
          ),
        ],
      ),
    );
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis asignaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: FutureBuilder<List<Map<String, dynamic>>>(
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
                  ElevatedButton(
                    onPressed: _refresh,
                    child: const Text('Reintentar'),
                  ),
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
                _AssignmentsHeader(user: user),
                const SizedBox(height: 24),
                // Active assignments
                _AssignmentsSection(
                  title: 'Solicitudes activas',
                  subtitle: 'Pendientes o en proceso',
                  count: activeAssignments.length,
                  assignments: activeAssignments,
                  isCompleted: false,
                ),
                const SizedBox(height: 24),
                // Completed assignments
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
      ),
    );
  }
}

class _AssignmentsHeader extends StatelessWidget {
  final User? user;

  const _AssignmentsHeader({required this.user});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mis asignaciones',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aquí ves solo las solicitudes que te asignaron',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
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
