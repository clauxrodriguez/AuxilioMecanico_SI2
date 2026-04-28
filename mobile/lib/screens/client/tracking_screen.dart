import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';

class TrackingScreen extends StatelessWidget {
  const TrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seguimiento del servicio')),
      drawer: const AppDrawer(),
      body: const Center(
        child: Text('Mapa/seguimiento del servicio (placeholder)'),
      ),
    );
  }
}
