
import React, { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { tableSizeOptions, colourOptions } from '@/types/order';

interface TableItemFormProps {
  index: number;
  onRemove: () => void;
  showRemoveButton: boolean;
}

const frameColourOptions = [{
  value: 'white',
  label: 'White'
}, {
  value: 'black',
  label: 'Black'
}];

const TableItemForm: React.FC<TableItemFormProps> = ({
  index,
  onRemove,
  showRemoveButton
}) => {
  const form = useFormContext();
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customSize, setCustomSize] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  
  const watchWireHoles = form.watch(`tables.${index}.wireHoles`);
  const watchSize = form.watch(`tables.${index}.size`);

  // Calculate the price based on the selected size
  const handleSizeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomSize(true);
      form.setValue(`tables.${index}.size`, '');
      form.setValue(`tables.${index}.price`, 0);
    } else {
      setShowCustomSize(false);
      const selectedSize = tableSizeOptions.find(option => option.value === value);
      if (selectedSize) {
        form.setValue(`tables.${index}.price`, selectedSize.price);
      }
    }
  };

  const handleCustomSizeSubmit = () => {
    if (!customSize || !customPrice) {
      form.setError(`tables.${index}.size`, {
        type: 'manual',
        message: 'Please enter both custom size and price'
      });
      return;
    }
    
    if (!/^\d+\s*x\s*\d+$/.test(customSize.trim())) {
      form.setError(`tables.${index}.size`, {
        type: 'manual',
        message: 'Invalid size format. Use format like "48x24"'
      });
      return;
    }
    
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      form.setError(`tables.${index}.price`, {
        type: 'manual',
        message: 'Please enter a valid price greater than 0'
      });
      return;
    }
    
    form.setValue(`tables.${index}.size`, customSize.trim());
    form.setValue(`tables.${index}.price`, price);
    form.clearErrors(`tables.${index}.size`);
    form.clearErrors(`tables.${index}.price`);
    setShowCustomSize(false);
  };

  return (
    <div className="border p-4 rounded-md space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField 
          control={form.control} 
          name={`tables.${index}.size`} 
          render={({ field }) => (
          <FormItem>
              <FormLabel>Size *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleSizeChange(value);
                }} 
                defaultValue={field.value} 
                value={showCustomSize ? 'custom' : field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tableSizeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} - {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'LKR',
                        maximumFractionDigits: 0
                      }).format(option.price)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Size</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} 
        />

        {showCustomSize && (
          <>
            <div className="col-span-2 space-y-2">
              <FormLabel>Custom Size *</FormLabel>
              <Input
                placeholder="e.g., 48x24"
                value={customSize}
                required
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers, 'x', and spaces — e.g., 48 x 24
                  const validPattern = /^[0-9\s]*x?[0-9\s]*$/i;

                  if (validPattern.test(value)) {
                    setCustomSize(value);
                  }
                }}
                onBlur={() => {
                  // Auto-trim and normalize spaces around 'x'
                  if (customSize) {
                    const cleaned = customSize.replace(/\s*/g, '').replace(/x/i, 'x');
                    setCustomSize(cleaned);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Enter size in format: width x length (e.g., 48x24)</p>
            </div>
            <div className="col-span-2 space-y-2">
              <FormLabel>Custom Price (LKR) *</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter price"
                  value={customPrice}
                  required
                  min="1"
                  onChange={(e) => setCustomPrice(e.target.value)}
                />
                <Button 
                  type="button" 
                  onClick={handleCustomSizeSubmit}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Set Custom Size
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Click "Set Custom Size" after entering both values</p>
            </div>
          </>
        )}

        <FormField 
          control={form.control} 
          name={`tables.${index}.quantity`} 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value) || 1)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} 
        />

        <FormField 
          control={form.control} 
          name={`tables.${index}.topColour`} 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top Colour *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select colour" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {colourOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name={`tables.${index}.frameColour`} 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leg Colour *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select colour" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frameColourOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} 
        />

        {/* L-Shape Orientation - Only show for L-shaped tables */}
        {watchSize && watchSize.toLowerCase().includes('l') && (
          <FormField
            control={form.control}
            name={`tables.${index}.lShapeOrientation`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>L-Shape Orientation *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select orientation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="reverse">Reverse</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Customize Order Section */}
      <Collapsible open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 p-2 h-auto text-left w-full justify-start"
          >
            {isCustomizeOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Customize Order
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4 border-t">
          {/* Leg Size */}
          <FormField
            control={form.control}
            name={`tables.${index}.legSize`}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Leg Size *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1.5x1.5" id={`leg-size-1-${index}`} />
                      <label htmlFor={`leg-size-1-${index}`} className="text-sm font-normal cursor-pointer">
                        1.5" x 1.5"
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3x1.5" id={`leg-size-2-${index}`} />
                      <label htmlFor={`leg-size-2-${index}`} className="text-sm font-normal cursor-pointer">
                        3" x 1.5"
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Leg Shape */}
          <FormField
            control={form.control}
            name={`tables.${index}.legShape`}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Leg Shape *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="O Shape" id={`leg-shape-o-${index}`} />
                      <label htmlFor={`leg-shape-o-${index}`} className="text-sm font-normal cursor-pointer">
                        O Shape legs
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="U shape" id={`leg-shape-u-${index}`} />
                      <label htmlFor={`leg-shape-u-${index}`} className="text-sm font-normal cursor-pointer">
                        U shape legs
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Leg Height */}
          <FormField
            control={form.control}
            name={`tables.${index}.legHeight`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leg Height *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter leg height (e.g., 30 inches)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Wire Holes */}
          <FormField
            control={form.control}
            name={`tables.${index}.wireHoles`}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Wire Holes *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no wire holes" id={`wire-holes-none-${index}`} />
                      <label htmlFor={`wire-holes-none-${index}`} className="text-sm font-normal cursor-pointer">
                        No wire holes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id={`wire-holes-normal-${index}`} />
                      <label htmlFor={`wire-holes-normal-${index}`} className="text-sm font-normal cursor-pointer">
                        Normal wire holes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="special" id={`wire-holes-special-${index}`} />
                      <label htmlFor={`wire-holes-special-${index}`} className="text-sm font-normal cursor-pointer">
                        Special
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Special Wire Holes Comment */}
          {watchWireHoles === 'special' && (
            <FormField
              control={form.control}
              name={`tables.${index}.wireHolesComment`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Wire Holes Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the special wire hole requirements..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Front Panel Section */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <FormField
              control={form.control}
              name={`tables.${index}.frontPanelSize`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Front Panel Size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">6" per 1ft - LKR 250</SelectItem>
                      <SelectItem value="12">12" per 1ft - LKR 500</SelectItem>
                      <SelectItem value="16">16" per 1ft - LKR 750</SelectItem>
                      <SelectItem value="24">24" per 1ft - LKR 1000</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`tables.${index}.frontPanelLength`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Front Panel Length (ft)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter length"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {showRemoveButton && (
        <div className="flex justify-end mt-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={onRemove} 
            className="flex items-center text-destructive hover:text-destructive"
          >
            <Trash2 size={16} className="mr-1" />
            Remove Table
          </Button>
        </div>
      )}
    </div>
  );
};

export default TableItemForm;
