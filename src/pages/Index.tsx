import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import Dashboard from './Dashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/services/NotificationService';
import { ExtendedNotificationOptions } from '@/types/notification';

const Index = () => {
  const { user, userRole } = useAuth();
  const { orders } = useApp();

  // Subscribe to changes on orders table to show notifications
  useEffect(() => {
    // Only subscribe to notifications if the user is an admin or delivery person
    if (!userRole || (userRole !== 'admin' && userRole !== 'delivery')) {
      return;
    }

    if (!user) {
      return;
    }

    const channel = supabase
      .channel('order-notifications')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        }, 
        async (payload) => {
          // Prepare notification details
          const notificationTitle = 'New Order Added';
          const notificationBody = `Customer: ${payload.new.customer_name}, Tables: ${payload.new.quantity}`;
          
          // Show system notification (appears in notification panel)
          try {
            // Request permission if not already granted
            const permission = NotificationService.getPermissionStatus();
            if (permission !== 'granted') {
              await NotificationService.requestPermission();
            }

            // Register service worker if needed (for web)
            if ('serviceWorker' in navigator) {
              await NotificationService.registerServiceWorker();
            }

            // Show the notification - this will appear in system notification panel
            const notificationOptions: ExtendedNotificationOptions = {
              body: notificationBody,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              vibrate: [200, 100, 200],
              tag: `order-${payload.new.id}`,
              renotify: true,
              data: {
                url: `${window.location.origin}/orders`,
                orderId: payload.new.id
              }
            };
            
            await NotificationService.showNotification(notificationTitle, notificationOptions);
          } catch (error) {
            console.error('Failed to show notification:', error);
          }

          // Also trigger push notification via edge function for cross-device notifications
          // This ensures notifications work even when the user is not actively on the page
          try {
            const orderData = {
              customerName: payload.new.customer_name,
              tables: [{
                quantity: payload.new.quantity
              }]
            };
            
            // Call edge function to send push notification to all user's devices
            const response = await fetch('/api/send-push-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ order: orderData }),
            });

            if (!response.ok) {
              console.error('Failed to send push notification via edge function');
            }
          } catch (error) {
            console.error('Error calling push notification edge function:', error);
          }
        }
      )
      .subscribe();
    
    console.log('Subscribed to order notifications');
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, user]);
  
  return <Dashboard />;
};

export default Index;
