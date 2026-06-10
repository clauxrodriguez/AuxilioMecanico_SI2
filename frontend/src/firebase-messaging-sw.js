importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA1iDQPXiOSdTEtF34FEK9agsmALoR9gps",
  authDomain: "proyectos-sistemas.firebaseapp.com",
  projectId: "proyectos-sistemas",
  storageBucket: "proyectos-sistemas.firebasestorage.app",
  messagingSenderId: "759500035327",
  appId: "1:759500035327:web:d3d7beb9c4b7f0d46e28ca",
  measurementId: "G-L8ED4SQKL3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
