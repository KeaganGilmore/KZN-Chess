import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'player' | 'organizer' | 'admin';
      district_id: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'player' | 'organizer' | 'admin';
    district_id: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'player' | 'organizer' | 'admin';
    district_id: string | null;
  }
}
