
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import { toast } from 'sonner';

export function useNotification() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkSupport = async () => {
      const supported = await NotificationService.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = NotificationService.getPermissionStatus();
        setPermission(currentPermission);
        
        // If permission is already granted, check if service worker is ready (for web only)
        if (currentPermission === 'granted' && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
              setSubscription(existingSubscription);
              console.log('Existing push subscription found');
              
              // Verify subscription exists in database
              if (user) {
                try {
                  const subscriptionJSON = JSON.parse(JSON.stringify(existingSubscription));
                  const subscriptionEndpoint = subscriptionJSON.endpoint as string;
                  
                  const { data: existingSubs } = await supabase
                    .from('push_subscriptions')
                    .select('id, subscription')
                    .eq('user_id', user.id);
                  
                  // Check if this endpoint already exists
                  let exists = false;
                  if (existingSubs && Array.isArray(existingSubs)) {
                    exists = existingSubs.some((sub: any) => {
                      try {
                        const subData = typeof sub.subscription === 'string' 
                          ? JSON.parse(sub.subscription) 
                          : sub.subscription;
                        return subData?.endpoint === subscriptionEndpoint;
                      } catch {
                        return false;
                      }
                    });
                  }
                  
                  if (!exists) {
                    // Subscription not in database, save it
                    await supabase.from('push_subscriptions').insert({
                      user_id: user.id,
                      subscription: subscriptionJSON
                    });
                  }
                } catch (error) {
                  console.error('Error checking/saving subscription:', error);
                }
              }
            }
          } catch (error) {
            console.error('Error checking existing subscription:', error);
          }
        }
      }
    };

    checkSupport();
  }, [user]);

  // Subscribe to push notifications
  const subscribeToPushNotifications = async () => {
    if (!user) {
      toast.error('You must be logged in to subscribe to notifications');
      return;
    }

    setLoading(true);
    try {
      // Request permission for notifications
      const permissionGranted = await NotificationService.requestPermission();
      setPermission(NotificationService.getPermissionStatus());
      
      if (!permissionGranted) {
        toast.error('Notification permission denied');
        setLoading(false);
        return;
      }

      // For web: Register service worker and subscribe to push
      // For Capacitor: Native notifications are handled automatically
      if (!('Capacitor' in window)) {
        // Register service worker (web only)
        const registration = await NotificationService.registerServiceWorker();
        if (!registration) {
          toast.error('Failed to register service worker');
          setLoading(false);
          return;
        }

        // Subscribe to push notifications (web only)
        const newSubscription = await NotificationService.subscribeToPush(registration);
        if (!newSubscription) {
          toast.error('Failed to subscribe to push notifications');
          setLoading(false);
          return;
        }

        // Convert the PushSubscription to a plain object that can be stored as JSON
        const subscriptionJSON = JSON.parse(JSON.stringify(newSubscription));

                          // Check if subscription already exists
          const subscriptionEndpoint = subscriptionJSON.endpoint as string;
          const { data: existingSubs } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user.id);

          // Check if this endpoint already exists
          let exists = false;
          if (existingSubs && Array.isArray(existingSubs)) {
            exists = existingSubs.some((sub: any) => {
              try {
                const subData = typeof sub.subscription === 'string' 
                  ? JSON.parse(sub.subscription) 
                  : sub.subscription;
                return subData?.endpoint === subscriptionEndpoint;
              } catch {
                return false;
              }
            });
          }

          if (!exists) {
          // Save the subscription to the database
          const { error } = await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            subscription: subscriptionJSON
          });

          if (error) {
            console.error('Failed to save subscription to database:', error);
            toast.error('Failed to save subscription');
            setLoading(false);
            return;
          }
        }

        setSubscription(newSubscription);
      } else {
        // For Capacitor, permissions are handled natively
        // No need to save subscription for web push
      }

      toast.success('Successfully subscribed to notifications');
      
      // Send a test notification after subscription
      setTimeout(() => {
        NotificationService.testNotification()
          .then(success => {
            if (!success) {
              console.warn('Test notification may not have been displayed');
            }
          })
          .catch(err => console.error('Error sending test notification:', err));
      }, 2000);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to subscribe to notifications');
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    loading,
    subscribeToPushNotifications
  };
}
