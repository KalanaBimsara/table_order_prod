
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as webpush from "https://esm.sh/web-push@3.6.7";

// VAPID keys - in production you should store these securely
// In reality, you would use Supabase secrets for this
const VAPID_PUBLIC_KEY = "BGm0tUk4CuS7HjKeZv1d-8c_vKLBb0mASyvQ2uCp9Uyl0MmK2XCC13thF0XFdx-OIQNWnQ8xlIK1ntfOCJQ6uIw";
const VAPID_PRIVATE_KEY = "your_vapid_private_key"; // This should be stored as a Supabase secret

webpush.setVapidDetails(
  "mailto:example@yourdomain.com", // Replace with your email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Function to send push notification to a specific user
async function sendNotificationToUser(userId: string, supabaseClient: any, payload: any) {
  try {
    console.log(`Attempting to send notification to user: ${userId}`);
    // Get all subscriptions for this user
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (subscriptionError || !subscriptionData || subscriptionData.length === 0) {
      console.error("No subscriptions found for user:", userId, subscriptionError);
      return;
    }

    console.log(`Found ${subscriptionData.length} subscription(s) for user ${userId}`);
    
    // Send push notification to all user's subscriptions
    for (const item of subscriptionData) {
      try {
        const subscription = item.subscription;
        console.log("Sending notification with payload:", JSON.stringify(payload));
        
        // Add mobile-specific data
        const mobilePayload = {
          ...payload,
          vibrate: [200, 100, 200],
          tag: `order-${Date.now()}`,
          renotify: true
        };
        
        await webpush.sendNotification(subscription, JSON.stringify(mobilePayload));
        console.log(`Successfully sent notification to subscription`);
      } catch (pushError: any) {
        console.error("Error sending push notification:", pushError);
        
        // If the subscription is no longer valid, remove it from the database
        if (pushError.statusCode === 410) {
          console.log("Subscription expired. Removing from database.");
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("subscription", item.subscription);
        }
      }
    }
  } catch (error) {
    console.error("Error sending notification to user:", userId, error);
  }
}

serve(async (req) => {
  try {
    const { method } = req;
    
    // CORS headers for browser requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (method === "POST") {
      console.log("Received POST request to send notification");
      const { order, userRoles, test } = await req.json();

      // Handle test notifications
      if (test) {
        console.log("Processing test notification request");
        const userId = test.userId;
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing user ID for test" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const testPayload = {
          title: "Test Notification",
          body: "This is a test notification from Table Flow",
          icon: "/favicon.ico",
          url: "/",
          vibrate: [200, 100, 200],
          tag: `test-${Date.now()}`,
          renotify: true
        };
        
        await sendNotificationToUser(userId, supabaseClient, testPayload);
        return new Response(JSON.stringify({ success: true, message: "Test notification sent" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Build notification payload for orders
      const notificationPayload = {
        title: "New Order Added",
        body: `Customer: ${order.customerName}, Quantity: ${order.tables[0].quantity}`,
        icon: "/favicon.ico",
        url: "/orders",  // URL to open when notification is clicked
        vibrate: [200, 100, 200],
        tag: `order-${Date.now()}`,
        renotify: true
      };

      console.log("Fetching admin and delivery users");
      // Get all admin and delivery users
      const { data: adminUsers, error: adminError } = await supabaseClient
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'delivery']);

      if (adminError) {
        console.error("Error fetching admin users:", adminError);
        return new Response(JSON.stringify({ error: "Failed to fetch admin users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Found ${adminUsers?.length || 0} users to notify`);
      
      // Send notifications to all admin and delivery users
      for (const user of adminUsers || []) {
        await sendNotificationToUser(user.id, supabaseClient, notificationPayload);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
