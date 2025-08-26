
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type OrderDetail = {
  id: string;
  customer_name: string;
  address: string;
  contact_number: string;
  status: string;
  price: number;
  delivery_fee: number;
  additional_charges: number;
  created_at: string;
  table_size: string;
  quantity: number;
  sales_person_name?: string;
};

type OrderDetailsTableProps = {
  orders: OrderDetail[];
  loading: boolean;
};

const OrderDetailsTable = ({ orders, loading }: OrderDetailsTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest orders from the system</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Table Size</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Person</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.contact_number}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{order.address}</TableCell>
                    <TableCell>{order.table_size}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      LKR {(order.price + (order.delivery_fee || 0) + (order.additional_charges || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{order.sales_person_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderDetailsTable;
