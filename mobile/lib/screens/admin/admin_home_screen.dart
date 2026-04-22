import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../data/api_service.dart';
import '../../models/user.dart';
import '../../widgets/custom_app_bar.dart';

/// Pantalla Home para Administrador
class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  late Future<List<User>> _employeesFuture;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  void _loadEmployees() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.token != null) {
      _employeesFuture = ApiService(token: authProvider.token)
          .getEmployees()
          .catchError((e) {
        setState(() => _errorMessage = 'Error al cargar empleados: $e');
        return <User>[];
      });
    }
  }

  Future<void> _handleRefresh() async {
    setState(() => _loadEmployees());
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar Sesión'),
        content: const Text('¿Estás seguro de que deseas cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Panel Administrador',
        user: user,
        onLogout: () => _handleLogout(context),
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bienvenida
              Text(
                'Bienvenido, ${user?.fullName ?? 'Administrador'}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Gestiona empleados, cargos y permisos desde aquí',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey,
                    ),
              ),
              const SizedBox(height: 32),

              // Tarjetas de acceso rápido
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                children: [
                  _AdminCardTile(
                    icon: Icons.people,
                    title: 'Empleados',
                    subtitle: 'Gestionar empleados',
                    color: Colors.blue,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Función disponible en la sección de abajo'),
                        ),
                      );
                    },
                  ),
                  _AdminCardTile(
                    icon: Icons.work,
                    title: 'Cargos',
                    subtitle: 'Gestionar cargos',
                    color: Colors.green,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Navegación a Cargos en desarrollo'),
                        ),
                      );
                    },
                  ),
                  _AdminCardTile(
                    icon: Icons.security,
                    title: 'Roles',
                    subtitle: 'Gestionar roles',
                    color: Colors.orange,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Navegación a Roles en desarrollo'),
                        ),
                      );
                    },
                  ),
                  _AdminCardTile(
                    icon: Icons.verified_user,
                    title: 'Permisos',
                    subtitle: 'Gestionar permisos',
                    color: Colors.purple,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Navegación a Permisos en desarrollo'),
                        ),
                      );
                    },
                  ),
                ],
              ),

              const SizedBox(height: 40),

              // Título de lista de empleados
              Text(
                'Lista de Empleados',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),

              // Error message
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),

              // Lista de empleados
              FutureBuilder<List<User>>(
                future: _employeesFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('Error: ${snapshot.error}'),
                      ),
                    );
                  }

                  final employees = snapshot.data ?? [];

                  if (employees.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(
                              Icons.people_outline,
                              size: 64,
                              color: Colors.grey[300],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No hay empleados registrados',
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.grey,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: employees.length,
                    itemBuilder: (context, index) {
                      final employee = employees[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue,
                            child: Text(
                              employee.fullName[0].toUpperCase(),
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                          title: Text(employee.fullName),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(employee.email),
                              Text('@${employee.username}'),
                            ],
                          ),
                          trailing: PopupMenuButton(
                            itemBuilder: (context) => [
                              PopupMenuItem(
                                child: const Row(
                                  children: [
                                    Icon(Icons.edit, size: 20),
                                    SizedBox(width: 8),
                                    Text('Editar'),
                                  ],
                                ),
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Editar empleado en desarrollo'),
                                    ),
                                  );
                                },
                              ),
                              PopupMenuItem(
                                child: const Row(
                                  children: [
                                    Icon(Icons.delete, size: 20),
                                    SizedBox(width: 8),
                                    Text('Eliminar'),
                                  ],
                                ),
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Eliminar empleado en desarrollo'),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Crear nuevo empleado en desarrollo'),
            ),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

/// Widget para tarjeta de acceso rápido en admin
class _AdminCardTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _AdminCardTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      child: InkWell(
        onTap: onTap,
        child: Card(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 40, color: color),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
