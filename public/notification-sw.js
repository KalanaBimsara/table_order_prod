
// Service Worker for push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  
  // Extract notification data
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200], // Add vibration pattern for mobile
    tag: data.tag || 'default', // Add tag to group similar notifications
    renotify: true, // Notify even if there's a notification with same tag
    data: {
      url: data.url || self.location.origin
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// When the notification is clicked, open the associated URL
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Get the URL from the notification data
  const url = event.notification.data.url || self.location.origin;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsList => {
      // Check if there's already a window open
      for (const client of clientsList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Subscription expired');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(subscription => {
        console.log('New subscription generated');
        // Here you would ideally send the new subscription to your server
      })
  );
});
