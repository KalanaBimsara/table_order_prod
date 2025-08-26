
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { userRole } = useAuth();

  return (
    <div className="container py-6 space-y-6">
      {/* Admin Dashboard View */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog size={20} />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>Manage orders and view all system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <NewOrderForm />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <OrderList />
          </div>
        </div>
      )}

      {/* Customer Dashboard View */}
      {userRole === 'customer' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag size={20} />
                Customer Dashboard
              </CardTitle>
              <CardDescription>Place orders for custom furniture tables</CardDescription>
            </CardHeader>
            <CardContent>
              <NewOrderForm />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manager Dashboard View */}
      {userRole === 'manager' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog size={20} />
                Manager Dashboard
              </CardTitle>
              <CardDescription>Access dedicated management dashboard for order processing</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <p className="text-center text-muted-foreground">
                Use the dedicated Management Dashboard to view pending orders and mark them as ready for delivery.
              </p>
              <a 
                href="/management" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Go to Management Dashboard
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Dashboard View */}
      {userRole === 'delivery' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck size={20} />
                Delivery Dashboard
              </CardTitle>
              <CardDescription>View and manage assigned deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderList />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
