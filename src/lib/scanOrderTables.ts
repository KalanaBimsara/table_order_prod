import { supabase } from '@/integrations/supabase/client';
import { fetchOrderTablesByOrderIds } from '@/lib/fetchOrderTables';

export interface OrderTableRow {
  id: string;
  order_id: string | null;
  size: string;
  colour: string;
  top_colour: string | null;
  frame_colour: string | null;
  quantity: number;
}

interface ScanLike {
  id: string;
  order_id: string | null;
  order_form_number: string;
}

const CHUNK_SIZE = 100;

export interface ScanOrderDetails {
  tables: Map<string, OrderTableRow[]>;
  salesPersons: Map<string, string>;
}

/**
 * Fetches the real order details for a list of scan records: table rows (from `order_tables`)
 * and the sales person (from `orders`).
 * Scans without an `order_id` are resolved through `orders.order_form_number` first.
 * Returns maps keyed by scan id (empty array / no entry when none found).
 */
export async function fetchOrderDetailsForScans<T extends ScanLike>(scans: T[]): Promise<ScanOrderDetails> {
  const tables = new Map<string, OrderTableRow[]>();
  const salesPersons = new Map<string, string>();
  const result = { tables, salesPersons };
  if (scans.length === 0) return result;

  // Resolve order ids for scans that only carry the printed order form number.
  const resolvedIdByScanId = new Map<string, string>();
  const missing = scans.filter(s => !s.order_id && s.order_form_number);
  const formNumbers = [...new Set(missing.map(s => s.order_form_number))];
  for (let i = 0; i < formNumbers.length; i += CHUNK_SIZE) {
    const chunk = formNumbers.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_form_number')
      .in('order_form_number', chunk);
    if (error) throw error;
    const idByFormNumber = new Map((data || []).map(o => [o.order_form_number, o.id]));
    for (const scan of missing) {
      const id = idByFormNumber.get(scan.order_form_number);
      if (id) resolvedIdByScanId.set(scan.id, id);
    }
  }

  const orderIdForScan = (scan: T) => scan.order_id || resolvedIdByScanId.get(scan.id) || null;
  const allOrderIds = [...new Set(scans.map(orderIdForScan).filter(Boolean) as string[])];
  if (allOrderIds.length === 0) return result;

  const { data, error } = await fetchOrderTablesByOrderIds(allOrderIds);
  if (error) throw error;

  const rowsByOrderId = new Map<string, OrderTableRow[]>();
  for (const row of (data as OrderTableRow[]) || []) {
    if (!row.order_id) continue;
    const list = rowsByOrderId.get(row.order_id) || [];
    list.push(row);
    rowsByOrderId.set(row.order_id, list);
  }

  const salesPersonByOrderId = new Map<string, string>();
  for (let i = 0; i < allOrderIds.length; i += CHUNK_SIZE) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, sales_person_name')
      .in('id', allOrderIds.slice(i, i + CHUNK_SIZE));
    if (ordersError) throw ordersError;
    for (const order of orders || []) {
      if (order.sales_person_name) salesPersonByOrderId.set(order.id, order.sales_person_name);
    }
  }

  for (const scan of scans) {
    const orderId = orderIdForScan(scan);
    tables.set(scan.id, (orderId && rowsByOrderId.get(orderId)) || []);
    const salesPerson = orderId && salesPersonByOrderId.get(orderId);
    if (salesPerson) salesPersons.set(scan.id, salesPerson);
  }
  return result;
}

/** One line per order_tables row: "24x48 ×2\n24x60". */
export const formatTableSizes = (rows: OrderTableRow[]) =>
  rows.map(r => (r.quantity > 1 ? `${r.size} ×${r.quantity}` : r.size)).join('\n');

// Stored colour values are lower case with underscores (e.g. "ash_white" -> "Ash White").
const formatColourName = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** "Teak top, Black leg" (top / frame colours); a record with one colour shows just that colour. */
export const formatItemColour = (row: OrderTableRow) => {
  const top = row.top_colour || row.colour || '';
  const frame = row.frame_colour || '';
  if (!top || !frame) return formatColourName(top || frame);
  return `${formatColourName(top)} top, ${formatColourName(frame)} leg`;
};

/** One line per order_tables row, e.g. "Teak top, Black leg". */
export const formatTableColours = (rows: OrderTableRow[]) =>
  rows.map(formatItemColour).filter(Boolean).join('\n');

export const totalTableQuantity = (rows: OrderTableRow[]) =>
  rows.reduce((sum, r) => sum + (r.quantity || 0), 0);

export interface OrderItemLine {
  size: string;
  units: number | null;
  colour: string;
}

/** One line per order_tables row: its size, unit count and colour. Uses `fallback` when there are no rows. */
export const orderItemLines = (rows: OrderTableRow[], fallback: OrderItemLine): OrderItemLine[] =>
  rows.length
    ? rows.map(r => ({ size: r.size, units: r.quantity, colour: formatItemColour(r) }))
    : [fallback];
