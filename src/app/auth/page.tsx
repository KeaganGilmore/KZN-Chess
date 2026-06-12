import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth/auth-form';
import { AccountPanel } from '@/components/auth/account-panel';
import { PageTransition } from '@/components/ui/page-transition';
import { AuroraBackground } from '@/components/ui/aurora-background';

export const metadata = {
  title: 'Account - KZN Chess',
  description: 'Sign in to your KZN Chess account.',
};

export default async function AuthPage() {
  const user = await getCurrentUser();

  return (
    <AuroraBackground className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <PageTransition>
        <div className="w-full max-w-md mx-auto px-4 py-10">
          {user ? <AccountPanel user={user} /> : <AuthForm />}
        </div>
      </PageTransition>
    </AuroraBackground>
  );
}
