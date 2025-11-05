// app/auth/callback/route.ts

import { createClient } from '../../../../lib/supabase/server';
import { NextResponse } from 'next/server';

// This is required to make the Supabase redirect work with Next.js App Router
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    // This exchanges the code for a session and sets cookies
    await supabase.auth.exchangeCodeForSession(code);
    
    // Redirect to home page for logged-in users
    return NextResponse.redirect(new URL('/home', requestUrl.origin));
  }

  // If no code, redirect to landing page
  return NextResponse.redirect(requestUrl.origin);
}