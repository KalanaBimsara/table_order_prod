import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Truck, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type OrderWithTables = {
  id: string;
  order_form_number: string | null;
  customer_name: string;
  status: string;
  created_at: string;
  tables: {
    id: string;
    size: string;
    top_colour: string | null;
    frame_colour: string | null;
    quantity: number;
  }[];
  totalUnits: number;
};

const TRANSPORT_MODES = [
  { value: 'vehicle_1', label: 'Vehicle Number 1' },
  { value: 'vehicle_2', label: 'Vehicle Number 2' },
  { value: 'vehicle_3', label: 'Vehicle Number 3' },
  { value: 'vehicle_4', label: 'Vehicle Number 4' },
  { value: 'pick_me', label: 'Pick Me' },
  { value: 'factory_pickup', label: 'Factory Pick Up' },
];

const PendingOrdersPanel = () => {
  const [orders, setOrders] = useState<OrderWithTables[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderWithTables[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTables | null>(null);
  const [selectedTransportMode, setSelectedTransportMode] = useState('');
  const [isTransportDialogOpen, setIsTransportDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch pending orders with their tables
      const { data: pendingOrdersData, error: pendingError } = await supabase
        .from('orders')
        .select('id, order_form_number, customer_name, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch completed orders with their tables
      const { data: completedOrdersData, error: completedError } = await supabase
        .from('orders')
        .select('id, order_form_number, customer_name, status, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (completedError) throw completedError;

      // Fetch tables for pending orders
      const pendingOrdersWithTables = await Promise.all(
        (pendingOrdersData || []).map(async (order) => {
          const { data: tables } = await supabase
            .from('order_tables')
            .select('id, size, top_colour, frame_colour, quantity')
            .eq('order_id', order.id);

          const totalUnits = tables?.reduce((sum, t) => sum + t.quantity, 0) || 0;
          
          return {
            ...order,
            tables: tables || [],
            totalUnits
          };
        })
      );

      // Fetch tables for completed orders
      const completedOrdersWithTables = await Promise.all(
        (completedOrdersData || []).map(async (order) => {
          const { data: tables } = await supabase
            .from('order_tables')
            .select('id, size, top_colour, frame_colour, quantity')
            .eq('order_id', order.id);

          const totalUnits = tables?.reduce((sum, t) => sum + t.quantity, 0) || 0;
          
          return {
            ...order,
            tables: tables || [],
            totalUnits
          };
        })
      );

      setOrders(pendingOrdersWithTables);
      setCompletedOrders(completedOrdersWithTables);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadClick = (order: OrderWithTables) => {
    setSelectedOrder(order);
    setSelectedTransportMode('');
    setIsTransportDialogOpen(true);
  };

  const handleTransportSelect = () => {
    if (!selectedTransportMode) {
      toast.error('Please select a transport mode');
      return;
    }
    setIsTransportDialogOpen(false);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmLoad = async () => {
    if (!selectedOrder || !selectedTransportMode) return;

    try {
      setIsProcessing(true);

      // Insert into transport table
      const { error: transportError } = await supabase
        .from('transport')
        .insert({
          order_id: selectedOrder.id,
          transport_mode: selectedTransportMode,
        });

      if (transportError) throw transportError;

      // Update order status to completed
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      toast.success(`Order ${selectedOrder.order_form_number || selectedOrder.id.slice(0, 8)} loaded successfully!`);
      
      setIsConfirmDialogOpen(false);
      setSelectedOrder(null);
      setSelectedTransportMode('');
      
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (order.order_form_number?.toLowerCase().includes(searchLower)) ||
      order.customer_name.toLowerCase().includes(searchLower)
    );
  });

  const filteredCompletedOrders = completedOrders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (order.order_form_number?.toLowerCase().includes(searchLower)) ||
      order.customer_name.toLowerCase().includes(searchLower)
    );
  });

  const OrderCard = ({ order, showLoadButton = true }: { order: OrderWithTables; showLoadButton?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Order Number - Big Font */}
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-primary">
                #{order.order_form_number || order.id.slice(0, 8)}
              </span>
              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                {order.status}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
            
            {/* Table Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {order.tables.map((table, idx) => (
                <div key={table.id} className="bg-muted/50 rounded-lg p-2 text-sm">
                  <div className="font-medium">Table {idx + 1}</div>
                  <div className="text-muted-foreground space-y-0.5">
                    <div><span className="font-medium">Size:</span> {table.size}</div>
                    <div><span className="font-medium">Top:</span> {table.top_colour || 'N/A'}</div>
                    <div><span className="font-medium">Legs:</span> {table.frame_colour || 'N/A'}</div>
                    <div><span className="font-medium">Qty:</span> {table.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Units */}
            <div className="flex items-center gap-2 mt-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Total Units: {order.totalUnits}</span>
            </div>
          </div>

          {/* Load Button */}
          {showLoadButton && (
            <div className="flex-shrink-0">
              <Button 
                onClick={() => handleLoadClick(order)}
                className="w-full md:w-auto"
                size="lg"
              >
                <Truck className="h-5 w-5 mr-2" />
                Load
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Box */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs for Available and Completed */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Available ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({filteredCompletedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No pending orders available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} showLoadButton={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filteredCompletedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No completed orders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCompletedOrders.map((order) => (
                <OrderCard key={order.id} order={order} showLoadButton={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transport Mode Selection Dialog */}
      <Dialog open={isTransportDialogOpen} onOpenChange={setIsTransportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Transport Mode</DialogTitle>
            <DialogDescription>
              Choose how this order will be transported
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedTransportMode} onValueChange={setSelectedTransportMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport mode..." />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransportSelect}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Loading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to load order #{selectedOrder?.order_form_number || selectedOrder?.id.slice(0, 8)} using{' '}
              <span className="font-semibold">
                {TRANSPORT_MODES.find(m => m.value === selectedTransportMode)?.label}
              </span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Yes, Load Order'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingOrdersPanel;
