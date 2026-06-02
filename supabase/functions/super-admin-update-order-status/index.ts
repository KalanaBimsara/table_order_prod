import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = ['pending', 'assigned', 'awaiting_approval', 'completed', 'cancelled'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orderId, newStatus, sessionToken } = await req.json();
    if (!orderId || !newStatus || !sessionToken) throw new Error('Missing required fields');
    if (!ALLOWED.includes(newStatus)) throw new Error('Invalid status');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: sessionData, error: sErr } = await admin.rpc('super_admin_get_session', {
      p_session_token: sessionToken,
    });
    if (sErr || !sessionData || sessionData.length === 0) throw new Error('Invalid or expired session');

    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { error: uErr } = await admin.from('orders').update(updates).eq('id', orderId);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
