'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Icons } from '@/frontend/components/icons';
import { useToast } from '@/frontend/hooks/use-toast';
import { signIn, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: session, status } = useSession();
  const isUserLoading = status === 'loading';
  const router = useRouter();
  const { toast } = useToast();
  
  // If the user is already logged in, redirect them.
  useEffect(() => {
    if (!isUserLoading && session) {
        router.push('/dashboard');
    }
  }, [session, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: 'Invalid email or password.',
        });
      } else {
        toast({
          title: 'Signed In Successfully',
          description: 'Welcome back!',
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
        await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error: any) {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: error.message || 'An unknown error occurred.',
        });
    }
  };
  
  if (isUserLoading || session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-1 text-center">
          <Link href="/">
            <Icons.logo className="w-16 h-16 mx-auto text-primary" />
          </Link>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </Link>
              </div>
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
          <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 h-4 w-4" />
            )}
            Login with Google
          </Button>
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
