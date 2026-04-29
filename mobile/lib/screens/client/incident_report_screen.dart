import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../data/vehiculo_service.dart';
import '../../data/incidente_service.dart';
import '../../models/vehicle.dart';
import 'package:geolocator/geolocator.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:speech_to_text/speech_to_text.dart';

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
  PlatformFile? _pickedFile;
  String? _pickedTipo; // 'foto' or 'audio'
  final SpeechToText _speechToText = SpeechToText();
  bool _isListening = false;
  String _baseDescriptionBeforeDictation = '';
  final _evidenceTextCtrl = TextEditingController();

  bool _loading = true;
  double? _latitud;
  double? _longitud;
  final int _prioridad = 1;

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

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
      _showSnack('Error cargando vehículos: $e');
    }
  }

  Future<void> _submit() async {
    if (_selected == null) {
      _showSnack('Selecciona un vehículo');
      return;
    }
    // Validar que se haya seleccionado ubicación
    if (_latitud == null || _longitud == null) {
      _showSnack('Selecciona una ubicación en el mapa');
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
      final svc = IncidenteService(token: token);
      final res = await svc.crearIncidente(payload);
      final incidenteId = res['id']?.toString();

      // If there is a selected file or evidence text, upload it
      if (incidenteId != null) {
        if (_pickedFile != null) {
          // determine tipo (fallback to foto)
          final tipoToSend = _pickedTipo ?? 'foto';
          await svc.subirEvidenciaArchivo(
            incidenteId,
            _pickedFile!,
            tipo: tipoToSend,
            texto: _evidenceTextCtrl.text.trim(),
          );
        } else if (_evidenceTextCtrl.text.trim().isNotEmpty) {
          await svc.agregarEvidenciaTexto(
            incidenteId,
            tipo: 'texto',
            texto: _evidenceTextCtrl.text.trim(),
          );
        }
      }

      if (!mounted) return;
      _showSnack('Incidente creado');
      if (!mounted) return;
      Navigator.pushNamed(context, '/historial-incidentes');
    } catch (e) {
      if (!mounted) return;
      _showSnack('Error creando incidente: $e');
    }
  }

  Future<void> _pickImage() async {
    final res = await FilePicker.pickFiles(
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png'],
    );
    if (res != null && res.files.isNotEmpty) {
      setState(() {
        _pickedFile = res.files.first;
        _pickedTipo = 'foto';
      });
    }
  }

  // Note: recording-as-file removed; only dictation via speech_to_text is used.

  Future<void> _toggleDictation() async {
    if (_isListening) {
      _speechToText.stop();
      setState(() => _isListening = false);
      return;
    }

    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (!mounted) return;
      _showSnack('Permiso de micrófono denegado');
      return;
    }

    final available = await _speechToText.initialize(
      onStatus: (status) {
        if (status == 'notListening' || status == 'done') {
          if (mounted) setState(() => _isListening = false);
        }
      },
    );
    if (!available) {
      if (!mounted) return;
      _showSnack('Reconocimiento de voz no disponible');
      return;
    }

    // Save base text to avoid duplicates from partial results
    _baseDescriptionBeforeDictation = _descCtrl.text;

    setState(() => _isListening = true);
    _speechToText.listen(
      onResult: (result) {
        final recognized = result.recognizedWords ?? '';
        final base = _baseDescriptionBeforeDictation.trim();
        final combined = base.isEmpty
            ? recognized
            : '$base ${recognized.trim()}';
        setState(() {
          _descCtrl.text = combined;
          _descCtrl.selection = TextSelection.fromPosition(
            TextPosition(offset: _descCtrl.text.length),
          );
        });

        if (result.finalResult) {
          _speechToText.stop();
          if (mounted) setState(() => _isListening = false);
        }
      },
      listenMode: ListenMode.dictation,
      partialResults: true,
      localeId: 'es_BO',
    );
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _evidenceTextCtrl.dispose();
    try {
      _speechToText.stop();
    } catch (_) {}
    super.dispose();
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
                        _showSnack('Activa el servicio de ubicación');
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
                        _showSnack('Permiso de ubicación denegado');
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
                        _showSnack('Error obteniendo ubicación: $e');
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
                  const SizedBox(height: 8),
                  TextField(
                    controller: _evidenceTextCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Texto de evidencia (opcional)',
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _toggleDictation,
                        icon: Icon(
                          _isListening ? Icons.mic_off : Icons.mic_none,
                        ),
                        label: Text(
                          _isListening
                              ? 'Detener dictado'
                              : 'Dictar descripción',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _isListening ? 'Escuchando...' : '',
                          style: const TextStyle(fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _pickImage,
                              icon: const Icon(Icons.camera_alt),
                              label: const Text('Agregar foto'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_pickedFile != null)
                        Text(
                          '${_pickedFile!.name} (${_pickedTipo ?? 'archivo'})',
                          style: const TextStyle(fontSize: 14),
                        ),
                    ],
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
