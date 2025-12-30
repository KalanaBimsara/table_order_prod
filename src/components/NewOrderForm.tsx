import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Plus, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import TableItemForm from './TableItemForm';
import { TableItem } from '@/types/order';
import { calculateTableAdditionalCosts, calculateLegSizeCost, calculateFrontPanelCost } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Function to calculate delivery date based on pending orders queue
async function calculateDeliveryDate(): Promise<string> {
  try {
    // Fetch all pending orders with their order_tables
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending');

    if (error) throw error;

    if (!pendingOrders || pendingOrders.length === 0) {
      // No pending orders, delivery date is today + 1 day minimum
      return format(addDays(new Date(), 1), 'yyyy-MM-dd');
    }

    const orderIds = pendingOrders.map(o => o.id);

    // Fetch all order_tables for pending orders to get total units
    const { data: orderTables, error: tablesError } = await supabase
      .from('order_tables')
      .select('quantity')
      .in('order_id', orderIds);

    if (tablesError) throw tablesError;

    // Calculate total units from all pending orders
    const totalUnits = orderTables?.reduce((sum, table) => sum + (table.quantity || 0), 0) || 0;

    // Divide by 30 and round up
    const daysToAdd = Math.ceil(totalUnits / 30);

    // Add days to current date
    const deliveryDate = addDays(new Date(), Math.max(daysToAdd, 1)); // Minimum 1 day

    return format(deliveryDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error calculating delivery date:', error);
    // Default to 7 days from now if calculation fails
    return format(addDays(new Date(), 7), 'yyyy-MM-dd');
  }
}

// Define schema for a single table item
const tableItemSchema = z.object({
  id: z.string(),
  size: z.string().min(1, { message: "Table size is required" }),
  topColour: z.string().min(1, { message: "Top colour is required" }),
  frameColour: z.string().min(1, { message: "Frame colour is required" }),
  colour: z.string(), // Keep for backward compatibility
  quantity: z.number().int().positive().min(1, { message: "Quantity must be at least 1" }),
  price: z.number().positive({ message: "Price is required and must be greater than 0" }),
  // Customization fields - all required
  legSize: z.enum(['1.5x1.5','2x2', '3x1.5'], { required_error: "Leg size is required" }),
  legShape: z.enum(['O Shape', 'U shape'], { required_error: "Leg shape is required" }),
  legHeight: z.string().min(1, { message: "Leg height is required" }),
  wireHoles: z.enum(['no wire holes', 'normal', 'special'], { required_error: "Wire holes selection is required" }),
  wireHolesComment: z.string().optional(),
  frontPanelSize: z.enum(['6', '12', '16', '24']).optional(),
  frontPanelLength: z.number().optional(),
  lShapeOrientation: z.enum(['normal', 'reverse']).optional()
}).refine((data) => {
  // If size contains 'L' (L-shaped table), orientation is required
  // But exclude "L-" prefix check to avoid false matches with custom sizes
  if (data.size && data.size.toUpperCase().startsWith('L-') && !data.lShapeOrientation) {
    return false;
  }
  return true;
}, {
  message: "L-shape orientation is required for L-shaped tables",
  path: ["lShapeOrientation"]
});

// Define the overall form schema
const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters" }),
  customerDistrict: z.string().min(1, { message: "Please select a district" }),
  address: z.string().min(5, { message: "Please enter a valid address" }),
  contactNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  deliveryDate: z.string().min(1, { message: "Please select a delivery date" }),
  deliveryType: z.enum(['courier', 'non-courier'], { required_error: "Please select delivery type" }),
  tables: z.array(tableItemSchema).min(1, { message: "At least one table is required" }),
  note: z.string().optional(),
  deliveryFee: z.number().nonnegative().min(0, { message: "Delivery fee is required" }),
  additionalCharges: z.number().optional().default(0),
});

type OrderFormValues = z.infer<typeof formSchema>;

export function NewOrderForm() {
  const { addOrder } = useApp();
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [isCalculatingDate, setIsCalculatingDate] = useState(true);
  
  const form = useFormProvider();

  const watchTables = form.watch("tables");
  const watchDeliveryFee = form.watch("deliveryFee") || 0;
  const watchAdditionalCharges = form.watch("additionalCharges") || 0;

  // Auto-calculate delivery date on component mount
  useEffect(() => {
    const fetchDeliveryDate = async () => {
      setIsCalculatingDate(true);
      const date = await calculateDeliveryDate();
      form.setValue('deliveryDate', date);
      setIsCalculatingDate(false);
    };
    fetchDeliveryDate();
  }, []);
  
  // Calculate base tables cost
  const tablesCost = React.useMemo(() => {
    return watchTables?.reduce((sum, table) => sum + (table.price * table.quantity), 0) || 0;
  }, [watchTables]);

  // Calculate additional costs (leg size + front panels)
  const additionalTableCosts = React.useMemo(() => {
    return watchTables?.reduce((sum, table) => {
      const legCost = calculateLegSizeCost(table.legSize) * table.quantity;
      const panelCost = calculateFrontPanelCost(table.frontPanelSize, table.frontPanelLength) * table.quantity;
      return sum + legCost + panelCost;
    }, 0) || 0;
  }, [watchTables]);

  const totalPrice = React.useMemo(() => {
    return tablesCost + additionalTableCosts + watchDeliveryFee + watchAdditionalCharges;
  }, [tablesCost, additionalTableCosts, watchDeliveryFee, watchAdditionalCharges]);

  // Check for existing orders with same contact number
  async function checkDuplicateOrder(contactNumber: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq('contact_number', contactNumber)
        .in('status', ['pending', 'assigned']);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking for duplicate orders:', error);
      return false;
    }
  }

  // Handle form submission
  async function onSubmit(values: OrderFormValues) {
    try {
      // Prepare order data
      const orderData = {
        customerName: values.customerName,
        customerDistrict: values.customerDistrict,
        address: values.address,
        contactNumber: values.contactNumber,
        deliveryDate: values.deliveryDate,
        deliveryType: values.deliveryType,
        tables: values.tables.map((table): TableItem => ({
          id: table.id,
          size: table.size,
          topColour: table.topColour,
          frameColour: table.frameColour,
          colour: table.colour,
          quantity: table.quantity,
          price: table.price,
          legSize: table.legSize,
          legShape: table.legShape,
          legHeight: table.legHeight,
          wireHoles: table.wireHoles,
          wireHolesComment: table.wireHolesComment,
          frontPanelSize: table.frontPanelSize,
          frontPanelLength: table.frontPanelLength,
          lShapeOrientation: table.lShapeOrientation
        })),
        note: values.note || "",
        totalPrice,
        deliveryFee: values.deliveryFee || 0,
        additionalCharges: values.additionalCharges || 0
      };

      // Check for duplicate orders
      const hasDuplicate = await checkDuplicateOrder(values.contactNumber);
      
      if (hasDuplicate) {
        setPendingOrderData(orderData);
        setShowDuplicateDialog(true);
        return;
      }

      // No duplicate, proceed with submission
      await submitOrder(orderData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred when creating your order');
    }
  }

  // Submit order function
  async function submitOrder(orderData: any) {
    try {
      const orderFormNumber = await addOrder(orderData);
      form.reset({
        customerName: "",
        customerDistrict: "",
        address: "",
        contactNumber: "",
        deliveryDate: "",
        deliveryType: undefined,
        tables: [createEmptyTable()],
        note: "",
        deliveryFee: 0,
        additionalCharges: 0,
      });
      
      // Show tracking link dialog
      if (orderFormNumber) {
        setTrackingOrderNumber(orderFormNumber);
        setShowTrackingDialog(true);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Failed to create order');
    }
  }

  const getTrackingUrl = () => {
    return `${window.location.origin}/track?order=${trackingOrderNumber}`;
  };

  const copyTrackingLink = () => {
    navigator.clipboard.writeText(getTrackingUrl());
    setCopied(true);
    toast.success('Tracking link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle duplicate order confirmation
  function handleDuplicateConfirm() {
    if (pendingOrderData) {
      submitOrder(pendingOrderData);
      setPendingOrderData(null);
    }
    setShowDuplicateDialog(false);
  }

  // Handle duplicate order cancellation
  function handleDuplicateCancel() {
    form.reset({
      customerName: "",
      customerDistrict: "",
      address: "",
      contactNumber: "",
      deliveryDate: "",
      deliveryType: undefined,
      tables: [createEmptyTable()],
      note: "",
      deliveryFee: 0,
      additionalCharges: 0,
    });
    setPendingOrderData(null);
    setShowDuplicateDialog(false);
    toast.info("Order form cleared");
  }

// Create a new empty table with default values
const createEmptyTable = (): TableItem => ({
  id: uuidv4(),
  size: '24x32',
  topColour: 'teak',
  frameColour: 'black',
  colour: 'teak', // For compatibility, align with topColour
  quantity: 1,
  price: 11000,  // Updated default price for 24x32 table
  legSize: '1.5x1.5',
  legShape: 'O Shape',
  legHeight: '30',
  wireHoles: 'normal',
  wireHolesComment: '',
  frontPanelSize: undefined,
  frontPanelLength: undefined
});

  // Add a new table to the form
  const addTable = () => {
    const currentTables = form.getValues("tables") || [];
    form.setValue("tables", [...currentTables, createEmptyTable()]);
  };

  // Remove a table from the form
  const removeTable = (index: number) => {
    const currentTables = form.getValues("tables");
    if (currentTables.length > 1) {
      form.setValue("tables", currentTables.filter((_, i) => i !== index));
    }
  };

  // Format price in Sri Lankan Rupees
  const getFormattedPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Table Order</CardTitle>
        <CardDescription>Create a new delivery order for a customer</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jhon Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customerDistrict"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Trincomalee', 'Batticaloa', 'Ampara', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle'].map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Furniture St, Woodtown" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number *</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(07x) xxx-xxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Date (Auto-calculated)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="date" 
                        {...field} 
                        disabled={true}
                        className="bg-muted cursor-not-allowed"
                      />
                      {isCalculatingDate && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically calculated based on production queue (30 units/day capacity)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Tables</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addTable}
                  className="flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Table
                </Button>
              </div>
              
              {watchTables?.map((table, index) => (
                <TableItemForm
                  key={table.id}
                  index={index}
                  onRemove={() => removeTable(index)}
                  showRemoveButton={watchTables.length > 1}
                />
              ))}
              
              <div className="mt-6 space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="deliveryType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Delivery Type *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="courier" id="delivery-courier" />
                            <label htmlFor="delivery-courier" className="text-sm font-normal cursor-pointer">
                              Courier Delivery
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="non-courier" id="delivery-non-courier" />
                            <label htmlFor="delivery-non-courier" className="text-sm font-normal cursor-pointer">
                              Non-Courier Delivery
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Fee *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="additionalCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Charges</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="text-sm text-muted-foreground text-right">Tables Base Cost:</div>
                  <div>{getFormattedPrice(tablesCost)}</div>
                  
                  <div className="text-sm text-muted-foreground text-right">Customizations (Legs & Panels):</div>
                  <div>{getFormattedPrice(additionalTableCosts)}</div>
                  
                  <div className="text-sm text-muted-foreground text-right">Delivery Fee:</div>
                  <div>{getFormattedPrice(watchDeliveryFee)}</div>
                  
                  <div className="text-sm text-muted-foreground text-right">Additional Charges:</div>
                  <div>{getFormattedPrice(watchAdditionalCharges)}</div>
                  
                  <div className="text-base font-medium text-right border-t pt-2">Total:</div>
                  <div className="text-base font-semibold border-t pt-2">
                    {getFormattedPrice(totalPrice)}
                  </div>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special requirements or notes about the order" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              Add New Order
            </Button>
          </form>
        </FormProvider>
      </CardContent>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Order Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              An order with this contact number already exists with pending or assigned status. 
              Do you want to submit another order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDuplicateCancel}>
              No, Clear Form
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm}>
              Yes, Submit new order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tracking Link Dialog */}
      <AlertDialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Order Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your order #{trackingOrderNumber} has been created. Share the tracking link with your customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                readOnly
                value={getTrackingUrl()}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyTrackingLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => window.open(getTrackingUrl(), '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Tracking
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => setShowTrackingDialog(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Custom hook for form setup to separate logic
function useFormProvider() {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerDistrict: "",
      address: "",
      contactNumber: "",
      deliveryDate: "",
      deliveryType: undefined,
      tables: [
        {
          id: uuidv4(),
          size: '24x32',
          topColour: 'teak',
          frameColour: 'black',
          colour: 'teak', // For compatibility
          quantity: 1,
          price: 11000,  // Updated default price
          legSize: '1.5x1.5',
          legShape: 'O Shape',
          legHeight: '30',
          wireHoles: 'normal',
          wireHolesComment: '',
          frontPanelSize: undefined,
          frontPanelLength: undefined
        }
      ],
      note: "",
      deliveryFee: 0,
      additionalCharges: 0,
    },
  });

  return form;
}

export default NewOrderForm;
