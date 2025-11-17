'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';

interface BookmarkButtonProps {
  articleId: number;
  userId: string | null;
}

const BookmarkIconEmpty = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const BookmarkIconFilled = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export default function BookmarkButton({ articleId, userId: initialUserId }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(initialUserId || null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!userId) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();

      setIsBookmarked(!!data);
      setChecking(false);
    };

    checkBookmark();
  }, [userId, articleId]);

  const handleBookmark = async () => {
    if (!userId) {
      alert('يجب تسجيل الدخول لحفظ المقالات');
      return;
    }

    setLoading(true);

    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);

      if (error) {
        console.error('Error removing bookmark:', error);
        alert('حدث خطأ في إزالة الحفظ');
      } else {
        setIsBookmarked(false);
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert([{ user_id: userId, article_id: articleId }]);

      if (error) {
        console.error('Error adding bookmark:', error);
        alert('حدث خطأ في حفظ المقالة');
      } else {
        setIsBookmarked(true);
      }
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <button
        disabled
        className="p-1.5 text-gray-400 cursor-not-allowed"
        title="جارٍ التحميل..."
      >
        <BookmarkIconEmpty />
      </button>
    );
  }

  return (
    <button
      onClick={handleBookmark}
      disabled={loading || !userId}
      className={`p-1.5 rounded-full transition-colors ${
        isBookmarked
          ? 'text-black hover:text-gray-700'
          : 'text-gray-400 hover:text-gray-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isBookmarked ? 'إزالة الحفظ' : 'حفظ المقالة'}
    >
      {isBookmarked ? <BookmarkIconFilled /> : <BookmarkIconEmpty />}
    </button>
  );
}

