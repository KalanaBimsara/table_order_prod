import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchOrderTablesByOrderIds } from '@/lib/fetchOrderTables';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus } from '@/types/order';

export type SearchField = 'all' | 'orderNumber' | 'customerName' | 'address';

const SEARCH_LIMIT = 200;
const DEBOUNCE_MS = 350;

const mapOrders = (ordersData: any[], tablesData: any[]): Order[] => {
  const tablesByOrder = tablesData.reduce((acc: Record<string, any[]>, table: any) => {
    if (!acc[table.order_id]) acc[table.order_id] = [];
    acc[table.order_id].push({
      id: table.id,
      size: table.size,
      colour: table.colour,
      topColour: table.top_colour || table.colour,
      frameColour: table.frame_colour || table.colour,
      quantity: table.quantity,
      price: table.price,
      legSize: table.leg_size || undefined,
      legShape: table.leg_shape || undefined,
      legHeight: table.leg_height || undefined,
      wireHoles: table.wire_holes || undefined,
      wireHolesComment: table.wire_holes_comment || undefined,
      frontPanelSize: table.front_panel_size || undefined,
      frontPanelLength: table.front_panel_length || undefined,
      lShapeOrientation: table.l_shape_orientation || undefined,
    });
    return acc;
  }, {});

  return ordersData.map((order: any) => ({
    id: order.id,
    customerName: order.customer_name,
    customerDistrict: order.customer_district || undefined,
    address: order.address,
    contactNumber: order.contact_number,
    whatsappNumber: order.whatsapp_number || undefined,
    tables: tablesByOrder[order.id] || [],
    note: order.note || undefined,
    status: order.status as OrderStatus,
    createdAt: new Date(order.created_at),
    completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
    assignedTo: order.delivery_person_id,
    delivery_person_id: order.delivery_person_id,
    createdBy: order.created_by,
    totalPrice: Number(order.price),
    deliveryFee: order.delivery_fee || 0,
    additionalCharges: order.additional_charges || 0,
    salesPersonName: order.sales_person_name,
    deliveryDate: order.delivery_date || undefined,
    deliveryType: order.delivery_type || undefined,
    orderFormNumber: order.order_form_number || undefined,
  }));
};

const escapeTerm = (term: string) => term.replace(/[%,()]/g, ' ').trim();

/**
 * Searches orders straight from the database (not just the loaded page),
 * debounced, so completed orders outside the loaded 30 are still found.
 */
export function useOrderSearch(term: string, field: SearchField) {
  const { user, userRole, canViewAllOrders } = useAuth();
  const [results, setResults] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = term.trim();
  const active = trimmed.length >= 2;

  useEffect(() => {
    if (!active || !user) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const safe = escapeTerm(trimmed);
        if (!safe) {
          if (!cancelled) {
            setResults([]);
            setLoading(false);
          }
          return;
        }

        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(SEARCH_LIMIT);

        if (field === 'orderNumber') {
          query = query.ilike('order_form_number', `%${safe}%`);
        } else if (field === 'customerName') {
          query = query.ilike('customer_name', `%${safe}%`);
        } else if (field === 'address') {
          query = query.ilike('address', `%${safe}%`);
        } else {
          query = query.or(
            [
              `customer_name.ilike.%${safe}%`,
              `address.ilike.%${safe}%`,
              `contact_number.ilike.%${safe}%`,
              `order_form_number.ilike.%${safe}%`,
            ].join(',')
          );
        }

        if (userRole === 'customer') {
          query = query.eq('created_by', user.id);
        } else if (userRole === 'delivery') {
          query = query.eq('delivery_person_id', user.id);
        } else if (!canViewAllOrders) {
          query = query.eq('created_by', user.id);
        }

        const { data: ordersData, error } = await query;
        if (error) throw error;

        const ids = (ordersData || []).map(o => o.id);
        let tablesData: any[] = [];
        if (ids.length > 0) {
          const { data } = await fetchOrderTablesByOrderIds(ids);
          tablesData = data || [];
        }

        if (!cancelled) {
          setResults(mapOrders(ordersData || [], tablesData));
          setLoading(false);
        }
      } catch (err) {
        console.error('Order search failed:', err);
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, field, active, user?.id, userRole, canViewAllOrders]);

  return { results, loading, active };
}
