import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../widgets/app_drawer.dart';
import '../../providers/auth_provider.dart';
import '../../data/incidente_service.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  String? incidenteId;
  bool loading = true;
  String? error;
  Map<String, dynamic>? tracking;
  List<Map<String, dynamic>> tecnicos = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    incidenteId = args != null ? args['incidente_id']?.toString() : null;
    _load();
  }

  Future<void> _load() async {
    if (incidenteId == null) return;
    setState(() {
      loading = true;
      error = null;
    });
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    final svc = IncidenteService(token: token);
    try {
      final t = await svc.obtenerTracking(incidenteId!);
      setState(() {
        tracking = t;
      });

      final lat = (t['latitud_incidente'] as num?)?.toDouble();
      final lon = (t['longitud_incidente'] as num?)?.toDouble();
      if (lat != null && lon != null) {
        final list = await svc.listarTecnicosCercanos(lat, lon);
        setState(() {
          tecnicos = list;
        });
      }
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  int _stateIndexFromString(String? s) {
    switch ((s ?? '').toLowerCase()) {
      case 'pendiente':
        return 0;
      case 'asignado':
        return 1;
      case 'aceptado':
        return 1; // Mismo que asignado
      case 'en_proceso':
      case 'en proceso':
      case 'en_camino':
      case 'en camino':
        return 2;
      case 'atendido':
        return 3;
      case 'cancelado':
        return 4;
      default:
        return 0;
    }
  }

  Color _getEstadoColor(String? estado) {
    switch ((estado ?? '').toLowerCase()) {
      case 'pendiente':
        return Colors.orange;
      case 'asignado':
      case 'aceptado':
        return Colors.blue;
      case 'en_proceso':
      case 'en proceso':
      case 'en_camino':
      case 'en camino':
        return Colors.indigo;
      case 'atendido':
        return Colors.green;
      case 'cancelado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusMessage(String? estado) {
    switch ((estado ?? '').toLowerCase()) {
      case 'pendiente':
        return 'Aún no hay técnico asignado. Estamos buscando talleres cercanos.';
      case 'asignado':
        return 'Se ha asignado un técnico a tu solicitud.';
      case 'aceptado':
        return 'El técnico aceptó tu solicitud.';
      case 'en_proceso':
      case 'en proceso':
      case 'en_camino':
      case 'en camino':
        return 'El técnico se dirige a tu ubicación.';
      case 'atendido':
        return 'Servicio finalizado.';
      case 'cancelado':
        return 'La solicitud fue cancelada.';
      default:
        return 'Estado desconocido.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguimiento del Incidente'),
        elevation: 2,
      ),
      drawer: const AppDrawer(),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: $error'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _load,
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            )
          : tracking == null
          ? const Center(child: Text('No hay datos de seguimiento'))
          : RefreshIndicator(
              onRefresh: _load,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header con ID del incidente
                    Card(
                      elevation: 2,
                      color: Colors.grey[50],
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Incidente #$incidenteId',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: _getEstadoColor(tracking!['estado']),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                (tracking!['estado'] ?? '')
                                    .toString()
                                    .replaceAll('_', ' ')
                                    .toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Mensaje de estado personalizado
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _getEstadoColor(
                          tracking!['estado'],
                        ).withValues(alpha: 0.1),
                        border: Border(
                          left: BorderSide(
                            color: _getEstadoColor(tracking!['estado']),
                            width: 4,
                          ),
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            tracking!['estado'].toString().toLowerCase() ==
                                    'atendido'
                                ? Icons.check_circle
                                : tracking!['estado']
                                          .toString()
                                          .toLowerCase() ==
                                      'cancelado'
                                ? Icons.cancel
                                : Icons.info,
                            color: _getEstadoColor(tracking!['estado']),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _getStatusMessage(tracking!['estado']),
                              style: TextStyle(
                                color: _getEstadoColor(tracking!['estado']),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Stepper de progreso
                    _buildProgressStepper(),

                    const SizedBox(height: 20),

                    // Información del incidente
                    _buildSectionTitle('Información del Incidente'),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            _buildInfoRow(
                              'Tipo',
                              tracking!['tipo']?.toString() ?? '-',
                              Icons.category,
                            ),
                            const Divider(),
                            _buildInfoRow(
                              'Descripción',
                              tracking!['descripcion']?.toString() ?? '-',
                              Icons.description,
                            ),
                            const Divider(),
                            _buildInfoRow(
                              'Prioridad',
                              tracking!['prioridad']?.toString() ?? '-',
                              Icons.priority_high,
                            ),
                            const Divider(),
                            _buildInfoRow(
                              'Ubicación',
                              '${(tracking!['latitud_incidente'] ?? 0).toStringAsFixed(4)}, ${(tracking!['longitud_incidente'] ?? 0).toStringAsFixed(4)}',
                              Icons.location_on,
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Información del técnico
                    if (tracking!['empleado_id'] != null) ...[
                      _buildSectionTitle('Técnico Asignado'),
                      const SizedBox(height: 8),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            children: [
                              _buildInfoRow(
                                'Nombre',
                                tracking!['tecnico_nombre'] ?? '-',
                                Icons.person,
                              ),
                              const Divider(),
                              _buildInfoRow(
                                'Empresa',
                                tracking!['tecnico_empresa'] ??
                                    'No especificada',
                                Icons.business,
                              ),
                              const Divider(),
                              _buildInfoRow(
                                'Disponibilidad',
                                tracking!['tecnico_disponible'] == true
                                    ? 'Disponible'
                                    : 'Ocupado',
                                Icons.done_outline,
                                color: tracking!['tecnico_disponible'] == true
                                    ? Colors.green
                                    : Colors.orange,
                              ),
                              if (tracking!['tecnico_latitud'] != null &&
                                  tracking!['tecnico_longitud'] != null) ...[
                                const Divider(),
                                _buildInfoRow(
                                  'Ubicación del Técnico',
                                  '${(tracking!['tecnico_latitud'] ?? 0).toStringAsFixed(4)}, ${(tracking!['tecnico_longitud'] ?? 0).toStringAsFixed(4)}',
                                  Icons.location_on,
                                  color: Colors.blue,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.orange[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange[200]!),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.hourglass_empty,
                              color: Colors.orange[700],
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Buscando técnico disponible...',
                                style: TextStyle(
                                  color: Colors.orange[700],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Técnicos cercanos
                    _buildSectionTitle('Técnicos Cercanos Disponibles'),
                    const SizedBox(height: 8),
                    if (tecnicos.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'No hay técnicos disponibles cerca de tu ubicación',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[700]),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: tecnicos.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final t = tecnicos[i];
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: t['disponible'] == true
                                    ? Colors.green
                                    : Colors.grey,
                                child: Icon(
                                  t['disponible'] == true
                                      ? Icons.check
                                      : Icons.close,
                                  color: Colors.white,
                                ),
                              ),
                              title: Text(
                                t['nombre_completo'] ?? 'Técnico cercano',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                    t['empresa_nombre'] ?? 'Sin empresa',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                  Text(
                                    'Distancia: ${(t['distancia_km'] ?? 0).toStringAsFixed(1)} km',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.blue,
                                    ),
                                  ),
                                ],
                              ),
                              trailing: t['disponible'] == true
                                  ? const Chip(
                                      label: Text('Disponible'),
                                      backgroundColor: Colors.green,
                                      labelStyle: TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    )
                                  : const Chip(
                                      label: Text('Ocupado'),
                                      backgroundColor: Colors.grey,
                                      labelStyle: TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    ),
                            ),
                          );
                        },
                      ),

                    const SizedBox(height: 20),

                    // Botón de actualizar
                    ElevatedButton.icon(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Actualizar Seguimiento'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProgressStepper() {
    final currentStep = _stateIndexFromString(tracking!['estado']);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Stepper(
        currentStep: currentStep,
        onStepTapped: null,
        controlsBuilder: (_, __) => const SizedBox.shrink(),
        steps: [
          Step(
            title: const Text('Pendiente'),
            isActive: currentStep >= 0,
            state: currentStep > 0 ? StepState.complete : StepState.indexed,
            content: const SizedBox.shrink(),
          ),
          Step(
            title: const Text('Asignado'),
            isActive: currentStep >= 1,
            state: currentStep > 1 ? StepState.complete : StepState.indexed,
            content: const SizedBox.shrink(),
          ),
          Step(
            title: const Text('En Camino'),
            isActive: currentStep >= 2,
            state: currentStep > 2 ? StepState.complete : StepState.indexed,
            content: const SizedBox.shrink(),
          ),
          Step(
            title: const Text('Atendido'),
            isActive: currentStep >= 3,
            state: currentStep > 3 ? StepState.complete : StepState.indexed,
            content: const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value,
    IconData icon, {
    Color? color,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: color ?? Colors.blue),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
