import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Shield, Users, Package, TrendingUp, DollarSign, LogOut, RefreshCw, Calendar, CalendarDays, Clock, UserCog, UserPlus } from 'lucide-react';
import { useSuperAdminAuth } from '@/contexts/SuperAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import OrderDetailsTable from '@/components/OrderDetailsTable';
import UserManagement from '@/components/UserManagement';
import SystemUserManagement from '@/components/SystemUserManagement';
import { getFactoryPrice, calculateOrderProfit } from '@/types/order';
import { useIsMobile } from '@/hooks/use-mobile';

type DailyAnalyticsData = {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_profit: number;
  date: string;
};

type MonthlyAnalyticsData = {
  total_orders: number;
  total_revenue: number;
  total_profit: number;
  avg_order_value: number;
  month: string;
};

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

type OrderStats = {
  today: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    total_revenue: number;
    total_profit: number;
  };
  week: DailyAnalyticsData[];
  month: MonthlyAnalyticsData[];
  overview: {
    total_users: number;
    total_orders: number;
    total_revenue: number;
    total_profit: number;
    avg_order_value: number;
  };
  recentOrders: OrderDetail[];
};

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const SuperAdminDashboard = () => {
  const { user, signOut } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const calculateProfit = (order: any) => {
    const salesPrice = order.price || 0;
    const tableSize = order.table_size;
    const quantity = order.quantity || 1;
    return calculateOrderProfit(salesPrice, tableSize, quantity);
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading analytics data...');
      
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Fetching today\'s orders for date:', today);
      
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today + 'T00:00:00')
        .lt('created_at', today + 'T23:59:59');

      if (todayError) {
        console.error('Error fetching today\'s orders:', todayError);
      } else {
        console.log('Today\'s orders:', todayOrders);
      }

      const todayProfit = todayOrders?.reduce((sum, order) => sum + calculateProfit(order), 0) || 0;

      const todayStats = {
        total_orders: todayOrders?.length || 0,
        completed_orders: todayOrders?.filter(o => o.status === 'completed').length || 0,
        pending_orders: todayOrders?.filter(o => o.status === 'pending').length || 0,
        total_revenue: todayOrders?.reduce((sum, order) => 
          sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0,
        total_profit: todayProfit
      };

      // Get recent orders (last 20)
      const { data: recentOrders, error: recentError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) {
        console.error('Error fetching recent orders:', recentError);
      } else {
        console.log('Recent orders:', recentOrders);
      }

      // Get week's data (last 7 days)
      const weekData: DailyAnalyticsData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: dayOrders, error: dayError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', dateStr + 'T00:00:00')
          .lt('created_at', dateStr + 'T23:59:59');
        
        if (dayError) {
          console.error(`Error fetching orders for ${dateStr}:`, dayError);
        }
        
        const dayProfit = dayOrders?.reduce((sum, order) => sum + calculateProfit(order), 0) || 0;
        
        weekData.push({
          date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total_orders: dayOrders?.length || 0,
          completed_orders: dayOrders?.filter(o => o.status === 'completed').length || 0,
          pending_orders: dayOrders?.filter(o => o.status === 'pending').length || 0,
          total_revenue: dayOrders?.reduce((sum, order) => 
            sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0,
          total_profit: dayProfit
        });
      }

      console.log('Week data:', weekData);

      // Get monthly data (last 6 months)
      const monthData: MonthlyAnalyticsData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;
        
        const startDate = `${year}-${month}-01T00:00:00`;
        const nextMonth = new Date(year, date.getMonth() + 1, 1);
        const endDate = nextMonth.toISOString();
        
        console.log(`Fetching orders for month ${monthStr} between ${startDate} and ${endDate}`);
        
        const { data: monthOrders, error: monthError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', startDate)
          .lt('created_at', endDate);
        
        if (monthError) {
          console.error(`Error fetching month ${monthStr} orders:`, monthError);
        } else {
          console.log(`Month ${monthStr} orders:`, monthOrders);
        }
        
        const totalRevenue = monthOrders?.reduce((sum, order) => 
          sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0;
        
        const totalProfit = monthOrders?.reduce((sum, order) => sum + calculateProfit(order), 0) || 0;
        
        monthData.push({
          month: new Date(year, date.getMonth()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total_orders: monthOrders?.length || 0,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          avg_order_value: monthOrders?.length ? totalRevenue / monthOrders.length : 0
        });
      }

      console.log('Month data:', monthData);

      // Get overall stats
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('*');

      if (allOrdersError) {
        console.error('Error fetching all orders:', allOrdersError);
      } else {
        console.log('All orders count:', allOrders?.length);
      }

      const { data: allUsers, error: allUsersError } = await supabase
        .from('profiles')
        .select('id');

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
      } else {
        console.log('All users count:', allUsers?.length);
      }

      const totalRevenue = allOrders?.reduce((sum, order) => 
        sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0;
      
      const totalProfit = allOrders?.reduce((sum, order) => sum + calculateProfit(order), 0) || 0;

      const finalStats = {
        today: todayStats,
        week: weekData,
        month: monthData,
        overview: {
          total_users: allUsers?.length || 0,
          total_orders: allOrders?.length || 0,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          avg_order_value: allOrders?.length ? totalRevenue / allOrders.length : 0
        },
        recentOrders: recentOrders || []
      };

      console.log('Final stats:', finalStats);
      setStats(finalStats);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const pieData = stats && stats.today.total_orders > 0 ? [
    { name: 'Completed', value: stats.today.completed_orders, color: COLORS[0] },
    { name: 'Pending', value: stats.today.pending_orders, color: COLORS[1] },
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
            </div>
            <div className="flex items-center space-x-2">
              {!isMobile && (
                 <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                    Welcome, {user.username}
                 </span>
              )}
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "sm"} 
                onClick={() => navigate('/super-admin/create-user')}
                aria-label={isMobile ? "Create User" : undefined}
              >
                <UserPlus className={isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"} />
                {!isMobile && "Create User"}
              </Button>
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "sm"} 
                onClick={loadAnalytics}
                aria-label={isMobile ? "Refresh Data" : undefined}
              >
                <RefreshCw className={isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"} />
                {!isMobile && "Refresh"}
              </Button>
              <Button 
                variant="destructive" 
                size={isMobile ? "icon" : "sm"} 
                onClick={signOut}
                aria-label={isMobile ? "Sign Out" : undefined}
              >
                <LogOut className={isMobile ? "h-5 w-5" : "h-4 w-4 mr-2"} />
                {!isMobile && "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tabs */}
        <Tabs defaultValue="analytics" className="mb-8">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-8 mt-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.overview.total_users || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.overview.total_orders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">LKR {stats?.overview.total_revenue.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">LKR {stats?.overview.total_profit.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">LKR {Math.round(stats?.overview.avg_order_value || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Today's Orders</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats?.today.total_orders || 0}</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Today's Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">LKR {stats?.today.total_revenue.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Today's Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">LKR {stats?.today.total_profit.toLocaleString() || 0}</div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Completed Today</CardTitle>
                  <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats?.today.completed_orders || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Analytics */}
            <Tabs defaultValue="daily">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="daily" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Daily View
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Weekly View
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Monthly View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Today's Order Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Order Status</CardTitle>
                      <CardDescription>Distribution of order statuses today</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pieData.length > 0 ? (
                        <ChartContainer
                          config={{
                            completed: { label: "Completed", color: "#10b981" },
                            pending: { label: "Pending", color: "#f59e0b" },
                          }}
                          className="h-[200px] min-[380px]:h-[250px] sm:h-[300px]"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={isMobile ? 60: 80}
                                fill="#8884d8"
                                dataKey="value"
                                label
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="h-[200px] min-[380px]:h-[250px] sm:h-[300px] flex items-center justify-center text-gray-500">
                          No orders today
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Daily Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Performance</CardTitle>
                      <CardDescription>Key metrics for today</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Orders</span>
                        <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{stats?.today.total_orders || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Revenue</span>
                        <span className="text-lg font-bold text-green-900 dark:text-green-100">LKR {stats?.today.total_revenue.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Profit</span>
                        <span className="text-lg font-bold text-purple-900 dark:text-purple-100">LKR {stats?.today.total_profit.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Completion Rate</span>
                        <span className="text-lg font-bold text-orange-900 dark:text-orange-100">
                          {stats?.today.total_orders ? Math.round((stats.today.completed_orders / stats.today.total_orders) * 100) : 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Weekly Orders Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Orders Trend</CardTitle>
                      <CardDescription>Orders over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          total_orders: { label: "Total Orders", color: "#3b82f6" },
                          completed_orders: { label: "Completed", color: "#10b981" },
                        }}
                        className="h-[180px] min-[380px]:h-[220px] sm:h-[280px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats?.week || []}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="total_orders" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                            <Area type="monotone" dataKey="completed_orders" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Weekly Revenue & Profit */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Revenue & Profit</CardTitle>
                      <CardDescription>Financial performance over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          total_revenue: { label: "Revenue", color: "#10b981" },
                          total_profit: { label: "Profit", color: "#f59e0b" },
                        }}
                        className="h-[180px] min-[380px]:h-[220px] sm:h-[280px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats?.week || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total_revenue" fill="var(--color-total_revenue)" />
                            <Bar dataKey="total_profit" fill="var(--color-total_profit)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Revenue Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue Trend</CardTitle>
                      <CardDescription>Revenue performance over the last 6 months (LKR)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          total_revenue: { label: "Revenue", color: "#10b981" },
                        }}
                        className="h-[180px] min-[380px]:h-[220px] sm:h-[280px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats?.month || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line type="monotone" dataKey="total_revenue" stroke="var(--color-total_revenue)" strokeWidth={3} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Monthly Profit Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Profit Trend</CardTitle>
                      <CardDescription>Profit analysis over the last 6 months (LKR)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          total_profit: { label: "Profit", color: "#f59e0b" },
                        }}
                        className="h-[180px] min-[380px]:h-[220px] sm:h-[280px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats?.month || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total_profit" fill="var(--color-total_profit)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Order Details Table */}
            <div>
              <OrderDetailsTable 
                orders={stats?.recentOrders || []} 
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UserManagement />
                
                <Card>
                  <CardHeader>
                    <CardTitle>User Instructions</CardTitle>
                    <CardDescription>
                      Important information about user management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Admin Users:</strong> Can view all orders, manage the system, and access the admin dashboard.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        <strong>Delivery Users:</strong> Can view assigned orders and update delivery status.
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Note:</strong> New users will receive an email verification link. They can log in at the main login page.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <SystemUserManagement />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
