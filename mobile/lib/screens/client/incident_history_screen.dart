import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../widgets/app_drawer.dart';
import '../../providers/auth_provider.dart';
import '../../data/incidente_service.dart';

class IncidentHistoryScreen extends StatefulWidget {
  const IncidentHistoryScreen({super.key});

  @override
  State<IncidentHistoryScreen> createState() => _IncidentHistoryScreenState();
}

class _IncidentHistoryScreenState extends State<IncidentHistoryScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _loadIncidentes();
  }

  void _loadIncidentes() {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    final svc = IncidenteService(token: token);
    _future = svc.listarIncidentes();
  }

  Color _getEstadoColor(String? estado) {
    switch ((estado ?? '').toLowerCase()) {
      case 'pendiente':
        return Colors.orange;
      case 'asignado':
        return Colors.blue;
      case 'en_proceso':
      case 'en proceso':
        return Colors.indigo;
      case 'atendido':
        return Colors.green;
      case 'cancelado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getPrioridadColor(String? prioridad) {
    switch ((prioridad ?? '').toLowerCase()) {
      case 'baja':
        return Colors.green;
      case 'media':
        return Colors.orange;
      case 'alta':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(dynamic fecha) {
    if (fecha == null) return '-';
    try {
      final date = DateTime.parse(fecha.toString());
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return fecha.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial de Incidentes'),
        elevation: 2,
      ),
      drawer: const AppDrawer(),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
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
                    onPressed: () => setState(() => _loadIncidentes()),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay incidentes registrados',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => setState(() => _loadIncidentes()),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final inc = items[index];
                final id = inc['id']?.toString() ?? '';
                final estado = inc['estado']?.toString() ?? 'Pendiente';
                final prioridad = inc['prioridad']?.toString() ?? 'Media';
                final tipo = inc['tipo']?.toString() ?? 'Incidente';
                final descripcion = inc['descripcion']?.toString() ?? '';
                final vehiculoInfo =
                    inc['vehiculo_id']?.toString() ?? 'No especificado';

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header con tipo y estado
                      Container(
                        padding: const EdgeInsets.all(12),
                        color: _getEstadoColor(estado).withOpacity(0.1),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tipo,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'ID: #$id',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _getEstadoColor(estado),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    estado.replaceAll('_', ' ').toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _getPrioridadColor(prioridad),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    'Prioridad: ${prioridad.toUpperCase()}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Contenido principal
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Descripción
                            if (descripcion.isNotEmpty) ...[
                              Text(
                                'Descripción',
                                style: Theme.of(context).textTheme.labelLarge,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                descripcion,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13),
                              ),
                              const SizedBox(height: 12),
                            ],

                            // Info grid
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              childAspectRatio: 2.2,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                              children: [
                                _infoItem(
                                  'Vehículo',
                                  vehiculoInfo,
                                  Icons.directions_car,
                                ),
                                _infoItem(
                                  'Ubicación',
                                  '${(inc['latitud'] ?? 0).toStringAsFixed(4)}, ${(inc['longitud'] ?? 0).toStringAsFixed(4)}',
                                  Icons.location_on,
                                ),
                                _infoItem(
                                  'Fecha',
                                  _formatDate(
                                    inc['creado_en'] ?? inc['fecha_creacion'],
                                  ),
                                  Icons.calendar_today,
                                ),
                                if (inc['empleado_id'] != null) ...[
                                  _infoItem(
                                    'Técnico',
                                    'Asignado',
                                    Icons.person,
                                  ),
                                ] else ...[
                                  _infoItem(
                                    'Técnico',
                                    'Pendiente',
                                    Icons.person,
                                  ),
                                ],
                              ],
                            ),

                            const SizedBox(height: 12),

                            // Botones de acción
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      Navigator.pushNamed(
                                        context,
                                        '/tracking',
                                        arguments: {'incidente_id': id},
                                      );
                                    },
                                    icon: const Icon(
                                      Icons.track_changes,
                                      size: 18,
                                    ),
                                    label: const Text('Ver Seguimiento'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.blue,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextButton.icon(
                                    onPressed: () {
                                      Navigator.pushNamed(
                                        context,
                                        '/detalle-incidente',
                                        arguments: {'incidente_id': id},
                                      );
                                    },
                                    icon: const Icon(
                                      Icons.info_outline,
                                      size: 18,
                                    ),
                                    label: const Text('Detalles'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _infoItem(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: Colors.blue),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Expanded(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
