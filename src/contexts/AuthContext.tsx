
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserRole } from '@/types/order';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isSigningUp = useRef(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role from metadata
          const role = session.user.user_metadata.role as UserRole;
          setUserRole(role);
        } else {
          setUserRole(null);
        }
        
        if (event === 'SIGNED_IN') {
          // Only show toast if not coming from signup (to avoid duplicate notification)
          if (!isSigningUp.current) {
            toast.success('Successfully signed in');
          }
          // Reset the flag after a short delay
          setTimeout(() => {
            isSigningUp.current = false;
          }, 1000);
        } else if (event === 'SIGNED_OUT') {
          toast.success('Successfully signed out');
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user role from metadata
        const role = session.user.user_metadata.role as UserRole;
        setUserRole(role);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
    try {
      // Ensure the role matches the enum values exactly
      if (!['customer', 'delivery', 'admin', 'manager'].includes(role)) {
        throw new Error("Invalid role. Must be one of: customer, delivery, admin, manager");
      }

      // Set flag to suppress duplicate SIGNED_IN notification
      isSigningUp.current = true;

      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      });
      
      if (error) {
        isSigningUp.current = false; // Reset on error
        throw error;
      }
      
      // Only show registration toast - if user is auto-signed in, we won't show SIGNED_IN toast
      toast.success('Registration successful! Please check your email for verification.');
      navigate('/auth');
      
      // Reset flag after showing the registration message
      setTimeout(() => {
        isSigningUp.current = false;
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign up');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        loading,
        signUp,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
