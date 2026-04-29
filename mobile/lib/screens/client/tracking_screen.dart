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
      case 'en_proceso':
      case 'en proceso':
        return 2;
      case 'atendido':
        return 3;
      case 'cancelado':
        return 4;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seguimiento del incidente')),
      drawer: const AppDrawer(),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
            ? Center(child: Text('Error: $error'))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Incidente: ${incidenteId ?? '-'}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  if (tracking != null) ...[
                    Text('Estado actual: ${tracking!['estado'] ?? '-'}'),
                    const SizedBox(height: 8),
                    Stepper(
                      currentStep: _stateIndexFromString(
                        tracking!['estado']?.toString(),
                      ),
                      steps: const [
                        Step(
                          title: Text('Pendiente'),
                          content: SizedBox.shrink(),
                        ),
                        Step(
                          title: Text('Asignado'),
                          content: SizedBox.shrink(),
                        ),
                        Step(
                          title: Text('En proceso'),
                          content: SizedBox.shrink(),
                        ),
                        Step(
                          title: Text('Atendido'),
                          content: SizedBox.shrink(),
                        ),
                        Step(
                          title: Text('Cancelado'),
                          content: SizedBox.shrink(),
                        ),
                      ],
                      controlsBuilder: (_, __) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ubicación incidente: ${tracking!['latitud_incidente'] ?? '-'}, ${tracking!['longitud_incidente'] ?? '-'}',
                    ),
                    const SizedBox(height: 8),
                    if (tracking!['empleado_id'] != null) ...[
                      Text(
                        'Técnico asignado: ${tracking!['tecnico_nombre'] ?? '-'}',
                      ),
                      Text('Empleado ID: ${tracking!['empleado_id']}'),
                      const SizedBox(height: 8),
                    ],
                    ElevatedButton.icon(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Actualizar seguimiento'),
                    ),
                    const SizedBox(height: 12),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Text(
                      'Técnicos / talleres cercanos',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Expanded(
                    child: tecnicos.isEmpty
                        ? const Center(
                            child: Text(
                              'No hay técnicos disponibles cerca de tu ubicación',
                            ),
                          )
                        : ListView.builder(
                            itemCount: tecnicos.length,
                            itemBuilder: (context, i) {
                              final t = tecnicos[i];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(
                                    t['nombre_completo'] ?? 'Técnico cercano',
                                  ),
                                  subtitle: Text(
                                    '${t['empresa_nombre'] ?? ''} • Dist: ${t['distancia_km'] ?? '-'} km',
                                  ),
                                  trailing: t['disponible'] == true
                                      ? const Icon(
                                          Icons.check_circle,
                                          color: Colors.green,
                                        )
                                      : const Icon(
                                          Icons.remove_circle,
                                          color: Colors.grey,
                                        ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}
