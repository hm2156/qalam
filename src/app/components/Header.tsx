// app/components/Header.tsx

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
    <header className=" p-4 m-4 ">
      <div className="mx-auto flex max-w-7xl items-center">
        {/* Logo/Site Title - Will naturally align to the right in RTL */}
        <Link href={isLoggedIn ? "/home" : "/"} className="text-5xl font-bold text-black m-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
           قَلم
        </Link>
        
        {/* Navigation - ml-auto pushes this to the left side in RTL */}
        <nav className="mr-auto flex items-center gap-4">
          <Link href="/explore" className="text-gray-600 hover:text-black">
            اكتشف
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/publish" className="text-gray-600 hover:text-black">
                انشر
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-black">
                لوحة التحكم
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full bg-black px-4 py-1 text-white hover:bg-gray-800"
              >
                تسجيل الخروج
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-black px-4 py-1 text-white hover:bg-gray-800">
              تسجيل الدخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}