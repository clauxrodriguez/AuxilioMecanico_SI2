import 'package:flutter/material.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historial de incidentes')),
      drawer: const AppDrawer(),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('No hay incidentes registrados'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final inc = items[index];
              final id = inc['id']?.toString() ?? '';
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        inc['tipo']?.toString() ?? '-',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(inc['descripcion']?.toString() ?? ''),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 12,
                        children: [
                          Text('Estado: ${inc['estado'] ?? '-'}'),
                          Text('Prioridad: ${inc['prioridad'] ?? '-'}'),
                          Text('Lat: ${inc['latitud'] ?? '-'}'),
                          Text('Lon: ${inc['longitud'] ?? '-'}'),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () {
                              Navigator.pushNamed(
                                context,
                                '/tracking',
                                arguments: {'incidente_id': id},
                              );
                            },
                            child: const Text('Ver seguimiento'),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () {
                              Navigator.pushNamed(
                                context,
                                '/detalle-incidente',
                                arguments: {'incidente_id': id},
                              );
                            },
                            child: const Text('Ver detalle'),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () async {
                              await Navigator.pushNamed(
                                context,
                                '/agregar-evidencia',
                                arguments: {'incidente_id': id},
                              );
                              // refrescar lista
                              setState(() => _loadIncidentes());
                            },
                            child: const Text('Agregar evidencia'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
