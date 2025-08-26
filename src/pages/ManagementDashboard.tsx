import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Package, Truck } from 'lucide-react';
import { Order } from '@/types/order';
import { toast } from 'sonner';

const ManagementDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_tables (*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const formattedOrders: Order[] = ordersData?.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: order.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || table.colour,
          frameColour: table.frame_colour || table.colour,
          colour: table.colour,
          quantity: table.quantity,
          price: table.price
        })) || [],
        note: order.note,
        status: order.status as any,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        deliveryFee: order.delivery_fee,
        additionalCharges: order.additional_charges,
        assignedTo: order.delivery_person_id,
        delivery_person_id: order.delivery_person_id,
        createdBy: order.created_by,
        salesPersonName: order.sales_person_name
      })) || [];

      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const markReadyForDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_status: 'ready_for_delivery'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as ready for delivery!');
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    }
  };

  const getDeliveryStatusColor = (deliveryStatus?: string) => {
    switch (deliveryStatus) {
      case 'ready_for_delivery':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getDeliveryStatusText = (deliveryStatus?: string) => {
    switch (deliveryStatus) {
      case 'ready_for_delivery':
        return 'Ready for Delivery';
      case 'assigned':
        return 'Assigned';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div>Loading orders...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = orders.filter(order => 
    !order.delivery_status || order.delivery_status === 'pending'
  );

  const readyOrders = orders.filter(order => 
    order.delivery_status === 'ready_for_delivery'
  );

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={20} />
            Management Dashboard
          </CardTitle>
          <CardDescription>
            Manage order production and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Package size={16} />
                Pending Orders ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="ready" className="flex items-center gap-2">
                <Truck size={16} />
                Ready Orders ({readyOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <div className="space-y-4">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending orders found
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{order.customerName}</h3>
                              <Badge 
                                variant="outline" 
                                className={getDeliveryStatusColor(order.delivery_status)}
                              >
                                {getDeliveryStatusText(order.delivery_status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{order.address}</p>
                            <p className="text-sm">{order.contactNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Order Date: {order.createdAt.toLocaleDateString()}
                            </p>
                            {order.salesPersonName && (
                              <p className="text-xs text-muted-foreground">
                                Sales Person: {order.salesPersonName}
                              </p>
                            )}
                            {order.note && (
                              <p className="text-sm italic text-muted-foreground">
                                Note: {order.note}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-2">
                            <p className="font-semibold">
                              LKR {order.totalPrice?.toLocaleString()}
                            </p>
                            <Button 
                              size="sm"
                              onClick={() => markReadyForDelivery(order.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark Ready for Delivery
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Order Details:</h4>
                          <div className="space-y-1">
                            {order.tables.map((table, index) => (
                              <div key={index} className="text-sm bg-muted p-2 rounded flex justify-between">
                                <span>
                                  {table.size} - Top: {table.topColour}, Frame: {table.frameColour}
                                </span>
                                <span>Qty: {table.quantity} × LKR {table.price.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="ready" className="space-y-4">
              <div className="space-y-4">
                {readyOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders ready for delivery
                  </div>
                ) : (
                  readyOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-green-400">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{order.customerName}</h3>
                              <Badge 
                                variant="outline" 
                                className="bg-green-100 text-green-800 border-green-200"
                              >
                                Ready for Delivery
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{order.address}</p>
                            <p className="text-sm">{order.contactNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Order Date: {order.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              LKR {order.totalPrice?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagementDashboard;