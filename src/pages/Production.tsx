import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Truck, Package, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

// The system is used in Sri Lanka (Asia/Colombo, UTC+5:30).
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const formatSl = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + SL_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

interface ProductionScan {
  id: string;
  order_id: string | null;
  order_form_number: string;
  operation_mode: string;
  vehicle_number: string;
  scanner_name: string;
  device_id: string;
  customer_name: string | null;
  customer_district: string | null;
  table_size: string | null;
  colour: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
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
  const [scans, setScans] = useState<ProductionScan[]>([]);
  const [openingScanOrder, setOpeningScanOrder] = useState<string | null>(null);
  const navigate = useNavigate();

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

      // Fetch production copy scans
      const { data: scanData, error: scanError } = await supabase
        .from('dispatch_return_logs')
        .select('*')
        .ilike('copy_type', 'production copy')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (scanError) throw scanError;
      setScans((scanData as ProductionScan[]) || []);
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

  const filteredScans = scans.filter(scan => {
    const q = searchQuery.toLowerCase();
    return (
      scan.order_form_number?.toLowerCase().includes(q) ||
      scan.customer_name?.toLowerCase().includes(q) ||
      scan.scanner_name?.toLowerCase().includes(q) ||
      scan.vehicle_number?.toLowerCase().includes(q)
    );
  });

  const openScanOrder = async (scan: ProductionScan) => {
    setOpeningScanOrder(scan.id);
    try {
      let orderId = scan.order_id;
      if (!orderId) {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('order_form_number', scan.order_form_number)
          .maybeSingle();
        if (error) throw error;
        orderId = data?.id || null;
      }
      if (!orderId) {
        toast.error(`Order ${scan.order_form_number} was not found`);
        return;
      }
      navigate(`/order-form/${orderId}`);
    } catch (error) {
      console.error('Failed to open order:', error);
      toast.error('Unable to open order details');
    } finally {
      setOpeningScanOrder(null);
    }
  };

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
            <TabsTrigger value="scans" className="flex-1">
              <ScanLine className="mr-2 h-4 w-4" />
              Production Scans ({filteredScans.length})
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

          <TabsContent value="scans">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading scans...</div>
            ) : filteredScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No production copy scans found</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date & Time (SL)</TableHead>
                      <TableHead className="whitespace-nowrap">Order No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Colour</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="whitespace-nowrap">Vehicle / Driver</TableHead>
                      <TableHead>Scanner</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScans.map(scan => (
                      <TableRow key={scan.id}>
                        <TableCell className="whitespace-nowrap">{formatSl(scan.created_at)}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => openScanOrder(scan)}
                            disabled={openingScanOrder !== null}
                            aria-label={`View order ${scan.order_form_number}`}
                          >
                            {scan.order_form_number}
                          </Button>
                        </TableCell>
                        <TableCell>{scan.customer_name || '—'}</TableCell>
                        <TableCell>{scan.customer_district || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">{scan.table_size || '—'}</TableCell>
                        <TableCell>{scan.colour || '—'}</TableCell>
                        <TableCell className="text-center">{scan.quantity}</TableCell>
                        <TableCell className="whitespace-nowrap">{scan.vehicle_number || '—'}</TableCell>
                        <TableCell>{scan.scanner_name || '—'}</TableCell>
                        <TableCell>{scan.device_id || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={scan.notes || ''}>
                          {scan.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
