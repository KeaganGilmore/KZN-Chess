import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes - admin only
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/auth', req.url));
      }
    }

    // Submit route - any authenticated user
    if (pathname.startsWith('/submit')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Always require auth for admin and submit routes
        if (pathname.startsWith('/admin') || pathname.startsWith('/submit')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/submit/:path*'],
};
