import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Package, Layers, Construction } from 'lucide-react';

interface StockItem {
  id: string;
  size: string;
  color: string;
  quantity: number;
  created_at: string;
}

const StockOverview: React.FC = () => {
  const [tableTops, setTableTops] = useState<StockItem[]>([]);
  const [bars, setBars] = useState<StockItem[]>([]);
  const [legs, setLegs] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);

      // Fetch table tops ordered by creation date (latest first)
      const { data: topsData, error: topsError } = await supabase
        .from('production_table_tops')
        .select('*')
        .order('created_at', { ascending: false });

      if (topsError) {
        console.error('Error fetching table tops:', topsError);
      } else {
        setTableTops(topsData || []);
      }

      // Fetch bars ordered by creation date (latest first)
      const { data: barsData, error: barsError } = await supabase
        .from('production_bars')
        .select('*')
        .order('created_at', { ascending: false });

      if (barsError) {
        console.error('Error fetching bars:', barsError);
      } else {
        setBars(barsData || []);
      }

      // Fetch legs ordered by creation date (latest first)
      const { data: legsData, error: legsError } = await supabase
        .from('production_legs')
        .select('*')
        .order('created_at', { ascending: false });

      if (legsError) {
        console.error('Error fetching legs:', legsError);
      } else {
        setLegs(legsData || []);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateStock = (items: StockItem[]) => {
    const aggregated = items.reduce((acc, item) => {
      const key = `${item.size}-${item.color}`;
      if (!acc[key]) {
        acc[key] = {
          size: item.size,
          color: item.color,
          quantity: 0,
          latestDate: item.created_at
        };
      }
      acc[key].quantity += item.quantity;
      // Keep track of the latest creation date for this combination
      if (new Date(item.created_at) > new Date(acc[key].latestDate)) {
        acc[key].latestDate = item.created_at;
      }
      return acc;
    }, {} as Record<string, { size: string; color: string; quantity: number; latestDate: string }>);

    // Convert to array and sort by latest date (most recent first)
    return Object.values(aggregated).sort((a, b) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  };

  const getStockLevelBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity <= 5) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const aggregatedTops = aggregateStock(tableTops);
  const aggregatedBars = aggregateStock(bars);
  const aggregatedLegs = aggregateStock(legs);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table Tops */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Table Tops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregatedTops.length > 0 ? (
                aggregatedTops.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <div className="text-sm">
                      <div className="font-medium">{item.size}</div>
                      <div className="text-muted-foreground">{item.color}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.quantity}</div>
                      {getStockLevelBadge(item.quantity)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No table tops in stock</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bars */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Bars</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregatedBars.length > 0 ? (
                aggregatedBars.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <div className="text-sm">
                      <div className="font-medium">{item.size}</div>
                      <div className="text-muted-foreground">{item.color}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.quantity}</div>
                      {getStockLevelBadge(item.quantity)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No bars in stock</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legs */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Construction className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Legs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregatedLegs.length > 0 ? (
                aggregatedLegs.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <div className="text-sm">
                      <div className="font-medium">{item.size}</div>
                      <div className="text-muted-foreground">{item.color}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.quantity}</div>
                      {getStockLevelBadge(item.quantity)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No legs in stock</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Stock Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Table Tops Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Table Tops
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedTops.length > 0 ? (
                    aggregatedTops.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.size}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{getStockLevelBadge(item.quantity)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No table tops in stock
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bars Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Bars
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedBars.length > 0 ? (
                    aggregatedBars.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.size}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{getStockLevelBadge(item.quantity)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No bars in stock
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Legs Table */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Construction className="h-5 w-5 text-orange-600" />
                Legs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedLegs.length > 0 ? (
                    aggregatedLegs.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.size}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{getStockLevelBadge(item.quantity)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No legs in stock
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOverview;
