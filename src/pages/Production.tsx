import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Truck, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_form_number: string | null;
  table_size: string;
  colour: string;
  quantity: number;
  status: string | null;
  created_at: string | null;
  order_tables?: {
    size: string;
    top_colour: string | null;
    frame_colour: string | null;
    quantity: number;
  }[];
}

const TRANSPORT_MODES = [
  'Vehicle Number 1',
  'Vehicle Number 2',
  'Vehicle Number 3',
  'Vehicle Number 4',
  'Pick Me',
  'Factory Pick Up'
];

const Production = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [transportMode, setTransportMode] = useState('');
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingLoad, setProcessingLoad] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch pending orders
      const { data: pendingData, error: pendingError } = await supabase
        .from('orders')
        .select(`
          id,
          order_form_number,
          table_size,
          colour,
          quantity,
          status,
          created_at,
          order_tables (
            size,
            top_colour,
            frame_colour,
            quantity
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setOrders(pendingData || []);

      // Fetch completed orders
      const { data: completedData, error: completedError } = await supabase
        .from('orders')
        .select(`
          id,
          order_form_number,
          table_size,
          colour,
          quantity,
          status,
          created_at,
          order_tables (
            size,
            top_colour,
            frame_colour,
            quantity
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (completedError) throw completedError;
      setCompletedOrders(completedData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleLoadClick = (order: Order) => {
    setSelectedOrder(order);
    setTransportMode('');
    setShowTransportDialog(true);
  };

  const handleTransportSelect = () => {
    if (!transportMode) {
      toast.error('Please select a transport mode');
      return;
    }
    setShowTransportDialog(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmLoad = async () => {
    if (!selectedOrder || !transportMode) return;

    setProcessingLoad(true);
    try {
      // Insert transport record
      const { error: transportError } = await supabase
        .from('transport')
        .insert({
          order_id: selectedOrder.id,
          transport_mode: transportMode
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

      toast.success('Order loaded successfully');
      setShowConfirmDialog(false);
      setSelectedOrder(null);
      setTransportMode('');
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order');
    } finally {
      setProcessingLoad(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.order_form_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompletedOrders = completedOrders.filter(order => 
    order.order_form_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalUnits = (order: Order) => {
    if (order.order_tables && order.order_tables.length > 0) {
      return order.order_tables.reduce((sum, table) => sum + table.quantity, 0);
    }
    return order.quantity;
  };

  const getTopColor = (order: Order) => {
    if (order.order_tables && order.order_tables.length > 0) {
      const colors = [...new Set(order.order_tables.map(t => t.top_colour).filter(Boolean))];
      return colors.join(', ') || order.colour;
    }
    return order.colour;
  };

  const getLegColor = (order: Order) => {
    if (order.order_tables && order.order_tables.length > 0) {
      const colors = [...new Set(order.order_tables.map(t => t.frame_colour).filter(Boolean))];
      return colors.join(', ') || '-';
    }
    return '-';
  };

  const getSize = (order: Order) => {
    if (order.order_tables && order.order_tables.length > 0) {
      const sizes = [...new Set(order.order_tables.map(t => t.size))];
      return sizes.join(', ');
    }
    return order.table_size;
  };

  const OrderCard = ({ order, showLoadButton = true }: { order: Order; showLoadButton?: boolean }) => (
    <Card className="p-4 mb-3 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-2xl font-bold text-primary mb-2">
            #{order.order_form_number || 'N/A'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Size:</span>
              <span className="ml-1 font-medium">{getSize(order)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Top Color:</span>
              <span className="ml-1 font-medium">{getTopColor(order)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Leg Color:</span>
              <span className="ml-1 font-medium">{getLegColor(order)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Units:</span>
              <span className="ml-1 font-bold text-primary">{getTotalUnits(order)}</span>
            </div>
          </div>
        </div>
        {showLoadButton && (
          <Button 
            onClick={() => handleLoadClick(order)}
            className="ml-4"
            size="lg"
          >
            <Truck className="mr-2 h-4 w-4" />
            Load
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Production Management</h1>
      
      {/* Search Box */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="p-6">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="available" className="flex-1">
              <Package className="mr-2 h-4 w-4" />
              Available ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              <Truck className="mr-2 h-4 w-4" />
              Completed ({filteredCompletedOrders.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="available">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pending orders available</div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
            ) : filteredCompletedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No completed orders</div>
            ) : (
              <div className="space-y-3">
                {filteredCompletedOrders.map(order => (
                  <OrderCard key={order.id} order={order} showLoadButton={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Transport Mode Dialog */}
      <Dialog open={showTransportDialog} onOpenChange={setShowTransportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Transport Mode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={transportMode} onValueChange={setTransportMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport mode" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_MODES.map(mode => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransportSelect}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Loading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to load order #{selectedOrder?.order_form_number} using "{transportMode}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingLoad}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad} disabled={processingLoad}>
              {processingLoad ? 'Processing...' : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Production;
