
import React from 'react';
import { NewOrderForm } from '@/components/NewOrderForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PublicOrderForm: React.FC = () => {
  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag size={20} />
            Place Your Order
          </CardTitle>
          <CardDescription>Order custom furniture tables directly</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertDescription>
              You can place an order directly without creating an account. We'll contact you using the information you provide.
            </AlertDescription>
          </Alert>
          <NewOrderForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicOrderForm;
