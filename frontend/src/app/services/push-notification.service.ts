import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../.././environments/environment';
import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging,
} from 'firebase/messaging';

export interface FcmTokenRequest {
  fcm_token: string;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private messaging: Messaging | null = null;
  private fcmToken: string | null = null;
  private tokenSent = false;
  private initializationPromise: Promise<void>;

  constructor(private readonly http: HttpClient) {
    this.initializationPromise = this.initialize();
  }

  /**
   * Esperar a que Firebase se inicialice
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Inicializar Firebase y Messaging
   */
  private async initialize(): Promise<void> {
    const supported = await isSupported();
    if (supported) {
      try {
        const app = initializeApp(environment.firebase);
        this.messaging = getMessaging(app);
        console.log('[PushNotificationService] Firebase initialized successfully');
      } catch (error) {
        console.error('[PushNotificationService] Error initializing Firebase:', error);
      }
    } else {
      console.warn('[PushNotificationService] Firebase Messaging is not supported in this browser');
    }
  }

  /**
   * Solicitar permiso al usuario y obtener FCM token
   */
  async requestPermission(): Promise<string | null> {
    if (!this.messaging) {
      console.warn('[PushNotificationService] Messaging not initialized');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('[PushNotificationService] Notification permission granted');
        return await this.getFcmToken();
      } else {
        console.warn('[PushNotificationService] Notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('[PushNotificationService] Error requesting permission:', error);
      return null;
    }
  }

  /**
   * Obtener FCM token
   */
  private async getFcmToken(): Promise<string | null> {
    if (!this.messaging) {
      console.warn('[PushNotificationService] Messaging not initialized');
      return null;
    }

    try {
      const token = await getToken(this.messaging, {
         vapidKey: environment.firebaseVapidKey, // Reemplazar con tu VAPID key de Firebase
      });

      if (token) {
        this.fcmToken = token;
        console.log('[PushNotificationService] FCM Token obtained:', token);
        return token;
      } else {
        console.warn('[PushNotificationService] No registration token available');
        return null;
      }
    } catch (error) {
      console.error('[PushNotificationService] Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Enviar FCM token al backend
   */
  async sendTokenToBackend(token: string): Promise<void> {
    if (this.tokenSent) {
      console.log('[PushNotificationService] Token already sent to backend');
      return;
    }

    try {
      const payload: FcmTokenRequest = { fcm_token: token };
      await this.http
        .patch<{ message: string }>(`${environment.apiBaseUrl}/api/auth/fcm-token`, payload)
        .toPromise();

      this.tokenSent = true;
      console.log('[PushNotificationService] FCM token sent to backend successfully');
    } catch (error) {
      console.error('[PushNotificationService] Error sending FCM token to backend:', error);
    }
  }

  /**
   * Registrar listener para mensajes en foreground
   */
  async registerForegroundMessageListener(
    onMessageCallback: (data: any) => void,
    onIncidentCallback?: (incidentId: string) => void
  ): Promise<void> {
    await this.waitForInitialization();
    
    if (!this.messaging) {
      console.warn('[PushNotificationService] Messaging not initialized');
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('[PushNotificationService] Message received in foreground:', payload);

      const incidentId = payload.data?.['incidente_id'];
      if (incidentId && onIncidentCallback) {
        onIncidentCallback(incidentId);
      }

      onMessageCallback(payload);
    });
  }

  /**
   * Registrar Service Worker
   */
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[PushNotificationService] Service Worker registered successfully:', registration);
      } catch (error) {
        console.error('[PushNotificationService] Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Obtener token FCM actual
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }
}
