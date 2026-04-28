import 'package:flutter/material.dart';
import '../../widgets/app_drawer.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      drawer: const AppDrawer(),
      body: const Center(child: Text('Aquí se muestran los datos del perfil')),
    );
  }
}
