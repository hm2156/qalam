// app/login/page.tsx

'use client'; // This component must be a Client Component

import { supabase } from '../../../lib/supabase/client';
import Header from '../components/Header';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  
  // Optional: Check if the user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/'); // Redirect to homepage if logged in
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      flowType: 'pkce',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google sign-in error:', error);
      alert('فشل تسجيل الدخول باستخدام جوجل.'); // Arabic error message
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg p-8" dir="rtl">
        <div className="mt-16 mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
            انضم إلى قلم
          </h1>
          <p className="text-lg text-gray-600">
            شارك أفكارك ومقالاتك مع المجتمع العربي.
          </p>
        </div>
        
        <div className="mt-12">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 border border-gray-300 py-4 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
            dir="ltr"
          >
            <GoogleIcon />
            <span className="text-base font-medium">تسجيل الدخول باستخدام جوجل</span>
          </button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            بمتابعة التسجيل، أنت توافق على{' '}
            <a href="#" className="text-black underline hover:no-underline">
              شروط الاستخدام
            </a>
            {' '}و{' '}
            <a href="#" className="text-black underline hover:no-underline">
              سياسة الخصوصية
            </a>
          </p>
        </div>
      </main>
    </>
  );
}