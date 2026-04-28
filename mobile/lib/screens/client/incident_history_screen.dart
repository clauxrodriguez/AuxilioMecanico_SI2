import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';

class IncidentHistoryScreen extends StatelessWidget {
  const IncidentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historial de incidentes')),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Lista de incidentes reportados (placeholder)'),
      ),
    );
  }
}
