import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Se siamo sul dominio principale e l'utente accede a /chat, redirect a chat.pastaa.io
  if (!hostname.startsWith('chat.') && url.pathname.startsWith('/chat')) {
    const chatUrl = new URL(request.url);
    chatUrl.host = hostname.replace(/^(www\.)?/, 'chat.');
    chatUrl.pathname = url.pathname.replace('/chat', '') || '/';
    return NextResponse.redirect(chatUrl);
  }

  // Se il dominio è chat.pastaa.io, reindirizza a /chat
  if (hostname.startsWith('chat.')) {
    // Se è già su /chat, non fare nulla
    if (url.pathname.startsWith('/chat')) {
      return NextResponse.next();
    }
    
    // Se è la homepage, reindirizza a /chat
    if (url.pathname === '/') {
      url.pathname = '/chat';
      return NextResponse.rewrite(url);
    }
    
    // Per altri percorsi, prependi /chat
    // Es: /room -> /chat/room
    url.pathname = `/chat${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, api routes, and _next
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|manifest).*)',
  ],
};

