import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
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
import 'screens/client/agregar_evidencia_screen.dart';
import 'screens/client/detalle_incidente_screen.dart';
import 'screens/client/seleccionar_ubicacion_screen.dart';
import 'screens/employee/employee_home_screen.dart';
import 'core/theme.dart';
import 'services/notification_service.dart';

/// Manejador de mensajes en background
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await NotificationService.handleBackgroundMessage(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializar Firebase
  await Firebase.initializeApp();

  // Configurar el manejador de mensajes en background
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Solicitar permisos de notificación (iOS)
  await FirebaseMessaging.instance.requestPermission();

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
          '/agregar-evidencia': (context) => const AgregarEvidenciaScreen(),
          '/seleccionar-ubicacion': (context) =>
              const SeleccionarUbicacionScreen(),
          '/historial-incidentes': (context) => const IncidentHistoryScreen(),
          '/tracking': (context) => const TrackingScreen(),
          '/detalle-incidente': (context) => const DetalleIncidenteScreen(),
        },
      ),
    );
  }
}

/// Widget que verifica el estado de autenticación y redirige a la pantalla correspondiente
class AuthCheck extends StatefulWidget {
  const AuthCheck({super.key});

  @override
  State<AuthCheck> createState() => _AuthCheckState();
}

class _AuthCheckState extends State<AuthCheck> {
  @override
  void initState() {
    super.initState();
    // Inicializar listeners de notificaciones después de que el widget esté montado
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (authProvider.isAuthenticated) {
        authProvider.initializeNotificationListeners(context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (authProvider.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (!authProvider.isAuthenticated) {
      return const LoginScreen();
    }

    // Inicializar listeners cuando se autentica
    WidgetsBinding.instance.addPostFrameCallback((_) {
      authProvider.initializeNotificationListeners(context);
    });

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
