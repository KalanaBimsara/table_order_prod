
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, ThemeProviderContextProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SuperAdminAuthProvider } from "@/contexts/SuperAdminAuthContext";
import AppHeaderWrapper from "@/components/AppHeaderWrapper";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";
import Invoice from "./pages/Invoice";
import Production from "./pages/Production";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminProtectedRoute from "@/components/SuperAdminProtectedRoute";
import PublicOrderForm from "./pages/PublicOrderForm";
import ManagementDashboard from "./pages/ManagementDashboard";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <ThemeProviderContextProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                {/* Super Admin Routes - Completely Separate System */}
                <Route path="/super-admin/*" element={
                  <SuperAdminAuthProvider>
                    <Routes>
                      <Route path="login" element={<SuperAdminLogin />} />
                      <Route path="dashboard" element={
                        <SuperAdminProtectedRoute>
                          <SuperAdminDashboard />
                        </SuperAdminProtectedRoute>
                      } />
                    </Routes>
                  </SuperAdminAuthProvider>
                } />
                
                {/* Main Application Routes */}
                <Route path="/*" element={
                  <AuthProvider>
                    <AppProvider>
                      <Toaster />
                      <Sonner />
                      <div className="min-h-screen flex flex-col">
                        <AppHeaderWrapper />
                        <main className="flex-1">
                          <Routes>
                            <Route path="/auth" element={<Auth />} />
                            <Route 
                              path="/order" 
                              element={
                                <ProtectedRoute public={true}>
                                  <PublicOrderForm />
                                </ProtectedRoute>
                              } 
                            />
                            <Route element={<ProtectedRoute />}>
                              <Route path="/" element={<Index />} />
                              <Route 
                                path="/orders" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin', 'customer', 'delivery']}>
                                    <Orders />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/history" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin', 'customer', 'delivery']}>
                                    <OrderHistory />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/invoice/:orderId" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin', 'customer', 'delivery']}>
                                    <Invoice />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/production" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <Production />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/management" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                                    <ManagementDashboard />
                                  </ProtectedRoute>
                                } 
                              />
                            </Route>
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </AppProvider>
                  </AuthProvider>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProviderContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
