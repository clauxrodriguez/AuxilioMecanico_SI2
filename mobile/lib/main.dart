import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/admin/admin_home_screen.dart';
import 'screens/admin/admin_profile_screen.dart';
import 'screens/client/profile_screen.dart';
import 'screens/client/vehicles_list_screen.dart';
import 'screens/client/vehicle_register_screen.dart';
import 'screens/client/incident_report_screen.dart';
import 'screens/client/incident_history_screen.dart';
import 'screens/client/tracking_screen.dart';
import 'screens/client/agregar_evidencia_screen.dart';
import 'screens/client/detalle_incidente_screen.dart';
import 'screens/client/seleccionar_ubicacion_screen.dart';
import 'screens/employee/employee_profile_screen.dart';
import 'screens/employee/employee_assignments_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'core/theme.dart';
import 'services/notification_service.dart';

/// Manejador de mensajes en background
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    await NotificationService.handleBackgroundMessage(message);
  } catch (e) {
    debugPrint('Firebase no disponible en background: $e');
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Capturar excepciones que ocurran fuera de la zona Flutter
  FlutterError.onError = (FlutterErrorDetails details) {
    debugPrint('❌ FLUTTER ERROR: ${details.exception}');
    debugPrint('Stack trace: ${details.stack}');
  };

  try {
    debugPrint('🔥 Inicializando Firebase...');
    await Firebase.initializeApp();
    debugPrint('✅ Firebase inicializado');
    
    FirebaseMessaging.onBackgroundMessage(
      _firebaseMessagingBackgroundHandler,
    );
    debugPrint('✅ Background message handler registrado');
  } catch (e) {
    debugPrint('⚠️ No se pudo inicializar Firebase en main: $e');
  }

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
          '/perfil': (context) => const ProfileEntryScreen(),
          '/profile': (context) => const ProfileEntryScreen(),
          '/admin/panel': (context) => const AdminHomeScreen(initialTab: 1),
          '/vehiculos': (context) => const VehiclesListScreen(),
          '/registrar-vehiculo': (context) => const VehicleRegisterScreen(),
          '/registrar-incidente': (context) => const IncidentReportScreen(),
          '/solicitud-auxilio': (context) => const IncidentReportScreen(),
          '/agregar-evidencia': (context) => const AgregarEvidenciaScreen(),
          '/seleccionar-ubicacion': (context) =>
              const SeleccionarUbicacionScreen(),
          '/historial-incidentes': (context) => const IncidentHistoryScreen(),
          '/tracking': (context) => const TrackingScreen(),
          '/detalle-incidente': (context) => const DetalleIncidenteScreen(),
          '/empleado/perfil': (context) => const EmployeeProfileScreen(),
          '/empleado/asignaciones': (context) => const EmployeeAssignmentsScreen(),
          '/notificaciones': (context) => const NotificationsScreen(),
        },
      ),
    );
  }
}

class ProfileEntryScreen extends StatelessWidget {
  const ProfileEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    if (authProvider.userRole == 'admin') {
      return const AdminProfileScreen();
    }
    if (authProvider.userRole == 'empleado') {
      return const EmployeeProfileScreen();
    }
    return const ProfileScreen();
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
    try {
      final authProvider = Provider.of<AuthProvider>(context);

      if (authProvider.isLoading) {
        debugPrint('⏳ AuthCheck: Usuario cargando...');
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }

      if (!authProvider.isAuthenticated) {
        debugPrint('🔓 AuthCheck: Usuario no autenticado -> LoginScreen');
        return const LoginScreen();
      }

      // Inicializar listeners cuando se autentica
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          authProvider.initializeNotificationListeners(context);
        } catch (e) {
          debugPrint('⚠️ Error inicializando notification listeners: $e');
        }
      });

      // Redirige directamente al perfil correspondiente según el rol.
      final userRole = authProvider.userRole;
      debugPrint('🔀 ROUTING: Rol del usuario = $userRole');
      
      if (userRole == 'admin') {
        debugPrint('🔀 -> Dirigiendo a AdminProfileScreen');
        return const AdminProfileScreen();
      }

      if (userRole == 'cliente') {
        debugPrint('🔀 -> Dirigiendo a ProfileScreen');
        return const ProfileScreen();
      }

      if (userRole == 'empleado') {
        debugPrint('🔀 -> Dirigiendo a EmployeeProfileScreen');
        return const EmployeeProfileScreen();
      }

      debugPrint('🔀 -> Rol desconocido: "$userRole", dirigiendo a LoginScreen');
      return const LoginScreen();
    } catch (e, stackTrace) {
      debugPrint('❌ ERROR EN AuthCheck.build(): $e');
      debugPrint('Stack trace: $stackTrace');
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, color: Colors.red, size: 64),
              const SizedBox(height: 16),
              const Text('Error Crítico',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  e.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}
