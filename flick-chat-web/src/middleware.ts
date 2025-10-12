import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  console.log('🔒 Middleware:', {
    path: request.nextUrl.pathname,
    hasToken: !!token,
    isAuthPage,
    isDashboard
  });

  // Allow all traffic - let client-side handle redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
