import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Filter, Package, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type FilterCategory = 'pending' | 'assigned' | 'completed' | 'all';

type FilterResult = {
  totalUnits: number;
  orderCount: number;
  category: FilterCategory;
  startDate: string;
  endDate: string;
};

const UnitsFilterPanel = () => {
  const [category, setCategory] = useState<FilterCategory>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilter = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch orders within date range
      let query = supabase
        .from('orders')
        .select('id, status')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      // Apply status filter if not 'all'
      if (category !== 'all') {
        query = query.eq('status', category);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setResult({
          totalUnits: 0,
          orderCount: 0,
          category,
          startDate,
          endDate
        });
        return;
      }

      // Get order IDs to fetch order_tables
      const orderIds = orders.map(o => o.id);

      // Fetch all order_tables for these orders
      const { data: orderTables, error: tablesError } = await supabase
        .from('order_tables')
        .select('order_id, quantity')
        .in('order_id', orderIds);

      if (tablesError) throw tablesError;

      // Sum up all quantities
      const totalUnits = orderTables?.reduce((sum, table) => sum + (table.quantity || 0), 0) || 0;

      setResult({
        totalUnits,
        orderCount: orders.length,
        category,
        startDate,
        endDate
      });
    } catch (err) {
      console.error('Filter error:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategory('all');
    setResult(null);
    setError(null);
  };

  const getCategoryLabel = (cat: FilterCategory) => {
    switch (cat) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'completed': return 'Completed';
      case 'all': return 'All Orders';
    }
  };

  const getCategoryIcon = (cat: FilterCategory) => {
    switch (cat) {
      case 'pending': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'assigned': return <Package className="h-5 w-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'all': return <Package className="h-5 w-5 text-primary" />;
    }
  };

  const getCategoryColor = (cat: FilterCategory) => {
    switch (cat) {
      case 'pending': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700';
      case 'assigned': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700';
      case 'completed': return 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700';
      case 'all': return 'bg-primary/10 border-primary/30';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Units Filter by Status & Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as FilterCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button 
              onClick={handleFilter} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Filtering...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filter
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearFilter}>
              Clear
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`p-6 rounded-lg border ${getCategoryColor(result.category)}`}>
            <div className="flex items-center gap-3 mb-4">
              {getCategoryIcon(result.category)}
              <div>
                <h3 className="font-semibold text-lg">{getCategoryLabel(result.category)}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(result.startDate), 'MMM d, yyyy')} - {format(new Date(result.endDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold">{result.totalUnits.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
              <div className="bg-background/50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold">{result.orderCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setCategory('pending')}
            className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
              category === 'pending' ? 'ring-2 ring-amber-500' : ''
            } bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800 dark:text-amber-200">Pending</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Filter pending orders</p>
          </button>

          <button
            onClick={() => setCategory('assigned')}
            className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
              category === 'assigned' ? 'ring-2 ring-blue-500' : ''
            } bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Assigned</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Filter assigned orders</p>
          </button>

          <button
            onClick={() => setCategory('completed')}
            className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
              category === 'completed' ? 'ring-2 ring-green-500' : ''
            } bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">Completed</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">Filter completed orders</p>
          </button>

          <button
            onClick={() => setCategory('all')}
            className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
              category === 'all' ? 'ring-2 ring-primary' : ''
            } bg-primary/10 border-primary/30`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">All Orders</span>
            </div>
            <p className="text-xs text-muted-foreground">Filter all orders</p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitsFilterPanel;
