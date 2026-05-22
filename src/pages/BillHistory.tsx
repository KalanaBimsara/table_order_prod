import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Eye, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoiceBillTemplate from '@/components/invoicing/InvoiceBillTemplate';
import { useToast } from '@/hooks/use-toast';

interface Bill {
  id: string;
  bill_number: number;
  bill_to: string;
  driver_name: string | null;
  vehicle_number: string | null;
  order_numbers: string[];
  total_amount: number;
  total_quantity: number;
  bill_date: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 15;

const BillHistory = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, [currentPage, dateFilter]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bills')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter) {
        const dateStr = format(dateFilter, 'yyyy-MM-dd');
        query = query.eq('bill_date', dateStr);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setBills(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bill history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter bills by search term (client-side for immediate feedback)
  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(bill.bill_number).toLowerCase().includes(term) ||
      bill.bill_to.toLowerCase().includes(term) ||
      bill.order_numbers.some((orderNum) => orderNum.toLowerCase().includes(term)) ||
      bill.driver_name?.toLowerCase().includes(term) ||
      bill.vehicle_number?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearDateFilter = () => {
    setDateFilter(undefined);
    setCurrentPage(1);
  };

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bill History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill number, dealer, order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal min-w-[180px]',
                      !dateFilter && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Filter by date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setCurrentPage(1);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateFilter && (
                <Button variant="ghost" onClick={clearDateFilter}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Bills Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || dateFilter ? 'No bills match your search criteria' : 'No bills found'}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No.</TableHead>
                      <TableHead>Bill To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount (Rs.)</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{bill.bill_to}</TableCell>
                        <TableCell>{format(parseISO(bill.bill_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {bill.order_numbers.slice(0, 3).map((orderNum, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {orderNum}
                              </Badge>
                            ))}
                            {bill.order_numbers.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{bill.order_numbers.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{bill.total_quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {bill.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{bill.driver_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBill(bill)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} bills
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bill View/Print Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bill #{selectedBill?.bill_number}</DialogTitle>
          </DialogHeader>
          
          {selectedBill && (
            <>
              <div className="print:hidden flex gap-2 mb-4">
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
              
              <div className="bill-preview-content">
                <InvoiceBillTemplate
                  billNumber={String(selectedBill.bill_number)}
                  orderNumbers={selectedBill.order_numbers}
                  billTo={selectedBill.bill_to}
                  driverName={selectedBill.driver_name || ''}
                  vehicleNumber={selectedBill.vehicle_number || ''}
                  invoiceDate={format(parseISO(selectedBill.bill_date), 'dd/MM/yyyy')}
                  rows={[]}
                  totalAmount={selectedBill.total_amount}
                  totalQuantity={selectedBill.total_quantity}
                />
                <p className="text-center text-muted-foreground mt-4 print:hidden text-sm">
                  Note: This is a summary view. Original order details may not be available.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillHistory;
