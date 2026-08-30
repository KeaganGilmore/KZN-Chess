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

    // Tutor toolkit - tutor or admin only
    if (pathname.startsWith('/learn/tutor')) {
      if (!token?.is_tutor && token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/auth', req.url));
      }
    }

    // Authenticated-only routes
    if (
      pathname.startsWith('/submit') ||
      pathname.startsWith('/my-tournaments') ||
      pathname.startsWith('/my-orders')
    ) {
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
        // Always require auth for admin, submit, my-tournaments and my-orders routes
        if (
          pathname.startsWith('/admin') ||
          pathname.startsWith('/submit') ||
          pathname.startsWith('/my-tournaments') ||
          pathname.startsWith('/my-orders') ||
          pathname.startsWith('/learn/tutor')
        ) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/submit/:path*',
    '/my-tournaments/:path*',
    '/my-orders/:path*',
    '/learn/tutor/:path*',
  ],
};
