import { supabase } from '@/integrations/supabase/client';

const CHUNK_SIZE = 100;

/** Fetches order_tables rows in batches to avoid over-long request URLs (HTTP 400). */
export async function fetchOrderTablesByOrderIds(orderIds: string[]): Promise<{ data: any[]; error: any }> {
  const ids = orderIds.filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE));

  const results = await Promise.all(
    chunks.map(chunk => supabase.from('order_tables').select('*').in('order_id', chunk))
  );
  const failed = results.find(r => r.error);
  if (failed) return { data: [], error: failed.error };
  return { data: results.flatMap(r => r.data || []), error: null };
}
