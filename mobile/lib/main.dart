import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/admin/admin_home_screen.dart';
import 'screens/client/client_home_screen.dart';
import 'screens/client/profile_screen.dart';
import 'screens/client/vehicles_list_screen.dart';
import 'screens/client/vehicle_register_screen.dart';
import 'screens/client/incident_report_screen.dart';
import 'screens/client/incident_history_screen.dart';
import 'screens/client/tracking_screen.dart';
import 'screens/employee/employee_home_screen.dart';
import 'core/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Auxilio Mecánico',
        theme: AppTheme.lightTheme,
        debugShowCheckedModeBanner: false,
        home: const AuthCheck(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/perfil': (context) => const ProfileScreen(),
          '/vehiculos': (context) => const VehiclesListScreen(),
          '/registrar-vehiculo': (context) => const VehicleRegisterScreen(),
          '/registrar-incidente': (context) => const IncidentReportScreen(),
          '/historial-incidentes': (context) => const IncidentHistoryScreen(),
          '/tracking': (context) => const TrackingScreen(),
        },
      ),
    );
  }
}

/// Widget que verifica el estado de autenticación y redirige a la pantalla correspondiente
class AuthCheck extends StatelessWidget {
  const AuthCheck({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (authProvider.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (!authProvider.isAuthenticated) {
      return const LoginScreen();
    }

    // Redirige según el rol del usuario
    final userRole = authProvider.userRole;
    if (userRole == 'admin') {
      return const AdminHomeScreen();
    } else if (userRole == 'cliente') {
      return const ClientHomeScreen();
    } else if (userRole == 'empleado') {
      return const EmployeeHomeScreen();
    }

    return const LoginScreen();
  }
}
