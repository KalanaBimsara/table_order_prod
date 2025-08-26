import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Download, Printer } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, colourOptions, tableSizeOptions } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

const businessData = {
  "Niayana Furniture": {
    phone: "+94 76 152 8123",
    email: "niyanafurniture@gmail.com",
    address: "Gammanpila, Bandaragama"
  },
  "Table LK": {
    phone: "+94 76 152 8123",
    email: "contact@tablelk.com",
    address: "Gammanpila, Bandaragama"
  },
  "Maduwa Furniture": {
    phone: "+94 72 949 8057",
    email: "sales@maduwafurniture.lk",
    address: "Gammanpila, Bandaragama"
  },
  "Smart Desk Lanka": {
    phone: "+94 70 747 7861",
    email: "hello@smartdesklanka.com",
    address: "Gammanpila, Bandaragama"
  },
  "Bisora Furniture": {
    phone: "+94 71 148 2882",
    email: "info@bisorafurniture.lk",
    address: "Gammanpila, Bandaragama"
  }
};

const defaultTermsAndConditions = `Bank Payment Details:
Account Name: Kalana Bimsara
Account Number: 088200282888912
Bank: People's Bank
Branch: Ratnapura Branch
Note: After making the payment, kindly share the payment slip via WhatsApp or email for verification. Production will begin once payment is confirmed.

Advance Payment:
A 50% advance payment is required to confirm the order. Production will commence only after the advance is received.

Order Confirmation:
Order details including sizes, colors, and quantities must be finalized at the time of placing the order. Any changes after confirmation may affect delivery timelines.

Inspection and Quality Check:
Customers are strongly advised to inspect the tables and verify quality at the time of delivery or collection.

Cancellation:
Order cancellations after production has started will not be eligible for a refund of the advance.

Warranty:
Our tables come with a 5-year warranty for structural issues.
This warranty does not cover:
• Damages caused by mishandling or improper use
• Exposure to rain, floods, or any form of heavy water contact
• Excessive heat or direct fire exposure`;

const Invoice: React.FC = () => {
  const {
    orderId
  } = useParams<{
    orderId: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    orders
  } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isQuotation, setIsQuotation] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState(defaultTermsAndConditions);
  const [editableAmountPaid, setEditableAmountPaid] = useState(0);

  const handleBusinessSelect = (businessName: string) => {
    setBusinessName(businessName);
    const businessInfo = businessData[businessName as keyof typeof businessData];
    if (businessInfo) {
      setBusinessPhone(businessInfo.phone);
      setBusinessEmail(businessInfo.email);
      setBusinessAddress(businessInfo.address);
    }
  };
  useEffect(() => {
    if (orderId) {
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        
        // Check if this is a quotation
        const quotationParam = searchParams.get('quotation');
        const businessParam = searchParams.get('business');
        
        if (quotationParam === 'true') {
          setIsQuotation(true);
          setInvoiceNumber(`QUO-${foundOrder.id.slice(0, 8).toUpperCase()}`);
          if (businessParam) {
            setBusinessName(decodeURIComponent(businessParam));
          }
        } else {
          setInvoiceNumber(`INV-${foundOrder.id.slice(0, 8).toUpperCase()}`);
        }

        // Calculate total amount for editable amount paid
        const subtotal = foundOrder.tables?.reduce((sum, table) => sum + (table.price * table.quantity), 0) || 0;
        const totalAmount = subtotal + (foundOrder.deliveryFee || 0) + (foundOrder.additionalCharges || 0);
        setEditableAmountPaid(totalAmount);

        // Also check localStorage for quotation data
        const quotationData = localStorage.getItem(`quotation-${orderId}`);
        if (quotationData) {
          const data = JSON.parse(quotationData);
          if (data.businessName) {
            setBusinessName(data.businessName);
            setIsQuotation(true);
            setInvoiceNumber(`QUO-${foundOrder.id.slice(0, 8).toUpperCase()}`);
          }
        }
      } else {
        toast.error('Order not found');
        navigate('/history');
      }
    }
  }, [orderId, orders, navigate, searchParams]);
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setLogoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const getTableSizeLabel = (value: string) => {
    const option = tableSizeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const getColourLabel = (value: string) => {
    const option = colourOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(price);
  };
  const handlePrint = () => {
    window.print();
  };
  const handleDownload = async () => {
    const invoiceContent = document.getElementById('invoice-content');
    if (invoiceContent) {
      const opt = {
        margin: 0.5,
        filename: `${isQuotation ? 'Quotation' : 'Invoice'}-${invoiceNumber}.pdf`,
        image: {
          type: 'jpeg',
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait'
        }
      };
      try {
        await html2pdf().set(opt).from(invoiceContent).save();
        toast.success(`${isQuotation ? 'Quotation' : 'Invoice'} downloaded successfully!`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error(`Failed to download ${isQuotation ? 'quotation' : 'invoice'}. Please try again.`);
      }
    }
  };
  if (!order) {
    return <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>;
  }
  return <div className="container mx-auto px-4 py-8">
      <div className="mb-6 no-print">
        <Button onClick={() => navigate('/history')} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Order History
        </Button>
        
        <div className="flex gap-4 mb-6">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="no-print">
          <CardTitle>{isQuotation ? 'Quotation Generator' : 'Invoice Generator'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Business Information Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Select onValueChange={handleBusinessSelect} value={businessName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business name" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(businessData).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceNumber">{isQuotation ? 'Quotation Number' : 'Invoice Number'}</Label>
              <Input id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input id="businessPhone" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="Enter business phone" />
            </div>
            <div>
              <Label htmlFor="invoiceDate">{isQuotation ? 'Quotation Date' : 'Invoice Date'}</Label>
              <Input id="invoiceDate" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input id="businessEmail" type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="Enter business email" />
            </div>
            <div>
              <Label htmlFor="logo">Business Logo</Label>
              <div className="flex items-center gap-2">
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <Button type="button" variant="outline" onClick={() => document.getElementById('logo')?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                {logoUrl && <span className="text-sm text-green-600">Logo uploaded</span>}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea id="businessAddress" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Enter your business address" rows={3} />
            </div>
            <div>
              <Label htmlFor="amountPaid">Amount Paid</Label>
              <Input
                id="amountPaid"
                type="number"
                value={editableAmountPaid}
                onChange={e => setEditableAmountPaid(Number(e.target.value))}
                placeholder="Enter amount paid"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
              <Textarea 
                id="termsAndConditions" 
                value={termsAndConditions} 
                onChange={e => setTermsAndConditions(e.target.value)} 
                placeholder="Enter terms and conditions" 
                rows={8}
                className="text-sm"
              />
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="bg-white p-8 print:p-0">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  {logoUrl && <img src={logoUrl} alt="Business Logo" className="w-16 h-16 object-contain" />}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{businessName || 'Your Business Name'}</h1>
                    <p className="text-sm text-gray-600">CRAFTING COMPANY</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{isQuotation ? 'QUOTATION' : 'INVOICE'}</h2>
                <p className="text-gray-600 text-sm"># {invoiceNumber}</p>
              </div>
            </div>

            {/* Date and Balance Due */}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <div></div>
              <div className="text-right space-y-1">
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{format(new Date(invoiceDate), 'MMM d, yyyy')}</span>
                </div>
                {!isQuotation && (
                  <div className="flex justify-between gap-8">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="font-bold">{formatPrice(editableAmountPaid)}</span>
                  </div>
                )}
                {isQuotation && (() => {
                  const subtotal = order.tables?.reduce((sum, table) => sum + (table.price * table.quantity), 0) || 0;
                  const totalAmount = subtotal + (order.deliveryFee || 0) + (order.additionalCharges || 0);
                  
                  return (
                    <div className="flex justify-between gap-8">
                      <span className="text-gray-600">Valid Until:</span>
                      <span className="font-medium">{format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bill To and Ship To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Bill To:</h3>
                <div className="text-gray-800">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{order.address}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Ship To:</h3>
                <div className="text-gray-800">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.contactNumber}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{order.address}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left py-3 px-4 font-medium">Item</th>
                    <th className="text-center py-3 px-4 font-medium">Quantity</th>
                    <th className="text-right py-3 px-4 font-medium">Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.tables?.map((table, index) => <tr key={table.id || index} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{getTableSizeLabel(table.size)} table</p>
                          <p className="text-sm text-gray-600">
                            Top: {getColourLabel(table.topColour)}, Frame: {getColourLabel(table.frameColour)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{table.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatPrice(table.price)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatPrice(table.price * table.quantity)}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full md:w-80">
                <div className="space-y-2">
                  {(() => {
                    const subtotal = order.tables?.reduce((sum, table) => sum + (table.price * table.quantity), 0) || 0;
                    const deliveryFee = order.deliveryFee || 0;
                    const additionalCharges = order.additionalCharges || 0;
                    
                    return (
                      <>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatPrice(subtotal)}</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Shipping:</span>
                            <span className="font-medium">{formatPrice(deliveryFee)}</span>
                          </div>
                        )}
                        {additionalCharges !== 0 && (
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">{additionalCharges > 0 ? 'Additional:' : 'Discount:'}</span>
                            <span className="font-medium">{formatPrice(Math.abs(additionalCharges))}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-300 pt-2">
                          <div className="flex justify-between py-2">
                            <span className="font-semibold text-lg">Total:</span>
                            <span className="font-bold text-lg">{formatPrice(subtotal + deliveryFee + additionalCharges)}</span>
                          </div>
                        </div>
                        {!isQuotation && (
                          <div className="flex justify-between py-2 bg-gray-50 px-3 rounded">
                            <span className="font-semibold">Amount Paid:</span>
                            <span className="font-bold">{formatPrice(editableAmountPaid)}</span>
                          </div>
                        )}
                        {isQuotation && (
                          <div className="flex justify-between py-2 bg-blue-50 px-3 rounded">
                            <span className="font-semibold">Quoted Amount:</span>
                            <span className="font-bold">{formatPrice(subtotal + deliveryFee + additionalCharges)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.note && <div className="mt-8 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
                <p className="text-gray-600 text-sm">{order.note}</p>
              </div>}

            {/* Terms and Conditions */}
            {termsAndConditions && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Terms and Conditions:</h4>
                <div className="text-gray-600 text-xs leading-relaxed whitespace-pre-line">
                  {termsAndConditions}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Invoice;
