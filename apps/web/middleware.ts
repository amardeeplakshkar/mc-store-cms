import { NextResponse, type NextRequest } from 'next/server';
import { resolveHost } from '@mcstore/shared';

const ROOT = process.env.ROOT_DOMAIN ?? 'localhost:3000';
const INTERNAL = /^\/(superadmin|store-admin|store)(\/|$)/;

export function middleware(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const url = req.nextUrl.clone();
  const target = resolveHost(host, ROOT);

  // Internal route folders are never reachable directly
  if (INTERNAL.test(url.pathname)) {
    url.pathname = '/404';
    return NextResponse.rewrite(url);
  }

  const path = url.pathname === '/' ? '' : url.pathname;
  switch (target.kind) {
    case 'landing':
      return NextResponse.next();
    case 'superadmin':
      url.pathname = `/superadmin${path}`;
      break;
    case 'store-admin':
      url.pathname = `/store-admin/${target.slug}${path}`;
      break;
    case 'storefront':
      url.pathname = `/store/${target.slug}${path}`;
      break;
    default:
      url.pathname = '/404';
  }
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
