import { AuthForm } from '@/components/auth/auth-form';
import { PageTransition } from '@/components/ui/page-transition';
import { AuroraBackground } from '@/components/ui/aurora-background';

export const metadata = {
  title: 'Sign In - KZN Chess',
  description: 'Sign in to your KZN Chess account.',
};

export default function AuthPage() {
  return (
    <AuroraBackground className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <PageTransition>
        <div className="w-full max-w-md mx-auto px-4 py-10">
          <AuthForm />
        </div>
      </PageTransition>
    </AuroraBackground>
  );
}
