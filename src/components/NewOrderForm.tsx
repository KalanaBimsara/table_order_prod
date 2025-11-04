import React, { useEffect } from 'react';
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
import { Plus } from 'lucide-react';
import TableItemForm from './TableItemForm';
import { TableItem } from '@/types/order';
import { calculateTableAdditionalCosts, calculateLegSizeCost, calculateFrontPanelCost } from '@/lib/utils';

// Define schema for a single table item
const tableItemSchema = z.object({
  id: z.string(),
  size: z.string(),
  topColour: z.string(),
  frameColour: z.string(),
  colour: z.string(), // Keep for backward compatibility
  quantity: z.number().int().positive().min(1, { message: "Quantity must be at least 1" }),
  price: z.number(),
  // Customization fields
  legSize: z.enum(['1.5x1.5', '3x1.5']).optional(),
  legShape: z.enum(['O Shape', 'U shape']).optional(),
  legHeight: z.string().optional(),
  wireHoles: z.enum(['no wire holes', 'normal', 'special']).optional(),
  wireHolesComment: z.string().optional(),
  frontPanelSize: z.enum(['6', '12', '16', '24']).optional(),
  frontPanelLength: z.number().optional(),
  lShapeOrientation: z.enum(['normal', 'reverse']).optional()
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
  
  const form = useFormProvider();

  const watchTables = form.watch("tables");
  const watchDeliveryFee = form.watch("deliveryFee") || 0;
  const watchAdditionalCharges = form.watch("additionalCharges") || 0;
  
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

  // Handle form submission
  async function onSubmit(values: OrderFormValues) {
    try {
      // Prepare order data with the tables - ensure all fields are non-optional
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
          colour: table.colour, // For compatibility
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
      
      await addOrder(orderData);
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
      toast.success("Order created successfully!");
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred when creating your order');
    }
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
                  <FormLabel>Delivery Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
