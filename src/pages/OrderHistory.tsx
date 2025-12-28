
import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from '@/components/OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const OrderHistory: React.FC = () => {
  const { completedOrders, hasMoreCompleted, loadingMoreCompleted, loadMoreCompletedOrders } = useApp();
  const { user } = useAuth();
  
  const [searchFromDate, setSearchFromDate] = useState<Date | undefined>();
  const [searchToDate, setSearchToDate] = useState<Date | undefined>();
  const [customerNameSearch, setCustomerNameSearch] = useState('');

  // Filter completed orders based on the current user if they're a delivery person
  const baseFilteredOrders = user 
    ? completedOrders.filter(order => 
        !order.assignedTo && !order.delivery_person_id || 
        order.assignedTo === user.id || 
        order.delivery_person_id === user.id
      )
    : completedOrders;

  // Apply date and customer name filters
  const searchFilteredOrders = useMemo(() => {
    let filtered = baseFilteredOrders;

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
  }, [baseFilteredOrders, searchFromDate, searchToDate, customerNameSearch]);

  // Group orders by completion date
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: typeof searchFilteredOrders } = {};
    
    searchFilteredOrders.forEach(order => {
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
  }, [searchFilteredOrders]);

  // Get sorted date keys (most recent first)
  const sortedDateKeys = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  const clearFilters = () => {
    setSearchFromDate(undefined);
    setSearchToDate(undefined);
    setCustomerNameSearch('');
  };

  const hasActiveFilters = searchFromDate || searchToDate || customerNameSearch.trim();

  const exportToExcel = () => {
    if (searchFilteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    // Prepare data for Excel export
    const exportData = searchFilteredOrders.flatMap(order => 
      order.tables.map((table, index) => ({
        'Order ID': order.id,
        'Customer Name': order.customerName,
        'Contact Number': order.contactNumber,
        'Address': order.address,
        'Table Size': table.size,
        'Top Colour': table.topColour,
        'Frame Colour': table.frameColour,
        'Colour': table.colour,
        'Quantity': table.quantity,
        'Table Price': table.price,
        'Delivery Fee': order.deliveryFee || 0,
        'Additional Charges': order.additionalCharges || 0,
        'Total Order Amount': order.totalPrice,
        'Sales Person': order.salesPersonName || 'N/A',
        'Status': order.status,
        'Created At': order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        'Completed At': order.completedAt ? format(new Date(order.completedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        'Note': order.note || 'N/A'
      }))
    );

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Completed Orders');

    // Generate filename with date range or current date
    let filename = 'completed_orders';
    if (searchFromDate && searchToDate) {
      filename += `_${format(searchFromDate, 'yyyy-MM-dd')}_to_${format(searchToDate, 'yyyy-MM-dd')}`;
    } else if (searchFromDate) {
      filename += `_from_${format(searchFromDate, 'yyyy-MM-dd')}`;
    } else if (searchToDate) {
      filename += `_until_${format(searchToDate, 'yyyy-MM-dd')}`;
    } else {
      filename += `_${format(new Date(), 'yyyy-MM-dd')}`;
    }
    filename += '.xlsx';

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success(`Excel report downloaded: ${filename}`);
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Order History</h1>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              Completed Orders
            </div>
            <Button 
              onClick={exportToExcel}
              disabled={searchFilteredOrders.length === 0}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export to Excel
            </Button>
          </CardTitle>
          <CardDescription>
            All successfully delivered and completed orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filter Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <Label className="text-sm font-medium">Search & Filter Options</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-search" className="text-sm">Customer Name</Label>
                <Input
                  id="customer-search"
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
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                Showing {searchFilteredOrders.length} of {baseFilteredOrders.length} completed orders
              </div>
            )}
          </div>

          <Separator />

          {/* Orders grouped by date */}
          <div className="space-y-6">
            {sortedDateKeys.length > 0 ? (
              sortedDateKeys.map(dateKey => (
                <div key={dateKey} className="space-y-4">
                  <div className="flex items-center gap-2 sticky top-0 bg-background py-2 border-b">
                    <Calendar size={16} />
                    <h3 className="font-semibold text-lg">
                      {format(parseISO(dateKey), 'EEEE, MMMM do, yyyy')}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      ({groupedOrders[dateKey].length} order{groupedOrders[dateKey].length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  <div className="space-y-4 pl-6">
                    {groupedOrders[dateKey].map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {hasActiveFilters 
                  ? 'No completed orders found matching your search criteria.'
                  : 'No completed orders yet.'
                }
              </p>
            )}
            
            {/* Show More Button */}
            {!hasActiveFilters && hasMoreCompleted && sortedDateKeys.length > 0 && (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderHistory;
