import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LegsFormValues {
  color: string;
  size: string;
  quantity: number;
}

interface Leg {
  id: string;
  color: string;
  size: string;
  quantity: number;
  created_at: string;
}

const COLOR_OPTIONS = ['White', 'Black'];
const SIZE_OPTIONS = ['24"'];

const LegsProduction = () => {
  const [legs, setLegs] = useState<Leg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LegsFormValues>({
    defaultValues: {
      color: '',
      size: '',
      quantity: 1,
    },
  });

  useEffect(() => {
    fetchLegs();
  }, []);

  const fetchLegs = async () => {
    try {
      const { data, error } = await supabase
        .from('production_legs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setLegs(data);
      }
    } catch (error) {
      console.error('Error fetching legs:', error);
      toast.error('Failed to load legs production data');
    }
  };

  const onSubmit = async (values: LegsFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('production_legs')
        .insert({
          color: values.color,
          size: values.size,
          quantity: values.quantity
        });
      
      if (error) {
        throw error;
      }
      
      toast.success('Leg production record added successfully');
      form.reset();
      fetchLegs();
    } catch (error) {
      console.error('Error adding leg production record:', error);
      toast.error('Failed to add leg production record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Record Leg Production</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leg Color</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLOR_OPTIONS.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leg Size</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Record'}
            </Button>
          </form>
        </Form>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-4">Production Records</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legs.length > 0 ? (
              legs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No production records found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LegsProduction;
