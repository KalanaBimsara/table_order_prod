
import { ExtendedNotificationOptions } from '@/types/notification';

const publicVapidKey = 'BGm0tUk4CuS7HjKeZv1d-8c_vKLBb0mASyvQ2uCp9Uyl0MmK2XCC13thF0XFdx-OIQNWnQ8xlIK1ntfOCJQ6uIw';

// Check if Capacitor is available
const isCapacitor = () => {
  try {
    return typeof (window as any).Capacitor !== 'undefined';
  } catch {
    return false;
  }
};

class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Check if the browser supports push notifications
  public async isSupported(): Promise<boolean> {
    // In Capacitor, notifications are always supported via native APIs
    if (isCapacitor()) {
      return true;
    }
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get permission status (granted, denied, default)
  public getPermissionStatus(): NotificationPermission | null {
    if (isCapacitor()) {
      // In Capacitor, permission is handled by native APIs
      // Return 'granted' as Capacitor handles permissions natively
      return 'granted';
    }
    if (!('Notification' in window)) return null;
    return Notification.permission;
  }

  // Request permission for notifications
  public async requestPermission(): Promise<boolean> {
    if (isCapacitor()) {
      try {
        // Dynamically import Capacitor - this will only work if Capacitor is installed
        // @ts-ignore - Capacitor is optional dependency
        const capacitor = await import('@capacitor/local-notifications').catch(() => null);
        if (capacitor && capacitor.LocalNotifications) {
          const result = await capacitor.LocalNotifications.requestPermissions();
          return result.display === 'granted';
        }
        return false;
      } catch (error) {
        console.error('Error requesting Capacitor notification permission:', error);
        return false;
      }
    }
    
    if (!('Notification' in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Register the service worker
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    // Service workers are not needed in Capacitor
    if (isCapacitor()) {
      return null;
    }
    
    if (!('serviceWorker' in navigator)) return null;
    
    try {
      console.log('Attempting to register service worker...');
      const registration = await navigator.serviceWorker.register('/notification-sw.js', {
        scope: '/'
      });
      console.log('Service Worker registration successful with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Subscribe to push notifications
  public async subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
    // Push subscriptions are not needed in Capacitor - use native push notifications
    if (isCapacitor()) {
      return null;
    }
    
    try {
      console.log('Attempting to subscribe to push...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey)
      });
      
      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }

  // Convert base64 string to Uint8Array for VAPID key
  private urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray as BufferSource;
  }

  // Display a notification - works in both web and Capacitor
  public async showNotification(title: string, options: ExtendedNotificationOptions = {}): Promise<boolean> {
    // Use Capacitor LocalNotifications if available
    if (isCapacitor()) {
      try {
        // Dynamically import Capacitor - this will only work if Capacitor is installed
        // @ts-ignore - Capacitor is optional dependency
        const capacitor = await import('@capacitor/local-notifications').catch(() => null);
        if (capacitor && capacitor.LocalNotifications) {
          // Request permission first if not granted
          const permissionResult = await capacitor.LocalNotifications.requestPermissions();
          if (permissionResult.display !== 'granted') {
            console.warn('Notification permission not granted in Capacitor');
            return false;
          }

          await capacitor.LocalNotifications.schedule({
            notifications: [
              {
                title: title,
                body: options.body || '',
                id: Date.now(),
                sound: 'default',
                attachments: undefined,
                actionTypeId: '',
                extra: options.data || {},
                // Map web notification options to Capacitor
                ...(options.badge && { smallIcon: options.badge }),
              }
            ]
          });
          return true;
        }
        // Fall through to web notification if Capacitor import fails
      } catch (error) {
        console.error('Error showing Capacitor notification:', error);
        // Fall through to web notification on error
      }
    }
    
    // Web notification fallback
    if (!('Notification' in window)) return false;
    
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Add mobile-friendly options
      const mobileOptions = {
        ...options,
        vibrate: options.vibrate || [200, 100, 200],
        tag: options.tag || 'default',
        renotify: options.renotify !== undefined ? options.renotify : true,
        badge: options.badge || '/favicon.ico',
        icon: options.icon || '/favicon.ico',
        requireInteraction: false,
        silent: false,
      };
      
      await registration.showNotification(title, mobileOptions);
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  // Test notification to directly check if notifications are working
  public async testNotification(): Promise<boolean> {
    return this.showNotification('Test Notification', {
      body: 'This is a test notification to verify if notifications are working.',
      icon: '/favicon.ico',
      vibrate: [200, 100, 200]
    });
  }
}

export default NotificationService.getInstance();
