
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from '@/contexts/SuperAdminAuthContext';
import { Loader2 } from 'lucide-react';

interface SuperAdminProtectedRouteProps {
  children?: React.ReactNode;
}

const SuperAdminProtectedRoute: React.FC<SuperAdminProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useSuperAdminAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SuperAdminProtectedRoute;
