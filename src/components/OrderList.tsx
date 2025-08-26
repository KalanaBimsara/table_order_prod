import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from './OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Truck, CheckCircle2, ShoppingBag, Filter, Calendar, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Order, OrderStatus } from '@/types/order';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

// Define the types for the Supabase responses
type OrderResponse = {
  id: string;
  customer_name: string;
  address: string;
  contact_number: string;
  table_size: string;
  colour: string;
  quantity: number;
  price: number;
  note: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  delivery_person_id: string | null;
  sales_person_name: string | null;  // Added this field
  delivery_status: string | null;  // Added delivery status field
};

type OrderTableResponse = {
  id: string;
  order_id: string;
  size: string;
  colour: string;
  top_colour: string | null;
  frame_colour: string | null;
  quantity: number;
  price: number;
};

export function OrderList() {
  const { getFilteredOrders, orders, assignOrder, completeOrder, getSalesPersons } = useApp();
  const { userRole, user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');
  
  // Date search states
  const [searchFromDate, setSearchFromDate] = useState<Date | undefined>();
  const [searchToDate, setSearchToDate] = useState<Date | undefined>();
  const [customerNameSearch, setCustomerNameSearch] = useState('');

  const pendingOrders = getFilteredOrders('pending', selectedSalesPerson);
  const assignedOrders = getFilteredOrders('assigned', selectedSalesPerson);
  const completedOrders = getFilteredOrders('completed', selectedSalesPerson);
  
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [deliveryCompletedOrders, setDeliveryCompletedOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const salesPersons = getSalesPersons();

  // Apply date and customer name filters to completed orders
  const searchFilteredCompletedOrders = useMemo(() => {
    let filtered = completedOrders;

    // Filter by customer name
    if (customerNameSearch.trim()) {
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(customerNameSearch.toLowerCase().trim())
      );
    }

    // Filter by date range
    if (searchFromDate || searchToDate) {
      filtered = filtered.filter(order => {
        if (!order.completedAt) return false;
        
        const completedDate = order.completedAt;
        
        if (searchFromDate && searchToDate) {
          return isWithinInterval(completedDate, {
            start: startOfDay(searchFromDate),
            end: endOfDay(searchToDate)
          });
        } else if (searchFromDate) {
          return completedDate >= startOfDay(searchFromDate);
        } else if (searchToDate) {
          return completedDate <= endOfDay(searchToDate);
        }
        
        return true;
      });
    }

    return filtered;
  }, [completedOrders, searchFromDate, searchToDate, customerNameSearch]);

  // Group completed orders by completion date
  const groupedCompletedOrders = useMemo(() => {
    const groups: { [key: string]: typeof searchFilteredCompletedOrders } = {};
    
    searchFilteredCompletedOrders.forEach(order => {
      if (order.completedAt) {
        const dateKey = format(order.completedAt, 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(order);
      }
    });

    // Sort each group by completion time (latest first)
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });
    });

    return groups;
  }, [searchFilteredCompletedOrders]);

  // Get sorted date keys (most recent first)
  const sortedCompletedDateKeys = Object.keys(groupedCompletedOrders).sort((a, b) => b.localeCompare(a));

  const clearCompletedFilters = () => {
    setSearchFromDate(undefined);
    setSearchToDate(undefined);
    setCustomerNameSearch('');
  };

  const hasActiveCompletedFilters = searchFromDate || searchToDate || customerNameSearch.trim();

  React.useEffect(() => {
    if (userRole === 'delivery') {
      fetchAvailableOrders();
      fetchDeliveryCompletedOrders();
      fetchReadyOrders();
    }
  }, [userRole, user]);

  const fetchAvailableOrders = async () => {
    try {
      // First, fetch the pending orders that are NOT ready for delivery, ordered by creation date (latest first)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .or('delivery_status.is.null,delivery_status.eq.pending')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching available orders:', ordersError);
        toast.error('Failed to fetch available orders');
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setAvailableOrders([]);
        return;
      }

      // Extract order IDs to fetch related table data
      const orderIds = ordersData.map(order => order.id);

      // Fetch the order_tables data for these orders
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);

      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast.error('Failed to fetch table details');
        return;
      }

      // Group tables by order_id
      const tablesByOrder = (tablesData || []).reduce((acc, table) => {
        if (!acc[table.order_id]) {
          acc[table.order_id] = [];
        }
        acc[table.order_id].push({
          id: table.id,
          size: table.size,
          colour: table.colour,
          topColour: table.top_colour || table.colour,
          frameColour: table.frame_colour || table.colour,
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Transform the data to match the Order type structure with the correct color properties
      const formattedOrders = (ordersData as OrderResponse[]).map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        // Use tables data if available, otherwise create a fallback
        tables: tablesByOrder[order.id] || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,  // Include sales person name
        delivery_status: order.delivery_status as any
      }));

      // Sort by creation date (latest first) - already sorted by query but ensuring consistency
      const sortedOrders = formattedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAvailableOrders(sortedOrders);
    } catch (error) {
      console.error('Error processing available orders:', error);
      toast.error('An error occurred while fetching orders');
    }
  };

  const fetchReadyOrders = async () => {
    try {
      // Fetch orders that are ready for delivery
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .eq('delivery_status', 'ready_for_delivery')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching ready orders:', ordersError);
        toast.error('Failed to fetch ready orders');
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setReadyOrders([]);
        return;
      }

      // Extract order IDs to fetch related table data
      const orderIds = ordersData.map(order => order.id);

      // Fetch the order_tables data for these orders
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);

      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast.error('Failed to fetch table details');
        return;
      }

      // Group tables by order_id
      const tablesByOrder = (tablesData || []).reduce((acc, table) => {
        if (!acc[table.order_id]) {
          acc[table.order_id] = [];
        }
        acc[table.order_id].push({
          id: table.id,
          size: table.size,
          colour: table.colour,
          topColour: table.top_colour || table.colour,
          frameColour: table.frame_colour || table.colour,
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Transform the data to match the Order type structure
      const formattedOrders = (ordersData as OrderResponse[]).map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id] || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,
        delivery_status: 'ready_for_delivery' as any
      }));

      setReadyOrders(formattedOrders);
    } catch (error) {
      console.error('Error processing ready orders:', error);
      toast.error('An error occurred while fetching ready orders');
    }
  };

  const fetchDeliveryCompletedOrders = async () => {
    if (!user) return;

    try {
      console.log('Fetching completed orders for delivery person:', user.id);
      
      // Fetch completed orders for this delivery person ordered by completed_at (latest first)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed')
        .eq('delivery_person_id', user.id)
        .order('completed_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching completed orders:', ordersError);
        toast.error('Failed to fetch completed orders');
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        console.log('No completed orders found for delivery person');
        setDeliveryCompletedOrders([]);
        return;
      }

      console.log('Found completed orders:', ordersData.length);

      // Extract order IDs to fetch related table data
      const orderIds = ordersData.map(order => order.id);

      // Fetch the order_tables data for these orders
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);

      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast.error('Failed to fetch table details');
        return;
      }

      // Group tables by order_id
      const tablesByOrder = (tablesData || []).reduce((acc, table) => {
        if (!acc[table.order_id]) {
          acc[table.order_id] = [];
        }
        acc[table.order_id].push({
          id: table.id,
          size: table.size,
          colour: table.colour,
          topColour: table.top_colour || table.colour,
          frameColour: table.frame_colour || table.colour,
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Transform the data to match the Order type structure
      const formattedOrders = (ordersData as OrderResponse[]).map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id] || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        delivery_person_id: order.delivery_person_id,
        salesPersonName: order.sales_person_name,  // Include sales person name
        delivery_status: order.delivery_status as any
      }));

      console.log('Formatted completed orders:', formattedOrders);
      setDeliveryCompletedOrders(formattedOrders);
    } catch (error) {
      console.error('Error processing completed orders:', error);
      toast.error('An error occurred while fetching completed orders');
    }
  };

  const handleSelfAssign = async (orderId: string) => {
    if (!user) {
      toast.error('You must be logged in to assign orders');
      return;
    }
    
    try {
      await assignOrder(orderId, user.id);
      toast.success('Order assigned to you successfully');
      fetchAvailableOrders(); // Refresh available orders
      fetchReadyOrders(); // Refresh ready orders
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Failed to assign order');
    }
  };

  // For delivery users, show assigned orders and available orders
  if (userRole === 'delivery') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center md:text-left">
          <CardTitle className="flex items-center justify-center md:justify-start gap-3 text-2xl md:text-3xl">
            <Truck size={isMobile ? 24 : 32} />
            Delivery Dashboard
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Manage your delivery assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="myDeliveries">
            <TabsList className="grid w-full grid-cols-4 mobile-tabs-container">
              <TabsTrigger value="myDeliveries" className="mobile-tab-item">
                <Truck size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">My Orders</span>
              </TabsTrigger>
              <TabsTrigger value="ready" className="mobile-tab-item">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <Package size={isMobile ? 14 : 16} />
                </div>
                <span className="mobile-tab-label">Ready</span>
              </TabsTrigger>
              <TabsTrigger value="available" className="mobile-tab-item">
                <Package size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Available</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="mobile-tab-item">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Completed</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="myDeliveries" className="mt-4">
              <div className="space-y-6">
                {assignedOrders.filter(order => order.assignedTo === user?.id || order.delivery_person_id === user?.id).length > 0 ? (
                  assignedOrders.filter(order => order.assignedTo === user?.id || order.delivery_person_id === user?.id).map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order}
                      onComplete={() => {
                        completeOrder(order.id);
                        // Refresh completed orders after completing an order
                        setTimeout(() => fetchDeliveryCompletedOrders(), 1000);
                      }}
                    />
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No deliveries assigned to you yet.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="ready" className="mt-4">
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="font-semibold text-green-800">Ready for Delivery</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    These orders have been completed and are ready for delivery pickup.
                  </p>
                </div>
                {readyOrders.length > 0 ? (
                  readyOrders.map(order => (
                    <div key={order.id} className="relative">
                      <div className="absolute -left-2 top-4 w-1 h-16 bg-green-500 rounded-full"></div>
                      <OrderCard 
                        key={order.id} 
                        order={order}
                        showSalesPerson={true}
                        actionButton={
                          <button 
                            onClick={() => handleSelfAssign(order.id)}
                            className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-green-200 rounded-full"></div>
                            Assign to Me
                          </button>
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No orders ready for delivery.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="available" className="mt-4">
              <div className="space-y-6">
                {availableOrders.length > 0 ? (
                  availableOrders.map(order => (
                    <div key={order.id} className="relative">
                      <OrderCard 
                        key={order.id} 
                        order={order}
                        showSalesPerson={true}
                        actionButton={
                          <button 
                            onClick={() => handleSelfAssign(order.id)}
                            className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                          >
                            Assign to Me
                          </button>
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No available orders to deliver.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              <div className="space-y-6">
                {deliveryCompletedOrders.length > 0 ? (
                  deliveryCompletedOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No completed deliveries yet.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // For customer users, show their orders
  if (userRole === 'customer') {
    return (
      <Card className="w-full">
        <CardHeader className={isMobile ? "text-center" : ""}>
          <CardTitle className={`flex items-center ${isMobile ? "justify-center" : ""} gap-2`}>
            <ShoppingBag size={20} />
            Your Orders
          </CardTitle>
          <CardDescription>
            Track your furniture table orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3 mobile-tabs-container">
              <TabsTrigger value="all" className="mobile-tab-item">
                <Package size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">All</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="mobile-tab-item">
                <Truck size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Active</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="mobile-tab-item">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Completed</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {pendingOrders.length > 0 || assignedOrders.length > 0 || completedOrders.length > 0 ? (
                  [...pendingOrders, ...assignedOrders, ...completedOrders].map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    You haven't placed any orders yet.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="active" className="mt-4">
              <div className="space-y-4">
                {pendingOrders.length > 0 || assignedOrders.length > 0 ? (
                  [...pendingOrders, ...assignedOrders].map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    No active orders found.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              <div className="space-y-4">
                {completedOrders.length > 0 ? (
                  completedOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    No completed orders found.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // For admin users, show all orders with tabs and sales person filter
  return (
    <Card className="w-full">
      <CardHeader className={isMobile ? "text-center" : ""}>
        <CardTitle className={`${isMobile ? "text-center" : ""}`}>Manage Orders</CardTitle>
        <CardDescription>
          View and manage all furniture table orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Sales Person Filter */}
        {salesPersons.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={16} />
              <label className="text-sm font-medium">Filter by Sales Person:</label>
            </div>
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select sales person" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <SelectItem value="all">All Sales Persons</SelectItem>
                {salesPersons.map(salesPerson => (
                  <SelectItem key={salesPerson} value={salesPerson}>
                    {salesPerson}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="pending" className="flex flex-col items-center justify-center py-2">
              <Package size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Pending</span>
              <span className="mobile-tab-count">({pendingOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex flex-col items-center justify-center py-2">
              <Truck size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Assigned</span>
              <span className="mobile-tab-count">({assignedOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col items-center justify-center py-2">
              <CheckCircle2 size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Completed</span>
              <span className="mobile-tab-count">({completedOrders.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            <div className="space-y-4">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground text-lg">
                  {selectedSalesPerson === 'all' 
                    ? 'No pending orders found.' 
                    : `No pending orders found for ${selectedSalesPerson}.`}
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="assigned" className="mt-4">
            <div className="space-y-4">
              {assignedOrders.length > 0 ? (
                assignedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground text-lg">
                  {selectedSalesPerson === 'all' 
                    ? 'No assigned orders found.' 
                    : `No assigned orders found for ${selectedSalesPerson}.`}
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            <div className="space-y-6">
              {/* Search and Filter Section for Completed Orders */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search size={16} />
                  <Label className="text-sm font-medium">Search Completed Orders</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="completed-customer-search" className="text-sm">Customer Name</Label>
                    <Input
                      id="completed-customer-search"
                      placeholder="Search by customer name..."
                      value={customerNameSearch}
                      onChange={(e) => setCustomerNameSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">From Date</Label>
                    <DatePicker
                      date={searchFromDate}
                      onSelect={setSearchFromDate}
                      placeholder="Select start date"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">To Date</Label>
                    <DatePicker
                      date={searchToDate}
                      onSelect={setSearchToDate}
                      placeholder="Select end date"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={clearCompletedFilters}
                      disabled={!hasActiveCompletedFilters}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {hasActiveCompletedFilters && (
                  <div className="text-sm text-muted-foreground">
                    Showing {searchFilteredCompletedOrders.length} of {completedOrders.length} completed orders
                  </div>
                )}
              </div>

              <Separator />

              {/* Orders grouped by completion date */}
              <div className="space-y-6">
                {sortedCompletedDateKeys.length > 0 ? (
                  sortedCompletedDateKeys.map(dateKey => (
                    <div key={dateKey} className="space-y-4">
                      <div className="flex items-center gap-2 sticky top-0 bg-background py-2 border-b">
                        <Calendar size={16} />
                        <h3 className="font-semibold text-lg">
                          {format(parseISO(dateKey), 'EEEE, MMMM do, yyyy')}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          ({groupedCompletedOrders[dateKey].length} order{groupedCompletedOrders[dateKey].length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="space-y-4 pl-6">
                        {groupedCompletedOrders[dateKey].map(order => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    {hasActiveCompletedFilters 
                      ? 'No completed orders found matching your search criteria.'
                      : (selectedSalesPerson === 'all' 
                          ? 'No completed orders found.' 
                          : `No completed orders found for ${selectedSalesPerson}.`)
                    }
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default OrderList;
