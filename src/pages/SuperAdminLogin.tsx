import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Shield, Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSuperAdminAuth } from '@/contexts/SuperAdminAuthContext';
import { Navigate } from 'react-router-dom';
type LoginForm = {
  username: string;
  password: string;
};
const SuperAdminLogin = () => {
  const {
    user,
    signIn
  } = useSuperAdminAuth();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginForm>({
    defaultValues: {
      username: '',
      password: ''
    }
  });

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await signIn(data.username, data.password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-6">
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-red-600">Super Admin</CardTitle>
              <CardDescription>
                Access the administrative dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="username" rules={{
                required: 'Username is required'
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input {...field} placeholder="Enter username" className="pl-10" disabled={isLoading} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="password" rules={{
                required: 'Password is required'
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="password" placeholder="Enter password" className="pl-10" disabled={isLoading} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>
            
            
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default SuperAdminLogin;