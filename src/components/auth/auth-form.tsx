'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LegalLinks } from '@/components/legal/legal-links';

export function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast({
        title: 'Login failed',
        description: 'Invalid email or password.',
        variant: 'destructive',
      });
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      accept_terms: formData.get('accept_terms') === 'on',
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email: body.email,
        password: body.password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Account created',
          description: 'Please sign in with your new credentials.',
        });
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
          <Trophy className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to KZN Chess</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to get started
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  className="bg-background/50"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 min-h-[44px]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input
                  id="reg-name"
                  name="name"
                  placeholder="Your full name"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  placeholder="Choose a strong password (8+ characters)"
                  required
                  minLength={8}
                  className="bg-background/50"
                />
              </div>
              <label htmlFor="reg-accept" className="flex items-start gap-3 text-sm text-muted-foreground">
                <input
                  id="reg-accept"
                  name="accept_terms"
                  type="checkbox"
                  required
                  className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . If I&apos;m under 18, my parent or guardian has agreed to them too.
                </span>
              </label>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 min-h-[44px]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                New accounts default to Player role. Contact an admin to become an Organizer.
              </p>
            </form>
          </TabsContent>
        </Tabs>
        <LegalLinks className="mt-6" />
      </CardContent>
    </Card>
  );
}
