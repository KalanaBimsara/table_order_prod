import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Printer, FileText, Plus, X, Truck, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Order, TableItem, tableSizeOptions, getFactoryPrice } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import InvoiceBillTemplate, { calculateExtraFees } from '@/components/invoicing/InvoiceBillTemplate';

const TRANSPORT_MODES = [
  { value: 'PQ - 0825', label: 'PQ - 0825' },
  { value: 'LI - 8895', label: 'LI - 8895' },
  { value: 'DAC - 4912', label: 'DAC - 4912' },
  { value: 'pick_me', label: 'Pick Me' },
  { value: 'factory_pickup', label: 'Factory Pick Up' },
];

// Predefined dealer list for "Bill To"
const BILL_TO_OPTIONS = [
  { value: 'Kalana-Methupa', label: 'Kalana-Methupa' },
  { value: 'Kalana-Geeth', label: 'Kalana-Geeth' },
  { value: 'Kalana-Hasindu', label: 'Kalana-Hasindu' },
  { value: 'Bisora', label: 'Bisora' },
  { value: 'Lakmal Sale', label: 'Lakmal Sale' },
  { value: 'Factory Sale', label: 'Factory Sale' },
  { value: 'Hiran Sale', label: 'Hiran Sale' },
  { value: ' ', label: 'Other' },
];

const MAX_ROWS_PER_BILL = 10;

interface BillRow {
  id: string;
  quantity: number;
  item: string;
  orderNumber: string;
  deliveryCity: string;
  rate: number;
  amount: number;
  isExtraFee?: boolean;
}

const Invoicing: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceDate] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedBillTo, setSelectedBillTo] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [editedRows, setEditedRows] = useState<BillRow[]>([]);
  const [generatedBillNumber, setGeneratedBillNumber] = useState<number | null>(null);
  const [nextBillNumber, setNextBillNumber] = useState<number | null>(null);

  // Fetch delivery drivers and next bill number on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'delivery');
      
      if (!error && data) {
        setDrivers(data.filter(d => d.name));
      }
    };

    const fetchNextBillNumber = async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .order('bill_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error) {
        const lastBillNumber = data?.bill_number || 0;
        setNextBillNumber(lastBillNumber + 1);
      }
    };

    fetchDrivers();
    fetchNextBillNumber();
  }, []);

  const addOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    // Check if already added to current bill
    if (orders.some(o => o.order_form_number === orderNumber.trim())) {
      toast.error('Order already added to this bill');
      return;
    }

    // Check if this order number has been billed before
    const { data: existingBills, error: billCheckError } = await supabase
      .from('bills')
      .select('bill_number, order_numbers')
      .contains('order_numbers', [orderNumber.trim()]);

    if (!billCheckError && existingBills && existingBills.length > 0) {
      const billNumbers = existingBills.map(b => b.bill_number).join(', ');
      toast.warning(`Order #${orderNumber.trim()} has already been billed in Bill #${billNumbers}. Are you sure you want to add it again?`, {
        duration: 5000
      });
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_form_number', orderNumber.trim())
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        toast.error('Order not found');
        return;
      }

      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .eq('order_id', orderData.id);

      if (tablesError) throw tablesError;

      const mappedOrder: Order = {
        id: orderData.id,
        order_form_number: orderData.order_form_number,
        customerName: orderData.customer_name,
        customerDistrict: orderData.customer_district,
        address: orderData.address,
        contactNumber: orderData.contact_number,
        note: orderData.note || '',
        status: orderData.status as Order['status'],
        createdAt: new Date(orderData.created_at),
        totalPrice: Number(orderData.price),
        deliveryFee: Number(orderData.delivery_fee) || 0,
        additionalCharges: Number(orderData.additional_charges) || 0,
        deliveryDate: orderData.delivery_date,
        deliveryType: orderData.delivery_type as Order['deliveryType'],
        salesPersonName: orderData.sales_person_name,
        tables: (tablesData || []).map((t: any) => ({
          id: t.id,
          size: t.size,
          topColour: t.top_colour || t.colour,
          frameColour: t.frame_colour || t.colour,
          colour: t.colour,
          quantity: t.quantity,
          price: Number(t.price),
          legSize: t.leg_size,
          legShape: t.leg_shape,
          legHeight: t.leg_height,
          wireHoles: t.wire_holes,
          wireHolesComment: t.wire_holes_comment,
          frontPanelSize: t.front_panel_size,
          frontPanelLength: t.front_panel_length ? Number(t.front_panel_length) : undefined,
          lShapeOrientation: t.l_shape_orientation
        }))
      };

      setOrders(prev => [...prev, mappedOrder]);
      setOrderNumber('');
      toast.success(`Order ${mappedOrder.order_form_number} added`);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const removeOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Generate all bill rows from orders - using FACTORY PRICES
  const generateBillRows = (): BillRow[] => {
    const rows: BillRow[] = [];
    let rowIndex = 0;

    orders.forEach(order => {
      order.tables.forEach(table => {
        const { extraFee, feeDetails } = calculateExtraFees(table);
        
        // Get factory price instead of sales price
        const factoryPrice = getFactoryPrice(table.size);
        const itemAmount = factoryPrice * table.quantity;

        // Main item row with factory price
        rows.push({
          id: `${order.id}-${table.id}-main-${rowIndex}`,
          quantity: table.quantity,
          item: table.size,
          orderNumber: order.order_form_number || '',
          deliveryCity: order.customerDistrict || '',
          rate: factoryPrice,
          amount: itemAmount
        });
        rowIndex++;

        // Extra fee rows
        feeDetails.forEach((detail, feeIndex) => {
          rows.push({
            id: `${order.id}-${table.id}-fee-${feeIndex}-${rowIndex}`,
            quantity: table.quantity,
            item: detail,
            orderNumber: order.order_form_number || '',
            deliveryCity: '',
            rate: 1000,
            amount: 1000 * table.quantity,
            isExtraFee: true
          });
          rowIndex++;
        });
      });
    });

    return rows;
  };

  // Sync editedRows when orders change
  useEffect(() => {
    const generatedRows = generateBillRows();
    setEditedRows(generatedRows);
  }, [orders]);

  // Update a row's item or rate
  const updateRow = (rowId: string, field: 'item' | 'rate', value: string | number) => {
    setEditedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'rate') {
          updatedRow.amount = updatedRow.quantity * (typeof value === 'number' ? value : parseFloat(value) || 0);
        }
        return updatedRow;
      }
      return row;
    }));
  };

  // Split rows into pages of max 10 rows each
  const generateBillPages = () => {
    const pages: BillRow[][] = [];

    for (let i = 0; i < editedRows.length; i += MAX_ROWS_PER_BILL) {
      pages.push(editedRows.slice(i, i + MAX_ROWS_PER_BILL));
    }

    return pages.length > 0 ? pages : [[]];
  };

  // Calculate totals using edited rows
  const calculateTotals = () => {
    let totalAmount = 0;
    let totalQuantity = 0;

    editedRows.forEach(row => {
      totalAmount += row.amount;
      if (!row.isExtraFee) {
        totalQuantity += row.quantity;
      }
    });

    return { totalAmount, totalQuantity };
  };

  // Save bill to database - bill_number is auto-generated
  const saveBillToDatabase = async () => {
    if (!selectedBillTo) {
      toast.error('Please select "Bill To" option');
      return false;
    }
    if (orders.length === 0) {
      toast.error('Please add at least one order');
      return false;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to save bills');
        return false;
      }

      const totals = calculateTotals();
      const billToLabel = BILL_TO_OPTIONS.find(o => o.value === selectedBillTo)?.label || selectedBillTo;
      const driverName = drivers.find(d => d.id === selectedDriver)?.name || '';
      const vehicleLabel = TRANSPORT_MODES.find(m => m.value === selectedVehicle)?.label || '';

      const { data, error } = await supabase.from('bills').insert([{
        bill_to: billToLabel,
        driver_name: driverName,
        vehicle_number: vehicleLabel,
        order_numbers: orders.map(o => o.order_form_number || '').filter(Boolean),
        total_amount: totals.totalAmount,
        total_quantity: totals.totalQuantity,
        bill_date: new Date().toISOString().split('T')[0],
        created_by: user.id
      }] as any).select('id, bill_number').single();

      if (error) {
        throw error;
      }

      if (data) {
        setGeneratedBillNumber(data.bill_number);

        // Save bill items
        const billItems = editedRows.map(row => ({
          bill_id: data.id,
          quantity: row.quantity,
          item: row.item,
          order_number: row.orderNumber,
          delivery_city: row.deliveryCity,
          rate: row.rate,
          amount: row.amount,
          is_extra_fee: row.isExtraFee || false
        }));

        const { error: itemsError } = await supabase
          .from('bill_items')
          .insert(billItems as any);

        if (itemsError) {
          console.error('Error saving bill items:', itemsError);
          // Don't fail completely, bill is already saved
        }
      }

      toast.success('Bill saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save bill');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!selectedBillTo) {
      toast.error('Please select "Bill To" option');
      return;
    }
    
    // Save bill before printing
    const saved = await saveBillToDatabase();
    if (saved) {
      window.print();
    }
  };

  const handleDownload = async () => {
    if (!selectedBillTo) {
      toast.error('Please select "Bill To" option');
      return;
    }

    // Save bill before downloading
    const saved = await saveBillToDatabase();
    if (!saved) return;

    const invoiceContent = document.getElementById('invoice-content');
    if (invoiceContent) {
      const billNum = generatedBillNumber || 'draft';
      const opt = {
        margin: 0.2,
        filename: `Bill-${billNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css'], after: '.bill-sheet.landscape-a4' }
      };
      try {
        await html2pdf().set(opt).from(invoiceContent).save();
        toast.success('Bill downloaded successfully! (Customer + Account copies)');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to download bill');
      }
    }
  };

  const billPages = generateBillPages();
  const totals = calculateTotals();
  const orderNumbers = orders.map(o => o.order_form_number || '').filter(Boolean);
  const driverName = drivers.find(d => d.id === selectedDriver)?.name;
  const vehicleLabel = TRANSPORT_MODES.find(m => m.value === selectedVehicle)?.label;
  const billToLabel = BILL_TO_OPTIONS.find(o => o.value === selectedBillTo)?.label || '';
  const displayBillNumber = generatedBillNumber ? String(generatedBillNumber) : (nextBillNumber ? String(nextBillNumber) : '(Loading...)');

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto mb-8 no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Invoice / Bill Generator (Factory Prices)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bill To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bill To *</Label>
              <Select value={selectedBillTo} onValueChange={setSelectedBillTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer/location" />
                </SelectTrigger>
                <SelectContent>
                  {BILL_TO_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bill Number</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground flex items-center">
                {displayBillNumber}
              </div>
            </div>
          </div>

          {/* Driver and Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Driver Name</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle Number</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add Orders */}
          <div>
            <Label htmlFor="orderNumber">Add Order Numbers</Label>
            <div className="flex gap-2">
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g., 839)"
                onKeyDown={(e) => e.key === 'Enter' && addOrder()}
              />
              <Button onClick={addOrder} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Added Orders */}
          {orders.length > 0 && (
            <div>
              <Label className="mb-2 block">Added Orders ({orders.length})</Label>
              <div className="flex flex-wrap gap-2">
                {orders.map(order => (
                  <Badge key={order.id} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                    Order #{order.order_form_number} - {order.customerName}
                    <button
                      onClick={() => removeOrder(order.id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total items: {totals.totalQuantity} | Total (Factory): LKR {totals.totalAmount.toLocaleString()}
                {billPages.length > 1 && ` | Will generate ${billPages.length} bill pages`}
              </p>
            </div>
          )}

          {/* Editable Bill Items */}
          {editedRows.length > 0 && (
            <div>
              <Label className="mb-2 block">Edit Bill Items</Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-left">Order</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedRows.map(row => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">{row.isExtraFee ? '' : row.quantity}</td>
                        <td className="p-2">
                          <Input
                            value={row.item}
                            onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="p-2 text-muted-foreground">{row.isExtraFee ? '' : row.orderNumber}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={row.rate}
                            onChange={(e) => updateRow(row.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right w-24 ml-auto"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">{row.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {orders.length > 0 && (
            <div className="flex gap-4">
              <Button onClick={handlePrint} variant="outline" disabled={saving}>
                <Printer className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save & Print'}
              </Button>
              <Button onClick={handleDownload} variant="outline" disabled={saving}>
                <Download className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save & Download PDF'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Preview & Print/PDF: One landscape A4 per bill page – left half = Customer Copy, right half = Account Copy */}
      {orders.length > 0 && selectedBillTo && (
        <div id="invoice-content" className="bill-print-root max-w-4xl mx-auto">
          {billPages.map((pageRows, pageIndex) => (
            <div key={pageIndex} className="bill-sheet landscape-a4">
              {/* Left half: Customer Copy (1) */}
              <div className="bill-half bill-half-left">
                <div className="bill-half-inner">
                  <InvoiceBillTemplate
                    billNumber={displayBillNumber}
                    orderNumbers={orderNumbers}
                    rows={pageRows}
                    pageNumber={pageIndex + 1}
                    totalPages={billPages.length}
                    billTo={billToLabel}
                    driverName={driverName}
                    vehicleNumber={vehicleLabel}
                    totalAmount={totals.totalAmount}
                    totalQuantity={totals.totalQuantity}
                    invoiceDate={invoiceDate}
                    copyLabel="Customer Copy"
                    variant="customer"
                  />
                </div>
              </div>
              {/* Right half: Account Copy (2) */}
              <div className="bill-half bill-half-right">
                <div className="bill-half-inner">
                  <InvoiceBillTemplate
                    billNumber={displayBillNumber}
                    orderNumbers={orderNumbers}
                    rows={pageRows}
                    pageNumber={pageIndex + 1}
                    totalPages={billPages.length}
                    billTo={billToLabel}
                    driverName={driverName}
                    vehicleNumber={vehicleLabel}
                    totalAmount={totals.totalAmount}
                    totalQuantity={totals.totalQuantity}
                    invoiceDate={invoiceDate}
                    copyLabel="Account Copy"
                    variant="account"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoicing;