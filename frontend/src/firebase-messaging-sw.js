// Service Worker para Firebase Cloud Messaging
// Usar versiones compat para soportar importScripts en Service Workers
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js');

// Inicializar Firebase en el Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyCPKP7fCGWhuU7FshRaaals1cFTQOOwN4g",
  authDomain: "auxiliomecanico-f0789.firebaseapp.com",
  projectId: "auxiliomecanico-f0789",
  storageBucket: "auxiliomecanico-f0789.firebasestorage.app",
  messagingSenderId: "314510612181",
  appId: "1:314510612181:web:f747d3182a922ca9ffb45c",
  measurementId: "G-R7MDFJRYQ6"
};

firebase.initializeApp(firebaseConfig);

// Obtener la instancia de messaging (compat)
const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/assets/icon.png',
    badge: '/assets/badge.png',
    data: payload.data || {},
    tag: 'auxiliomecanico',
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  event.notification.close();

  const incidentId = event.notification.data?.incidente_id;
  const urlToOpen = incidentId ? `/app/incidentes/${incidentId}` : '/app/solicitudes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Buscar si ya existe una ventana con la URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no existe, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
