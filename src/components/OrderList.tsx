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
import { Order, OrderStatus, DeliveryStatus, colourOptions, tableSizeOptions } from '@/types/order';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  sales_person_name: string | null;
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
  const { getFilteredOrders, orders, assignOrder, completeOrder, getSalesPersons, completedOrders: paginatedCompletedOrders, hasMoreCompleted, loadingMoreCompleted, loadMoreCompletedOrders } = useApp();
  const { userRole, user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');
  const [selectedTopColor, setSelectedTopColor] = useState<string>('all');
  const [selectedFrameColor, setSelectedFrameColor] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'orderNumber' | 'customerName' | 'address'>('all');
  
  // Date search states
  const [searchFromDate, setSearchFromDate] = useState<Date | undefined>();
  const [searchToDate, setSearchToDate] = useState<Date | undefined>();
  const [customerNameSearch, setCustomerNameSearch] = useState('');

  // Filter orders based on global search and filter type
  const filterOrdersBySearch = (orderList: Order[]) => {
    if (!globalSearch.trim()) return orderList;
    
    const searchLower = globalSearch.toLowerCase().trim();
    
    if (searchFilter === 'orderNumber') {
      return orderList.filter(order => 
        order.orderFormNumber && order.orderFormNumber.toLowerCase().includes(searchLower)
      );
    }
    
    if (searchFilter === 'customerName') {
      return orderList.filter(order => 
        order.customerName.toLowerCase().includes(searchLower)
      );
    }
    
    if (searchFilter === 'address') {
      return orderList.filter(order => 
        order.address.toLowerCase().includes(searchLower)
      );
    }
    
    return orderList.filter(order => 
      order.customerName.toLowerCase().includes(searchLower) ||
      order.address.toLowerCase().includes(searchLower) ||
      order.contactNumber.toLowerCase().includes(searchLower) ||
      (order.orderFormNumber && order.orderFormNumber.toLowerCase().includes(searchLower))
    );
  };

  // Set of standard size values (from the order form dropdown)
  const standardSizeValues = useMemo(() => new Set(tableSizeOptions.map(o => o.value)), []);

  // Filter orders by table properties (top color, frame color, size)
  const filterOrdersByTableProps = (orderList: Order[]) => {
    if (selectedTopColor === 'all' && selectedFrameColor === 'all' && selectedSize === 'all') {
      return orderList;
    }

    return orderList.filter(order => 
      order.tables.some(table => {
        const topColorMatch = selectedTopColor === 'all' || table.topColour === selectedTopColor;
        const frameColorMatch = selectedFrameColor === 'all' || table.frameColour === selectedFrameColor;
        let sizeMatch = selectedSize === 'all';
        if (!sizeMatch) {
          if (selectedSize === 'custom') {
            sizeMatch = !standardSizeValues.has(table.size);
          } else {
            sizeMatch = table.size === selectedSize;
          }
        }
        return topColorMatch && frameColorMatch && sizeMatch;
      })
    );
  };

  const pendingOrders = filterOrdersByTableProps(filterOrdersBySearch(getFilteredOrders('pending', selectedSalesPerson)));
  const assignedOrders = filterOrdersByTableProps(filterOrdersBySearch(getFilteredOrders('assigned', selectedSalesPerson)));
  
  // Use paginated completed orders from context, apply sales person filter and table filters
  const completedOrders = useMemo(() => {
    let filtered = paginatedCompletedOrders;
    if (selectedSalesPerson && selectedSalesPerson !== 'all') {
      filtered = filtered.filter(order => order.salesPersonName === selectedSalesPerson);
    }
    filtered = filterOrdersByTableProps(filtered);
    return filterOrdersBySearch(filtered);
  }, [paginatedCompletedOrders, selectedSalesPerson, selectedTopColor, selectedFrameColor, selectedSize, globalSearch, searchFilter]);
  
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [deliveryCompletedOrders, setDeliveryCompletedOrders] = useState<Order[]>([]);
  const salesPersons = getSalesPersons();

  // Derive available filter options from all orders (pending + assigned + completed)
  const topColorOptions = useMemo(() => {
    const colors = new Set<string>();
    orders.forEach(order => order.tables.forEach(table => {
      if (table.topColour) colors.add(table.topColour);
    }));
    paginatedCompletedOrders.forEach(order => order.tables.forEach(table => {
      if (table.topColour) colors.add(table.topColour);
    }));
    return Array.from(colors).sort();
  }, [orders, paginatedCompletedOrders]);

  const frameColorOptions = useMemo(() => {
    const colors = new Set<string>();
    orders.forEach(order => order.tables.forEach(table => {
      if (table.frameColour) colors.add(table.frameColour);
    }));
    paginatedCompletedOrders.forEach(order => order.tables.forEach(table => {
      if (table.frameColour) colors.add(table.frameColour);
    }));
    return Array.from(colors).sort();
  }, [orders, paginatedCompletedOrders]);

  // Build the size dropdown options: standard sizes (from the order form) plus "Custom Size"
  // for any non-standard sizes present in the orders.
  const sizeFilterOptions = useMemo(() => {
    const standardSizes = tableSizeOptions.map(option => ({
      value: option.value,
      label: option.label,
    }));
    const hasCustomSize = orders.some(order =>
      order.tables.some(table => table.size && !standardSizeValues.has(table.size))
    ) || paginatedCompletedOrders.some(order =>
      order.tables.some(table => table.size && !standardSizeValues.has(table.size))
    );
    if (hasCustomSize) {
      return [...standardSizes, { value: 'custom', label: 'Custom Size' }];
    }
    return standardSizes;
  }, [orders, paginatedCompletedOrders, standardSizeValues]);

  // Label map for color options
  const colorLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    colourOptions.forEach(option => map[option.value] = option.label);
    return map;
  }, []);

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

  const clearTableFilters = () => {
    setSelectedTopColor('all');
    setSelectedFrameColor('all');
    setSelectedSize('all');
  };

  const hasActiveTableFilters = selectedTopColor !== 'all' || selectedFrameColor !== 'all' || selectedSize !== 'all';

  const hasActiveCompletedFilters = searchFromDate || searchToDate || customerNameSearch.trim();

  React.useEffect(() => {
    if (userRole === 'delivery') {
      fetchAvailableOrders();
      fetchReadyOrders();
      fetchDeliveryCompletedOrders();
    }
  }, [userRole, user]);

  // Optimized: fetchReadyOrders
  const fetchReadyOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id, customer_name, address, contact_number,
          order_form_number, table_size, colour, quantity, price, note, status, created_at,
          completed_at, delivery_person_id, sales_person_name
        `)
        .eq('status', 'pending')
        .eq('delivery_status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ordersData?.length) return setReadyOrders([]);

      const orderIds = ordersData.map(o => o.id);

      const [{ data: tablesData, error: tablesError }] = await Promise.all([
        supabase.from('order_tables').select('*').in('order_id', orderIds)
      ]);
      if (tablesError) throw tablesError;

      const tablesByOrder = (tablesData || []).reduce((acc: any, t: any) => {
        if (!acc[t.order_id]) acc[t.order_id] = [];
        acc[t.order_id].push(t);
        return acc;
      }, {});

      const formatted = ordersData.map(order => ({
        id: order.id,
        orderFormNumber: order.order_form_number,
        order_form_number: order.order_form_number,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id]?.map(t => ({
          id: t.id,
          size: t.size,
          colour: t.colour,
          topColour: t.top_colour || t.colour,
          frameColour: t.frame_colour || t.colour,
          quantity: t.quantity,
          price: t.price,
        })) || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity,
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,
        deliveryStatus: 'ready' as DeliveryStatus,
      }));

      setReadyOrders(formatted);
    } catch (err) {
      console.error('Fetch ready orders failed:', err);
      toast.error('Failed to fetch ready orders');
    }
  };

  // Optimized: fetchAvailableOrders
  const fetchAvailableOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id, customer_name, address, contact_number,
          order_form_number, table_size, colour, quantity, price, note, status, created_at,
          completed_at, delivery_person_id, sales_person_name
        `)
        .eq('status', 'pending')
        .neq('delivery_status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ordersData?.length) return setAvailableOrders([]);

      const orderIds = ordersData.map(o => o.id);

      // Fetch related table data in parallel
      const [{ data: tablesData, error: tablesError }] = await Promise.all([
        supabase.from('order_tables').select('*').in('order_id', orderIds)
      ]);
      if (tablesError) throw tablesError;

      const tablesByOrder = (tablesData || []).reduce((acc: any, t: any) => {
        if (!acc[t.order_id]) acc[t.order_id] = [];
        acc[t.order_id].push(t);
        return acc;
      }, {});

      const formatted = ordersData.map(order => ({
        id: order.id,
        orderFormNumber: order.order_form_number,
        order_form_number: order.order_form_number,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id]?.map(t => ({
          id: t.id,
          size: t.size,
          colour: t.colour,
          topColour: t.top_colour || t.colour,
          frameColour: t.frame_colour || t.colour,
          quantity: t.quantity,
          price: t.price,
        })) || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity,
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,
      }));

      setAvailableOrders(formatted);
    } catch (err) {
      console.error('Fetch available orders failed:', err);
      toast.error('Failed to fetch available orders');
    }
  };

  // Optimized: fetchDeliveryCompletedOrders
  const fetchDeliveryCompletedOrders = async () => {
    if (!user) return;
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id, customer_name, address, contact_number,
          order_form_number, table_size, colour, quantity, price, note, status, created_at,
          completed_at, delivery_person_id, sales_person_name
        `)
        .eq('status', 'completed')
        .eq('delivery_person_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (!ordersData?.length) return setDeliveryCompletedOrders([]);

      const orderIds = ordersData.map(o => o.id);

      const [{ data: tablesData, error: tablesError }] = await Promise.all([
        supabase.from('order_tables').select('*').in('order_id', orderIds)
      ]);
      if (tablesError) throw tablesError;

      const tablesByOrder = (tablesData || []).reduce((acc: any, t: any) => {
        if (!acc[t.order_id]) acc[t.order_id] = [];
        acc[t.order_id].push(t);
        return acc;
      }, {});

      const formatted = ordersData.map(order => ({
        id: order.id,
        orderFormNumber: order.order_form_number,
        order_form_number: order.order_form_number,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id]?.map(t => ({
          id: t.id,
          size: t.size,
          colour: t.colour,
          topColour: t.top_colour || t.colour,
          frameColour: t.frame_colour || t.colour,
          quantity: t.quantity,
          price: t.price,
        })) || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity,
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,
      }));

      setDeliveryCompletedOrders(formatted);
    } catch (err) {
      console.error('Fetch completed deliveries failed:', err);
      toast.error('Failed to fetch completed deliveries');
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
    const filteredAvailableOrders = filterOrdersBySearch(availableOrders);
    const filteredReadyOrders = filterOrdersBySearch(readyOrders);
    const filteredDeliveryCompletedOrders = filterOrdersBySearch(deliveryCompletedOrders);

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
          <div className="mb-4 space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search Orders</Label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="search"
                  type="text"
                  placeholder={
                    searchFilter === 'orderNumber' ? "Search by order number..." :
                    searchFilter === 'customerName' ? "Search by customer name..." :
                    searchFilter === 'address' ? "Search by address..." :
                    "Search by customer, address, contact, or order number..."
                  }
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchFilter} onValueChange={(value: 'all' | 'orderNumber' | 'customerName' | 'address') => setSearchFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="orderNumber">Order Number</SelectItem>
                  <SelectItem value="customerName">Customer Name</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Tabs defaultValue="myDeliveries">
            <TabsList className="grid w-full grid-cols-3 mobile-tabs-container">
              <TabsTrigger value="myDeliveries" className="mobile-tab-item">
                <Truck size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">My Deliveries</span>
              </TabsTrigger>
              <TabsTrigger value="ready" className="mobile-tab-item">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Ready</span>
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
              <div className="mb-4 text-sm text-muted-foreground">
                Orders ready for delivery pickup - marked by management
              </div>
              <div className="space-y-6">
                {filteredReadyOrders.length > 0 ? (
                  filteredReadyOrders.map(order => (
                    <div key={order.id} className="relative border-2 border-green-200 rounded-lg bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <div className="p-1">
                        <OrderCard 
                          key={order.id} 
                          order={order}
                          showSalesPerson={true}
                          actionButton={
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium">
                                  ✓ Assign to Me
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Assignment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to assign order #{order.orderFormNumber || ''} ({order.customerName}) to yourself?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleSelfAssign(order.id)}>
                                    Yes, Assign to Me
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          }
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No orders ready for delivery yet.
                  </p>
                )}
              </div>
            </TabsContent>
            
            
            <TabsContent value="completed" className="mt-4">
              <div className="space-y-6">
                {filteredDeliveryCompletedOrders.length > 0 ? (
                  filteredDeliveryCompletedOrders.map(order => (
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
          <div className="mb-4 space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search Orders</Label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="search"
                  type="text"
                  placeholder={
                    searchFilter === 'orderNumber' ? "Search by order number..." :
                    searchFilter === 'customerName' ? "Search by customer name..." :
                    searchFilter === 'address' ? "Search by address..." :
                    "Search by customer, address, contact, or order number..."
                  }
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchFilter} onValueChange={(value: 'all' | 'orderNumber' | 'customerName' | 'address') => setSearchFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="orderNumber">Order Number</SelectItem>
                  <SelectItem value="customerName">Customer Name</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
        <div className="mb-4">
          <Label htmlFor="search" className="text-sm font-medium mb-2 block">Search Orders</Label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                id="search"
                type="text"
                placeholder={
                  searchFilter === 'orderNumber' ? "Search by order number..." :
                  searchFilter === 'customerName' ? "Search by customer name..." :
                  searchFilter === 'address' ? "Search by address..." :
                  "Search by customer, address, contact, or order number..."
                }
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={searchFilter} onValueChange={(value: 'all' | 'orderNumber' | 'customerName' | 'address') => setSearchFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="orderNumber">Order Number</SelectItem>
                <SelectItem value="customerName">Customer Name</SelectItem>
                <SelectItem value="address">Address</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Table Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <label className="text-sm font-medium">Filter by Table Details:</label>
            </div>
            {hasActiveTableFilters && (
              <Button variant="ghost" size="sm" onClick={clearTableFilters}>
                Clear Table Filters
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {salesPersons.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Sales Person</label>
                <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sales persons" />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Top Color</label>
              <Select value={selectedTopColor} onValueChange={setSelectedTopColor}>
                <SelectTrigger>
                  <SelectValue placeholder="All top colors" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <SelectItem value="all">All Top Colors</SelectItem>
                  {topColorOptions.map(color => (
                    <SelectItem key={color} value={color}>
                      {colorLabelMap[color] || color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frame Color</label>
              <Select value={selectedFrameColor} onValueChange={setSelectedFrameColor}>
                <SelectTrigger>
                  <SelectValue placeholder="All frame colors" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <SelectItem value="all">All Frame Colors</SelectItem>
                  {frameColorOptions.map(color => (
                    <SelectItem key={color} value={color}>
                      {colorLabelMap[color] || color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="All sizes" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px]">
                  <SelectItem value="all">All Sizes</SelectItem>
                  {sizeFilterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

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

                {/* Show More Button */}
                {!hasActiveCompletedFilters && hasMoreCompleted && sortedCompletedDateKeys.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={loadMoreCompletedOrders}
                      disabled={loadingMoreCompleted}
                      variant="outline"
                      className="min-w-[200px]"
                    >
                      {loadingMoreCompleted ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Loading...
                        </>
                      ) : (
                        'Show More Orders'
                      )}
                    </Button>
                  </div>
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
