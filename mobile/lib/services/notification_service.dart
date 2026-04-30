import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Servicio para manejar notificaciones de Firebase Cloud Messaging
class NotificationService {
  static final FirebaseMessaging _firebaseMessaging =
      FirebaseMessaging.instance;

  /// Inicializar listeners de notificaciones
  static void initializeNotifications(
    BuildContext context,
    Function(String?) onIncidentNotification,
  ) {
    print(
      '[NotificationService] 🔄 Inicializando listeners de notificaciones...',
    );

    // Escuchar mensajes cuando la app está en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print(
        '[NotificationService] 📬 FOREGROUND: Mensaje recibido mientras app está abierta',
      );
      _handleForegroundMessage(context, message, onIncidentNotification);
    });

    // Escuchar cuando se abre la app desde una notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print(
        '[NotificationService] 📱 APP OPENED: Usuario abrió app desde notificación',
      );
      _handleMessageOpenedApp(context, message, onIncidentNotification);
    });

    print('[NotificationService] ✅ Listeners inicializados correctamente');
  }

  /// Obtener FCM token
  static Future<String?> getToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      if (token != null) {
        print('[NotificationService] FCM Token obtenido exitosamente');
        print('[NotificationService]  Token: ${token.substring(0, 50)}...');
      } else {
        print('[NotificationService]  No se obtuvo FCM token (null)');
      }
      return token;
    } catch (e) {
      print('[NotificationService]  Error obteniendo FCM token: $e');
      return null;
    }
  }

  /// Manejador para mensajes en background
  static Future<void> handleBackgroundMessage(RemoteMessage message) async {
    print(
      '[NotificationService] 🌙 BACKGROUND: Mensaje recibido en background',
    );
    print('[NotificationService] 📋 Message ID: ${message.messageId}');
    print('[NotificationService] 📨 Título: ${message.notification?.title}');
    print('[NotificationService] 📝 Body: ${message.notification?.body}');
    if (message.data.isNotEmpty) {
      print('[NotificationService] 📦 Data: ${message.data}');
    }
  }

  /// Manejador para mensajes en foreground
  static void _handleForegroundMessage(
    BuildContext context,
    RemoteMessage message,
    Function(String?) onIncidentNotification,
  ) {
    print('[NotificationService] 📨 FOREGROUND: Procesando mensaje');
    print('[NotificationService] 📋 Message ID: ${message.messageId}');
    print('[NotificationService] 📨 Título: ${message.notification?.title}');
    print('[NotificationService] 📝 Body: ${message.notification?.body}');
    if (message.data.isNotEmpty) {
      print('[NotificationService] 📦 Data: ${message.data}');
    }

    // Extraer incidente_id si viene en los datos
    final incidentId = message.data['incidente_id'];
    if (incidentId != null) {
      print('[NotificationService] ✅ Incidente detectado: $incidentId');
      onIncidentNotification(incidentId);
    } else {
      print('[NotificationService] ⚠️ No hay incidente_id en los datos');
    }
  }

  /// Manejador para cuando se abre la app desde una notificación
  static void _handleMessageOpenedApp(
    BuildContext context,
    RemoteMessage message,
    Function(String?) onIncidentNotification,
  ) {
    print('[NotificationService] 📱 APP OPENED: Procesando mensaje');
    print('[NotificationService] 📋 Message ID: ${message.messageId}');
    if (message.data.isNotEmpty) {
      print('[NotificationService] 📦 Data: ${message.data}');
    }

    // Extraer incidente_id y navegar
    final incidentId = message.data['incidente_id'];
    if (incidentId != null) {
      print('[NotificationService] ✅ Navegando a incidente: $incidentId');
      onIncidentNotification(incidentId);
      // Navegar a tracking o historial según el incidente
      _navigateToIncident(context, incidentId);
    } else {
      print('[NotificationService] ⚠️ No hay incidente_id para navegar');
    }
  }

  /// Navegar al detalle del incidente
  static void _navigateToIncident(BuildContext context, String incidentId) {
    Navigator.of(
      context,
    ).pushNamed('/detalle-incidente', arguments: {'incidentId': incidentId});
  }

  /// Solicitar permisos de notificación
  static Future<NotificationSettings> requestPermission() async {
    return await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
  }
}
