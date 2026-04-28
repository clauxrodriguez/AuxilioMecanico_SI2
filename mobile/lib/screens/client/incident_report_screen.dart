import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../data/vehiculo_service.dart';
import '../../data/incidente_service.dart';
import '../../models/vehicle.dart';

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
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();
  bool _loading = true;

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
    final payload = {
      'vehiculo_id': _selected!.id,
      'tipo': 'emergencia',
      'descripcion': _descCtrl.text.trim(),
      'latitud': _latCtrl.text.isEmpty ? null : double.tryParse(_latCtrl.text),
      'longitud': _lngCtrl.text.isEmpty ? null : double.tryParse(_lngCtrl.text),
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
                  TextFormField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Descripción'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _latCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Latitud'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lngCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Longitud'),
                  ),
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
