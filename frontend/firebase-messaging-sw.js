/* Firebase Messaging service worker replacement
   This worker listens for push events, shows a notification, and posts message
   to all clients so the page can persist the notification in localStorage.
*/

self.addEventListener('push', function (event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: 'Notificación', body: event.data?.text() } };
  }

  const title = (payload.notification && payload.notification.title) || 'Notificación';
  const options = {
    body: payload.notification?.body || '',
    data: payload.data || {},
  };

  const promiseChain = self.registration.showNotification(title, options).then(() => {
    return self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      for (const client of clients) {
        try {
          client.postMessage({ type: 'FCM_PUSH', payload });
        } catch (e) {
          // ignore
        }
      }
    });
  });

  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const clickAction = event.notification?.data?.click_action || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === clickAction && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction);
      }
    })
  );
});
