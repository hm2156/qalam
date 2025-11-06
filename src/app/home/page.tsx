// app/logged-in-home/page.tsx (or wherever you place this)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client'; // Adjusted path for better structure
import Link from 'next/link';
import Header from '../components/Header';

export default function LoggedInHome() {
  const router = useRouter();
  // We still need loading state to ensure the auth check completes
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, redirect to the public homepage
        router.replace('/');
        return;
      }
      
      // Since we don't need the name, we just confirm authentication
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes (for better UX if the session expires)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-7xl px-8 py-20" dir="rtl">
          <p className="text-center text-gray-600">...جاري التحقق من الهوية</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-25 max-w-7xl px-8" dir="rtl">
        {/* Welcome Section */}
        <section className="py-20 md:py-32">
          <div className="max-w-5xl">
            <h1 className="mb-6 leading-tight">
              {/* Enhanced Greeting */}
              <span 
                className="text-5xl md:text-7xl lg:text-7xl font-black text-black block mb-4" 
                style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}
              >
                أهلاً أيها الكاتب.
              </span>
              {/* <span className="text-xl md:text-xl font-normal text-gray-700 block mt-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                مداد قلمك ينتظر.
              </span> */}
            </h1>
            <p className="text-xl md:text-xl sm:text-lg text-gray-700 mb-8 leading-relaxed max-w-3xl pt-3">
              ابدأ الآن مقالتك الجديدة، أو تابع العمل على مسوداتك.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* PRIMARY CTA */}
              <Link 
                href="/publish" 
                className="inline-flex items-center justify-center rounded bg-black px-6 py-2.5 text-white hover:bg-gray-800 transition-colors text-base font-medium"
              >
                ابدأ كتابة مقالة جديدة
              </Link>
              {/* Secondary CTAs */}
              <Link 
                href="/dashboard" 
                className="inline-flex items-center justify-center rounded border border-gray-300 px-6 py-2.5 text-black hover:border-black transition-colors text-base font-medium"
              >
                لوحة التحكم
              </Link>
              <Link 
                href="/explore" 
                className="inline-flex items-center justify-center rounded border border-gray-300 px-6 py-2.5 text-black hover:border-black transition-colors text-base font-medium"
              >
                استكشف المقالات
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions Section - Consistent style with landing page */}
        <section className="py-20 border-t border-gray-200">
          <h2 className="text-3xl font-bold mb-12" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
            ماذا تريد أن تفعل؟
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/publish" className="p-6 border border-gray-200 rounded hover:border-black transition-colors">
              <h3 className="text-xl font-semibold mb-2 text-black" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                اكتب الآن
              </h3>
              <p className="text-gray-600">
                انتقل إلى محررنا القوي وابدأ مسودتك على الفور.
              </p>
            </Link>
            <Link href="/dashboard" className="p-6 border border-gray-200 rounded hover:border-black transition-colors">
              <h3 className="text-xl font-semibold mb-2 text-black" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                إدارة المحتوى
              </h3>
              <p className="text-gray-600">
                راجع وعدّل مقالاتك المنشورة أو مسوداتك المحفوظة.
              </p>
            </Link>
            <Link href="/explore" className="p-6 border border-gray-200 rounded hover:border-black transition-colors">
              <h3 className="text-xl font-semibold mb-2 text-black" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                اكتشف محتوى جديد
              </h3>
              <p className="text-gray-600">
                اقرأ أحدث المقالات من الكتاب العرب وتفاعل معها.
              </p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer (Simplified) */}
      <footer className="py-12 border-t border-gray-200 mt-5 mx-25">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-600 text-sm">
            © 2024 قلم. جميع الحقوق محفوظة.
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/explore" className="text-gray-600 hover:text-black transition">
              اكتشف
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}