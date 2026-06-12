import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServerClient } from '@/lib/supabase/server';
import { hashPassword, verifyPassword } from '@/lib/passwords';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = createServerClient();
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email.toLowerCase().trim())
          .eq('is_active', true)
          .single();

        if (error || !user) return null;

        const { valid, needsUpgrade } = await verifyPassword(
          credentials.password,
          user.password_hash
        );
        if (!valid) return null;

        // Transparently re-hash legacy placeholder hashes with real bcrypt
        if (needsUpgrade) {
          const password_hash = await hashPassword(credentials.password);
          await supabase.from('users').update({ password_hash }).eq('id', user.id);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          district_id: user.district_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.district_id = (user as any).district_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).district_id = token.district_id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
