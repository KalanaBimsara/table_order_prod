
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ChevronDown, Filter, Package, Calendar, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type OrderDetail = {
  id: string;
  customer_name: string;
  address: string;
  contact_number: string;
  status: string;
  price: number;
  delivery_fee: number;
  additional_charges: number;
  created_at: string;
  table_size: string;
  quantity: number;
  sales_person_name?: string;
  order_form_number?: string;
};

type OrderWithTables = OrderDetail & {
  total_items: number;
};

type OrderDetailsTableProps = {
  orders: OrderDetail[];
  loading: boolean;
};

type FilteredStats = {
  totalOrders: number;
  totalUnits: number;
  totalRevenue: number;
};

const ITEMS_PER_PAGE = 10;

const OrderDetailsTable = ({ orders: initialOrders, loading }: OrderDetailsTableProps) => {
  const [displayedOrders, setDisplayedOrders] = useState<OrderWithTables[]>([]);
  const [allOrders, setAllOrders] = useState<OrderWithTables[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredStats, setFilteredStats] = useState<FilteredStats | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);

  // Fetch orders with total items count
  const fetchOrdersWithItems = async (ordersList: OrderDetail[]): Promise<OrderWithTables[]> => {
    const ordersWithItems: OrderWithTables[] = [];
    
    for (const order of ordersList) {
      const { data: tables } = await supabase
        .from('order_tables')
        .select('quantity')
        .eq('order_id', order.id);
      
      const totalItems = tables?.reduce((sum, t) => sum + (t.quantity || 0), 0) || order.quantity || 1;
      
      ordersWithItems.push({
        ...order,
        total_items: totalItems
      });
    }
    
    return ordersWithItems;
  };

  useEffect(() => {
    const loadInitialOrders = async () => {
      if (initialOrders.length > 0) {
        const ordersWithItems = await fetchOrdersWithItems(initialOrders);
        setAllOrders(ordersWithItems);
        setDisplayedOrders(ordersWithItems.slice(0, ITEMS_PER_PAGE));
        setHasMore(ordersWithItems.length > ITEMS_PER_PAGE);
      }
    };
    loadInitialOrders();
  }, [initialOrders]);

  const loadMore = async () => {
    setLoadingMore(true);
    
    // Fetch more orders from database
    const offset = allOrders.length;
    const { data: moreOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);
    
    if (moreOrders && moreOrders.length > 0) {
      const ordersWithItems = await fetchOrdersWithItems(moreOrders as OrderDetail[]);
      const updatedAllOrders = [...allOrders, ...ordersWithItems];
      setAllOrders(updatedAllOrders);
      setDisplayedOrders(updatedAllOrders);
      setHasMore(moreOrders.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }
    
    setLoadingMore(false);
  };

  const applyDateFilter = async () => {
    if (!startDate || !endDate) return;
    
    setLoadingMore(true);
    
    const { data: filteredOrders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });
    
    if (filteredOrders) {
      const ordersWithItems = await fetchOrdersWithItems(filteredOrders as OrderDetail[]);
      
      // Calculate stats
      const totalUnits = ordersWithItems.reduce((sum, o) => sum + o.total_items, 0);
      const totalRevenue = ordersWithItems.reduce((sum, o) => 
        sum + o.price + (o.delivery_fee || 0) + (o.additional_charges || 0), 0);
      
      setFilteredStats({
        totalOrders: ordersWithItems.length,
        totalUnits,
        totalRevenue
      });
      
      setDisplayedOrders(ordersWithItems);
      setIsFiltered(true);
      setHasMore(false);
    }
    
    setLoadingMore(false);
  };

  const clearFilter = async () => {
    setStartDate('');
    setEndDate('');
    setFilteredStats(null);
    setIsFiltered(false);
    setDisplayedOrders(allOrders.slice(0, ITEMS_PER_PAGE));
    setHasMore(allOrders.length > ITEMS_PER_PAGE);
    
    // Reload initial orders
    if (initialOrders.length > 0) {
      const ordersWithItems = await fetchOrdersWithItems(initialOrders);
      setAllOrders(ordersWithItems);
      setDisplayedOrders(ordersWithItems.slice(0, ITEMS_PER_PAGE));
      setHasMore(ordersWithItems.length > ITEMS_PER_PAGE);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {isFiltered ? 'Filtered Orders' : 'Recent Orders'}
            </CardTitle>
            <CardDescription>
              {isFiltered 
                ? `Showing orders from ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`
                : 'Latest orders from the system'
              }
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilter ? 'Hide Filter' : 'Filter by Date'}
          </Button>
        </div>
        
        {/* Date Range Filter */}
        {showFilter && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button 
                onClick={applyDateFilter}
                disabled={!startDate || !endDate || loadingMore}
              >
                Apply Filter
              </Button>
              {isFiltered && (
                <Button variant="outline" onClick={clearFilter}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
            
            {/* Filtered Stats */}
            {filteredStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {filteredStats.totalOrders}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Total Orders</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {filteredStats.totalUnits}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Total Units Sold</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    LKR {filteredStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Total Revenue</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {displayedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No orders found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead>Table Size</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Sales Person</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.order_form_number || order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="truncate max-w-[120px]">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.contact_number}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {order.address}
                      </TableCell>
                      <TableCell>{order.table_size}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">
                          {order.total_items}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        LKR {(order.price + (order.delivery_fee || 0) + (order.additional_charges || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {order.sales_person_name || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* See More Button */}
            {hasMore && !isFiltered && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full sm:w-auto"
                >
                  {loadingMore ? (
                    'Loading...'
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      See More Orders
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Order Count */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing {displayedOrders.length} order{displayedOrders.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderDetailsTable;
