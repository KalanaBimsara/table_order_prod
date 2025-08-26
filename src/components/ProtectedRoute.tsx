
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types/order';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  public?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, public: isPublic }) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Skip authentication check for public routes
  if (isPublic) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If allowedRoles is provided, check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = userRole && allowedRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      return (
        <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page.
          </p>
          <Navigate to="/" replace />
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
