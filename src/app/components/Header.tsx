// app/components/Header.tsx (Responsiveness Fixed - Style Preserved)

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="p-4 mx-2"> {/* ⬅️ FIXED: Simplified margin for full width */}
      <div className="sm:mx-20 sm:mt-10 mx-auto flex max-w-7xl items-center gap-4">
        
        {/* Logo/Site Title */}
        <Link 
          href={isLoggedIn ? "/home" : "/"} 
          // ⬅️ FIXED: Reduced logo size on mobile (text-3xl) and large size (sm:text-5xl)
          className="text-3xl sm:text-5xl font-bold text-black m-2 flex-shrink-0" 
          style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}
        >
           قَلم
        </Link>
        
        {/* Navigation */}
        <nav 
          className="mr-auto flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap px-2"
        >
          <Link href="/explore" className="text-sm sm:text-base text-gray-600 hover:text-black">
            اكتشف
          </Link>
          {isLoggedIn && (
            <>
              <Link href="/publish" className="text-sm sm:text-base text-gray-600 hover:text-black">
                انشر
              </Link>
              <Link href="/dashboard" className="text-sm sm:text-base text-gray-600 hover:text-black">
                لوحة التحكم
              </Link>
            </>
          )}
        </nav>

        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="rounded-full bg-black px-3 py-1 text-xs sm:text-sm text-white hover:bg-gray-800 flex-shrink-0"
          >
            تسجيل الخروج
          </button>
        ) : (
          <Link 
            href="/login" 
            className="rounded-full bg-black px-3 py-1 text-xs sm:text-sm text-white hover:bg-gray-800 flex-shrink-0"
          >
            تسجيل الدخول
          </Link>
        )}
      </div>
    </header>
  );
}