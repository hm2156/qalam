'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';

export default function AuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (checked) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session && pathname === '/') {
        router.replace('/home');
        setChecked(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && pathname === '/') {
        router.replace('/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname, checked]);

  return null;
}

