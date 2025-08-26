
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TableTopProduction from '@/components/production/TableTopProduction';
import BarsProduction from '@/components/production/BarsProduction';
import LegsProduction from '@/components/production/LegsProduction';
import StockOverview from '@/components/production/StockOverview';

const Production = () => {
  const [activeTab, setActiveTab] = useState('tabletop');

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Production Management</h1>
      
      <Card className="p-6 mb-6">
        <Tabs defaultValue="tabletop" className="w-full" onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="tabletop" className="flex-1">Table Tops</TabsTrigger>
            <TabsTrigger value="bars" className="flex-1">Bars</TabsTrigger>
            <TabsTrigger value="legs" className="flex-1">Legs</TabsTrigger>
            <TabsTrigger value="stock" className="flex-1">Stock Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tabletop">
            <TableTopProduction />
          </TabsContent>
          
          <TabsContent value="bars">
            <BarsProduction />
          </TabsContent>
          
          <TabsContent value="legs">
            <LegsProduction />
          </TabsContent>

          <TabsContent value="stock">
            <StockOverview />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Production;
