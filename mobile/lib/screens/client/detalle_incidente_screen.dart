import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../data/incidente_service.dart';
import '../../widgets/app_drawer.dart';

class DetalleIncidenteScreen extends StatefulWidget {
  const DetalleIncidenteScreen({super.key});

  @override
  State<DetalleIncidenteScreen> createState() => _DetalleIncidenteScreenState();
}

class _DetalleIncidenteScreenState extends State<DetalleIncidenteScreen> {
  String? incidenteId;
  bool loading = true;
  String? error;
  Map<String, dynamic>? incidente;

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
      final res = await svc.obtenerIncidente(incidenteId!);
      setState(() {
        incidente = res;
      });
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del incidente')),
      drawer: const AppDrawer(),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
            ? Center(child: Text('Error: $error'))
            : incidente == null
            ? const Center(child: Text('Incidente no encontrado'))
            : ListView(
                children: [
                  Text(
                    'ID: ${incidente!['id'] ?? ''}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text('Tipo: ${incidente!['tipo'] ?? ''}'),
                  const SizedBox(height: 8),
                  Text('Descripción: ${incidente!['descripcion'] ?? ''}'),
                  const SizedBox(height: 8),
                  Text('Estado: ${incidente!['estado'] ?? ''}'),
                  const SizedBox(height: 8),
                  Text('Prioridad: ${incidente!['prioridad'] ?? ''}'),
                  const SizedBox(height: 8),
                  Text(
                    'Ubicación: ${incidente!['latitud'] ?? ''}, ${incidente!['longitud'] ?? ''}',
                  ),
                ],
              ),
      ),
    );
  }
}
