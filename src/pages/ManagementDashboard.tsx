import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Package, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types/order';

const ManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [awaitingApprovalOrders, setAwaitingApprovalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
    fetchAwaitingApprovalOrders();
  }, []);

  const fetchAwaitingApprovalOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_tables(*)')
        .eq('status', 'awaiting_approval')
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

      setAwaitingApprovalOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching awaiting approval orders:', error);
      toast.error('Failed to fetch awaiting approval orders');
    }
  };

  const markAwaitingOrderReady = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as ready for delivery');
      await fetchAwaitingApprovalOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

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

  if (loading) {
    return (
      <div className="container py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
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
          <div className="text-sm text-muted-foreground mb-4">
            Total pending orders in production: {orders.length}
          </div>
        </CardContent>
      </Card>

      {/* Production Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={20} />
            Production Status
          </CardTitle>
          <CardDescription>
            Orders completed by production and ready to be assembled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Orders awaiting assembly approval: {awaitingApprovalOrders.length}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {awaitingApprovalOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No orders awaiting assembly approval
            </CardContent>
          </Card>
        ) : (
          awaitingApprovalOrders.map((order) => (
            <Card 
              key={order.id} 
              className="transition-all duration-300 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package size={18} />
                      Order #{order.id.slice(-8)}
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1">
                        <Package size={12} />
                        Ready to be Assembled
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Customer: {order.customerName} • Created: {order.createdAt.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/order-form/${order.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <FileText size={16} className="mr-2" />
                      Order Form
                    </Button>
                    <Button
                      onClick={() => markAwaitingOrderReady(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Mark Ready for Delivery
                    </Button>
                  </div>
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
                          <div>
                            <span className="font-medium">{table.size}</span>
                            <span className="text-muted-foreground ml-2">
                              {table.top_colour && `Top: ${table.top_colour}`}
                              {table.frame_colour && ` • Frame: ${table.frame_colour}`}
                              {!table.top_colour && !table.frame_colour && `Color: ${table.colour}`}
                            </span>
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

      {/* Pending Orders Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Orders in Production</CardTitle>
          <CardDescription>
            Orders currently being processed by production team
          </CardDescription>
        </CardHeader>
      </Card>

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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/order-form/${order.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <FileText size={16} className="mr-2" />
                      Order Form
                    </Button>
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
                          <div>
                            <span className="font-medium">{table.size}</span>
                            <span className="text-muted-foreground ml-2">
                              {table.top_colour && `Top: ${table.top_colour}`}
                              {table.frame_colour && ` • Frame: ${table.frame_colour}`}
                              {!table.top_colour && !table.frame_colour && `Color: ${table.colour}`}
                            </span>
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
    </div>
  );
};

export default ManagementDashboard;