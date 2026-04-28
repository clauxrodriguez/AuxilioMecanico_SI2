import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../data/vehiculo_service.dart';
import '../../data/incidente_service.dart';
import '../../models/vehicle.dart';
import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';

class IncidentReportScreen extends StatelessWidget {
  const IncidentReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _IncidentReportForm();
  }
}

class _IncidentReportForm extends StatefulWidget {
  const _IncidentReportForm({super.key});

  @override
  State<_IncidentReportForm> createState() => _IncidentReportFormState();
}

class _IncidentReportFormState extends State<_IncidentReportForm> {
  List<Vehicle> _vehicles = [];
  Vehicle? _selected;
  final _descCtrl = TextEditingController();

  bool _loading = true;
  double? _latitud;
  double? _longitud;
  int _prioridad = 1;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final list = await VehiculoService(token: token).getMisVehiculos();
      if (!mounted) return;
      setState(() {
        _vehicles = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error cargando vehículos: $e')));
    }
  }

  Future<void> _submit() async {
    if (_selected == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Selecciona un vehículo')));
      return;
    }
    // Validar que se haya seleccionado ubicación
    if (_latitud == null || _longitud == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una ubicación en el mapa')),
      );
      return;
    }
    final payload = {
      'vehiculo_id': _selected!.id,
      'tipo': 'emergencia',
      'descripcion': _descCtrl.text.trim(),
      'prioridad': _prioridad,
      'latitud': _latitud,
      'longitud': _longitud,
    };
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      await IncidenteService(token: token).crearIncidente(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Incidente creado')));
      Navigator.pushNamed(context, '/historial-incidentes');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error creando incidente: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar incidente')),
      drawer: const AppDrawer(),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<Vehicle>(
                    initialValue: _selected,
                    items: _vehicles
                        .map(
                          (v) => DropdownMenuItem(
                            value: v,
                            child: Text('${v.marca ?? ''} ${v.modelo ?? ''}'),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _selected = v),
                    decoration: const InputDecoration(labelText: 'Vehículo'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () async {
                      final result = await Navigator.pushNamed(
                        context,
                        '/seleccionar-ubicacion',
                      );
                      if (result is Map) {
                        setState(() {
                          _latitud = (result['latitud'] as num?)?.toDouble();
                          _longitud = (result['longitud'] as num?)?.toDouble();
                        });
                      }
                    },
                    child: const Text('Seleccionar ubicación en mapa'),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () async {
                      // Solicitar permisos y obtener ubicación actual
                      bool serviceEnabled =
                          await Geolocator.isLocationServiceEnabled();
                      if (!mounted) return;
                      if (!serviceEnabled) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Activa el servicio de ubicación'),
                          ),
                        );
                        return;
                      }
                      LocationPermission permission =
                          await Geolocator.checkPermission();
                      if (!mounted) return;
                      if (permission == LocationPermission.denied) {
                        permission = await Geolocator.requestPermission();
                        if (!mounted) return;
                      }
                      if (permission == LocationPermission.denied ||
                          permission == LocationPermission.deniedForever) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Permiso de ubicación denegado'),
                          ),
                        );
                        return;
                      }
                      try {
                        final pos = await Geolocator.getCurrentPosition();
                        if (!mounted) return;
                        setState(() {
                          _latitud = pos.latitude;
                          _longitud = pos.longitude;
                        });
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error obteniendo ubicación: $e'),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.my_location),
                    label: const Text('Usar mi ubicación actual'),
                  ),
                  const SizedBox(height: 8),
                  if (_latitud != null && _longitud != null)
                    Text(
                      'Ubicación seleccionada: ${_latitud!.toStringAsFixed(6)}, ${_longitud!.toStringAsFixed(6)}',
                    ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Descripción'),
                  ),
                  const SizedBox(height: 12),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _submit,
                    child: const Text('Reportar'),
                  ),
                ],
              ),
            ),
    );
  }
}
