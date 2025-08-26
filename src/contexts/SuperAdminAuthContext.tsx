
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type SuperAdminUser = {
  id: string;
  username: string;
  email: string;
  last_login: string | null;
  is_active: boolean;
};

type SuperAdminSession = {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
};

type SuperAdminAuthContextType = {
  user: SuperAdminUser | null;
  session: SuperAdminSession | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [session, setSession] = useState<SuperAdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionToken = localStorage.getItem('super_admin_session');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase as any).rpc('super_admin_get_session', {
        p_session_token: sessionToken,
      });

      const rowData: any = (data as any) ?? null;
      const row = Array.isArray(rowData) ? rowData[0] : rowData;

      if (error || !row) {
        localStorage.removeItem('super_admin_session');
        setLoading(false);
        return;
      }

      setSession({
        id: row.session_id,
        user_id: row.user_id,
        session_token: row.session_token,
        expires_at: row.expires_at,
      });
      setUser({
        id: row.user_id,
        username: row.username,
        email: row.email,
        last_login: row.last_login,
        is_active: row.is_active,
      });
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('super_admin_session');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('super_admin_sign_in', {
        p_username: username,
        p_password: password,
      });

      const rowData: any = (data as any) ?? null;
      const row = Array.isArray(rowData) ? rowData[0] : rowData;

      if (error || !row) {
        throw new Error('Invalid username or password');
      }

      localStorage.setItem('super_admin_session', row.session_token);
      setSession({
        id: row.session_id,
        user_id: row.user_id,
        session_token: row.session_token,
        expires_at: row.expires_at,
      });
      setUser({
        id: row.user_id,
        username: row.username,
        email: row.email,
        last_login: row.last_login,
        is_active: row.is_active,
      });
      
      toast.success('Successfully signed in');
      navigate('/super-admin/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (session) {
        await (supabase as any).rpc('super_admin_sign_out', {
          p_session_token: session.session_token,
        });
      }
      
      localStorage.removeItem('super_admin_session');
      setUser(null);
      setSession(null);
      toast.success('Successfully signed out');
      navigate('/super-admin/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signOut
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
};
