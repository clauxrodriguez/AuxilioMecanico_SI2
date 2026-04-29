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
    // Escuchar mensajes cuando la app está en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _handleForegroundMessage(context, message, onIncidentNotification);
    });

    // Escuchar cuando se abre la app desde una notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleMessageOpenedApp(context, message, onIncidentNotification);
    });
  }

  /// Obtener FCM token
  static Future<String?> getToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      print('[NotificationService] FCM Token: $token');
      return token;
    } catch (e) {
      print('[NotificationService] Error obteniendo FCM token: $e');
      return null;
    }
  }

  /// Manejador para mensajes en background
  static Future<void> handleBackgroundMessage(RemoteMessage message) async {
    print('[NotificationService] Background message: ${message.messageId}');
    print('[NotificationService] Data: ${message.data}');
  }

  /// Manejador para mensajes en foreground
  static void _handleForegroundMessage(
    BuildContext context,
    RemoteMessage message,
    Function(String?) onIncidentNotification,
  ) {
    print('[NotificationService] Foreground message: ${message.messageId}');
    print('[NotificationService] Title: ${message.notification?.title}');
    print('[NotificationService] Body: ${message.notification?.body}');
    print('[NotificationService] Data: ${message.data}');

    // Extraer incidente_id si viene en los datos
    final incidentId = message.data['incidente_id'];
    if (incidentId != null) {
      onIncidentNotification(incidentId);
    }
  }

  /// Manejador para cuando se abre la app desde una notificación
  static void _handleMessageOpenedApp(
    BuildContext context,
    RemoteMessage message,
    Function(String?) onIncidentNotification,
  ) {
    print('[NotificationService] Message opened app: ${message.messageId}');
    print('[NotificationService] Data: ${message.data}');

    // Extraer incidente_id y navegar
    final incidentId = message.data['incidente_id'];
    if (incidentId != null) {
      onIncidentNotification(incidentId);
      // Navegar a tracking o historial según el incidente
      _navigateToIncident(context, incidentId);
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
