import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Palette, Ruler, Hash, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Order, TableItem } from '@/types/order';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProductionQueue = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductionOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with pending or assigned status, sorted by creation date (first come first serve)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'assigned'])
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      if (!ordersData) {
        setOrders([]);
        return;
      }

      if (!ordersData) {
        setOrders([]);
        return;
      }

      // Fetch table items for each order
      const ordersWithTables = await Promise.all(
        ordersData.map(async (order) => {
          const { data: tablesData, error: tablesError } = await supabase
            .from('order_tables')
            .select('*')
            .eq('order_id', order.id);

          if (tablesError) {
            console.error('Error fetching tables for order:', order.id, tablesError);
            return null;
          }

          const tableItems: TableItem[] = tablesData?.map(table => ({
            id: table.id,
            size: table.size,
            topColour: table.top_colour || table.colour,
            frameColour: table.frame_colour || table.colour,
            colour: table.colour,
            quantity: table.quantity,
            price: Number(table.price),
            legSize: (table as any).leg_size,
            legHeight: (table as any).leg_height,
            wireHoles: (table as any).wire_holes,
            wireHolesComment: (table as any).wire_holes_comment
          })) || [];

          return {
            id: order.id,
            customerName: order.customer_name,
            address: order.address,
            contactNumber: order.contact_number,
            tables: tableItems,
            note: order.note,
            status: order.status as 'pending' | 'assigned' | 'completed',
            createdAt: new Date(order.created_at || ''),
            completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
            totalPrice: Number(order.price),
            deliveryFee: Number(order.delivery_fee || 0),
            additionalCharges: Number(order.additional_charges || 0),
            assignedTo: order.delivery_person_id || undefined,
            createdBy: order.created_by || undefined,
            salesPersonName: order.sales_person_name || undefined,
            deliveryStatus: (order.delivery_status as 'pending' | 'ready') || 'pending'
          } as Order;
        })
      );

      const validOrders = ordersWithTables.filter(order => order !== null) as Order[];
      setOrders(validOrders);
    } catch (error) {
      console.error('Error fetching production orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markOrderComplete = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'awaiting_approval' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as complete and moved to management approval');
      fetchProductionOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  useEffect(() => {
    fetchProductionOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Production Queue</h1>
        <p className="text-muted-foreground mt-2">
          Orders to be manufactured - arranged by order received date (first come, first serve)
        </p>
        <div className="mt-4">
          <Badge variant="outline" className="text-sm">
            {orders.length} orders in queue
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg">No orders in production queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order, index) => (
            <Card key={order.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      Production Order
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        Ordered: {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
                      </div>
                      <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => markOrderComplete(order.id)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Done
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Order Number</p>
                    <p className="font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Name</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{order.address}</p>
                  </div>
                </div>

                {/* Production Requirements */}
                <div>
                  <h4 className="font-semibold mb-3 text-lg">📋 Production Requirements</h4>
                  <div className="space-y-3">
                    {order.tables.map((table, tableIndex) => (
                      <div key={table.id} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-xs">
                            Item #{tableIndex + 1}
                          </Badge>
                          <Badge variant="secondary">
                            Qty: {table.quantity}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Ruler size={16} className="text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Table Size</p>
                              <p className="font-medium">{table.size}"</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Palette size={16} className="text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Top Color</p>
                              <p className="font-medium">{table.topColour || table.colour}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Palette size={16} className="text-orange-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Frame Color</p>
                              <p className="font-medium">{table.frameColour || table.colour}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Hash size={16} className="text-purple-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <p className="font-medium text-lg">{table.quantity}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Customization Details */}
                        {(table.legSize || table.legHeight || table.wireHoles) && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">🔧 Customization:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {table.legSize && (
                                <div>
                                  <span className="text-muted-foreground">Leg Size:</span>
                                  <span className="ml-1 font-medium">{table.legSize}</span>
                                </div>
                              )}
                              {table.legHeight && (
                                <div>
                                  <span className="text-muted-foreground">Leg Height:</span>
                                  <span className="ml-1 font-medium">{table.legHeight}</span>
                                </div>
                              )}
                              {table.wireHoles && (
                                <div>
                                  <span className="text-muted-foreground">Wire Holes:</span>
                                  <span className="ml-1 font-medium">{table.wireHoles}</span>
                                </div>
                              )}
                            </div>
                            {table.wireHoles === 'special' && table.wireHolesComment && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <span className="text-muted-foreground">Special wire holes:</span>
                                <span className="ml-1 text-blue-700 dark:text-blue-300">{table.wireHolesComment}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                {order.note && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">📝 Special Instructions:</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{order.note}</p>
                  </div>
                )}

                {/* Production Summary */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Tables</p>
                      <p className="font-semibold text-lg">
                        {order.tables.reduce((sum, table) => sum + table.quantity, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <Badge variant={index < 3 ? "destructive" : index < 6 ? "default" : "secondary"}>
                        {index < 3 ? "High" : index < 6 ? "Medium" : "Normal"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductionQueue;