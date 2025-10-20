
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, ShoppingBag, Truck, Settings, Package, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from '@/types/order';

const Dashboard: React.FC = () => {
  const { userRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'manager') {
      fetchPendingOrders();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const fetchPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_tables(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: order.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || '',
          frameColour: table.frame_colour || '',
          colour: table.colour,
          quantity: table.quantity,
          price: Number(table.price)
        })) || [],
        note: order.note,
        status: order.status as any,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: Number(order.price),
        deliveryFee: order.delivery_fee ? Number(order.delivery_fee) : undefined,
        additionalCharges: order.additional_charges ? Number(order.additional_charges) : undefined,
        assignedTo: order.delivery_person_id,
        delivery_person_id: order.delivery_person_id,
        createdBy: order.created_by,
        salesPersonName: order.sales_person_name,
        deliveryStatus: (order.delivery_status || 'pending') as 'pending' | 'ready'
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const markAsReadyForDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as ready for delivery');
      await fetchPendingOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Admin Dashboard View */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog size={20} />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>Manage orders and view all system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <NewOrderForm />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <OrderList />
          </div>
        </div>
      )}

      {/* Customer Dashboard View */}
      {userRole === 'customer' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag size={20} />
                Customer Dashboard
              </CardTitle>
              <CardDescription>Place orders for custom furniture tables</CardDescription>
            </CardHeader>
            <CardContent>
              <NewOrderForm />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manager Dashboard View */}
      {userRole === 'manager' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} />
                Management Dashboard
              </CardTitle>
              <CardDescription>
                Manage production orders and mark them as ready for delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center">Loading...</div>
              ) : (
                <div className="text-sm text-muted-foreground mb-4">
                  Total pending orders in production: {orders.length}
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && (
            <div className="grid gap-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No pending orders in production
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card 
                    key={order.id} 
                    className={`transition-all duration-300 ${
                      order.deliveryStatus === 'ready' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package size={18} />
                            Order #{order.id.slice(-8)}
                            {order.deliveryStatus === 'ready' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Ready for Delivery
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Customer: {order.customerName} • Created: {order.createdAt.toLocaleDateString()}
                          </CardDescription>
                        </div>
                        {order.deliveryStatus === 'pending' && (
                          <Button
                            onClick={() => markAsReadyForDelivery(order.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 size={16} className="mr-2" />
                            Mark Ready for Delivery
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Customer Details</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><span className="font-medium">Address:</span> {order.address}</p>
                            <p><span className="font-medium">Contact:</span> {order.contactNumber}</p>
                            {order.note && <p><span className="font-medium">Note:</span> {order.note}</p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Order Summary</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><span className="font-medium">Total Items:</span> {order.tables.length}</p>
                            <p><span className="font-medium">Total Price:</span> LKR {order.totalPrice.toLocaleString()}</p>
                            {order.deliveryFee && (
                              <p><span className="font-medium">Delivery Fee:</span> LKR {order.deliveryFee.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {order.tables.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Items</h4>
                          <div className="space-y-2">
                            {order.tables.map((table: any, index: number) => (
                               <div key={index} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                                <div className="flex-1">
                                  <div>
                                    <span className="font-medium">{table.size}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {table.topColour && `Top: ${table.topColour}`}
                                      {table.frameColour && ` • Frame: ${table.frameColour}`}
                                      {!table.topColour && !table.frameColour && `Color: ${table.colour}`}
                                    </span>
                                  </div>
                                  {(table.legSize || table.legHeight || table.wireHoles) && (
                                    <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                      {table.legSize && <span>Leg: {table.legSize}</span>}
                                      {table.legHeight && <span>Height: {table.legHeight}</span>}
                                      {table.wireHoles && table.wireHoles !== 'none' && <span>Wire: {table.wireHoles}</span>}
                                    </div>
                                  )}
                                </div>
                                 <div className="text-right">
                                   <span className="font-medium">Qty: {table.quantity}</span>
                                   <span className="text-muted-foreground ml-2">LKR {Number(table.price).toLocaleString()}</span>
                                 </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Delivery Dashboard View */}
      {userRole === 'delivery' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck size={20} />
                Delivery Dashboard
              </CardTitle>
              <CardDescription>View and manage assigned deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderList />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
