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

    const channel = supabase
      .channel('order-notifications')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        }, 
        async (payload) => {
          // New order notification
          toast.success('New Order Added', {
            description: `Customer: ${payload.new.customer_name}, Tables: ${payload.new.quantity}`,
            duration: 5000,
          });
          
          // Try to send push notification if service worker is ready
          try {
            if ('serviceWorker' in navigator) {
              console.log('Service worker detected, attempting to send push notification');
              
              // Check if service worker is activated
              if (navigator.serviceWorker.controller) {
                const orderData = {
                  customerName: payload.new.customer_name,
                  tables: [{
                    quantity: payload.new.quantity
                  }]
                };
                
                console.log('Calling edge function to send push notification');
                
                // Call edge function to send push notification
                await fetch('/api/send-push-notification', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ order: orderData }),
                });
                
                // If we're on mobile, also try to show a notification directly
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                  const notificationOptions: ExtendedNotificationOptions = {
                    body: `Customer: ${payload.new.customer_name}, Tables: ${payload.new.quantity}`,
                    vibrate: [200, 100, 200]
                  };
                  
                  await NotificationService.showNotification(
                    'New Order Added', 
                    notificationOptions
                  );
                }
              } else {
                console.log('Service worker controller not found, registering...');
                // If service worker controller is not found, try to register it
                const registration = await NotificationService.registerServiceWorker();
                if (registration) {
                  console.log('Successfully registered service worker');
                }
              }
            }
          } catch (error) {
            console.error('Failed to send push notification:', error);
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
