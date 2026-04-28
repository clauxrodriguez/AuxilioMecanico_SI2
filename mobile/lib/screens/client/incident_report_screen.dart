import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';

class IncidentReportScreen extends StatelessWidget {
  const IncidentReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar incidente')),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Formulario de reporte de incidente (placeholder)'),
      ),
    );
  }
}
