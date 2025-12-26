import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Clock, Copy, Check, Calendar, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

interface OrderDetails {
  id: string;
  order_form_number: string;
  customer_name: string;
  contact_number: string;
  address: string;
  status: string;
  delivery_date: string | null;
  price: number;
  quantity: number;
  created_at: string;
  tables: {
    size: string;
    colour: string;
    quantity: number;
    price: number;
  }[];
}

const OrderTracking: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  const searchOrder = async (orderNum?: string) => {
    const searchValue = orderNum || orderNumber;
    if (!searchValue.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_form_number', searchValue.trim())
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        toast.error('Order not found');
        setOrder(null);
        return;
      }

      const { data: tablesData } = await supabase
        .from('order_tables')
        .select('size, colour, quantity, price')
        .eq('order_id', orderData.id);

      setOrder({
        ...orderData,
        tables: tablesData || []
      });

      setSearchParams({ order: searchValue.trim() });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const orderParam = searchParams.get('order');
    if (orderParam) {
      setOrderNumber(orderParam);
      searchOrder(orderParam);
    }
  }, []);

  useEffect(() => {
    if (!order?.delivery_date) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const deliveryDate = new Date(order.delivery_date!);
      
      if (deliveryDate <= now) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = differenceInDays(deliveryDate, now);
      const hours = differenceInHours(deliveryDate, now) % 24;
      const minutes = differenceInMinutes(deliveryDate, now) % 60;

      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [order?.delivery_date]);

  const copyLink = () => {
    const url = `${window.location.origin}/track?order=${order?.order_form_number}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'assigned': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const totalAmount = order ? order.price : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your order number to see the status</p>
        </div>

        {/* Search Box */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter order number (e.g., 123)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
                className="text-lg"
              />
              <Button onClick={() => searchOrder()} disabled={loading}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        {order && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Order #{order.order_form_number}</CardTitle>
                  <CardDescription>
                    Placed on {format(new Date(order.created_at!), 'PPP')}
                  </CardDescription>
                </div>
                <Badge className={`${getStatusColor(order.status || 'pending')} text-white`}>
                  {order.status?.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Countdown Timer */}
              {order.delivery_date && countdown && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Estimated Delivery</span>
                  </div>
                  {countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 ? (
                    <p className="text-xl font-semibold text-green-600">Ready for Delivery!</p>
                  ) : (
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary">{countdown.days}</div>
                        <div className="text-sm text-muted-foreground">Days</div>
                      </div>
                      <div className="text-4xl font-light text-muted-foreground">:</div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary">{countdown.hours}</div>
                        <div className="text-sm text-muted-foreground">Hours</div>
                      </div>
                      <div className="text-4xl font-light text-muted-foreground">:</div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary">{countdown.minutes}</div>
                        <div className="text-sm text-muted-foreground">Minutes</div>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-3">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {format(new Date(order.delivery_date), 'PPPP')}
                  </p>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{order.contact_number}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{order.address}</span>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {order.tables.map((table, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{table.size}</p>
                        <p className="text-sm text-muted-foreground">Color: {table.colour}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">x{table.quantity}</p>
                        <p className="text-sm text-muted-foreground">Rs. {table.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">Rs. {totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">*Delivery charges not included</p>
              </div>

              {/* Copy Link Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Tracking Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
