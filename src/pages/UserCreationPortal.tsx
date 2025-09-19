import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, UserPlus, ArrowLeft, User, Mail, KeyRound, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSuperAdminAuth } from '@/contexts/SuperAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type UserCreationForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'customer' | 'manager' | 'admin' | 'delivery';
};

const UserCreationPortal = () => {
  const { user } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<UserCreationForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer'
    }
  });

  // Redirect if not logged in as super admin
  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  const onSubmit = async (data: UserCreationForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (data.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsLoading(true);

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: `${data.firstName} ${data.lastName}`,
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          toast.error('A user with this email already exists');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (authData.user) {
        // Create or update the user profile with the specified role
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            name: `${data.firstName} ${data.lastName}`,
            role: data.role
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          toast.error('User created but profile setup failed');
        } else {
          toast.success(`User created successfully with role: ${data.role}`);
          form.reset();
        }
      }

    } catch (error: any) {
      console.error('User creation failed:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/super-admin/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Shield className="h-8 w-8 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Creation Portal</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                Welcome, {user.username}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-blue-600">Create New User</CardTitle>
                <CardDescription>
                  Add a new user to the system with specified role permissions
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="firstName" 
                      rules={{ required: 'First name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                placeholder="Enter first name" 
                                className="pl-10" 
                                disabled={isLoading} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField 
                      control={form.control} 
                      name="lastName" 
                      rules={{ required: 'Last name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                placeholder="Enter last name" 
                                className="pl-10" 
                                disabled={isLoading} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email Field */}
                  <FormField 
                    control={form.control} 
                    name="email" 
                    rules={{ 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              type="email"
                              placeholder="Enter email address" 
                              className="pl-10" 
                              disabled={isLoading} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Selection */}
                  <FormField 
                    control={form.control} 
                    name="role" 
                    rules={{ required: 'Role is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <div className="relative">
                              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Select user role" />
                              </SelectTrigger>
                            </div>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">Customer - Can place and view orders</SelectItem>
                            <SelectItem value="delivery">Delivery - Can manage deliveries</SelectItem>
                            <SelectItem value="manager">Manager - Can manage orders and users</SelectItem>
                            <SelectItem value="admin">Admin - Full system access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="password" 
                      rules={{ 
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                type="password"
                                placeholder="Enter password" 
                                className="pl-10" 
                                disabled={isLoading} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField 
                      control={form.control} 
                      name="confirmPassword" 
                      rules={{ 
                        required: 'Please confirm password',
                        validate: (value) => value === form.getValues('password') || 'Passwords do not match'
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                type="password"
                                placeholder="Confirm password" 
                                className="pl-10" 
                                disabled={isLoading} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate('/super-admin/dashboard')}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating User...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-700 dark:text-blue-300">User Role Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
              <div><strong>Customer:</strong> Can place orders, view their order history, and track deliveries</div>
              <div><strong>Delivery:</strong> Can view assigned deliveries and update delivery status</div>
              <div><strong>Manager:</strong> Can view all orders, manage order status, and access management dashboard</div>
              <div><strong>Admin:</strong> Full system access including production management and analytics</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserCreationPortal;