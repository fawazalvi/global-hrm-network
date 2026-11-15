'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Icons } from '@/frontend/components/icons';
import { useToast } from '@/frontend/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        const msg = data?.error || 'Invalid email or password.';
        setErrorMessage(msg);
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: msg,
        });
        return;
      }

      toast({
        title: 'Signed In Successfully',
        description: 'Redirecting...',
      });

      const role = data.user?.role;
      window.location.href = role === 'admin' ? '/admin/dashboard' : '/dashboard';
    } catch (error: any) {
      const msg = error?.message || 'An unexpected error occurred.';
      setErrorMessage(msg);
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: msg,
      });
    }
  };

  return (
    <div className="force-light flex items-center justify-center min-h-screen bg-ghrm-bg text-ghrm-text px-4">
      <Card className="mx-auto max-w-sm w-full bg-white border-ghrm-border shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <Link href="/">
            <Icons.logo className="w-16 h-16 mx-auto text-primary" />
          </Link>
          <CardTitle className="text-2xl font-bold text-ghrm-navy">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Apply for Access
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
