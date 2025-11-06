'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import BookmarkButton from './BookmarkButton';

interface ArticleInteractionBarProps {
  articleId: number;
  userId: string | null;
  refreshCommentCountRef?: React.MutableRefObject<() => void>;
}

interface LikeCount {
  count: number;
  isLiked: boolean;
}

interface CommentCount {
  count: number;
}

export default function ArticleInteractionBar({ articleId, userId: initialUserId, refreshCommentCountRef }: ArticleInteractionBarProps) {
  const [likeData, setLikeData] = useState<LikeCount>({ count: 0, isLiked: false });
  const [commentCount, setCommentCount] = useState<CommentCount>({ count: 0 });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(initialUserId || null);

  // Fetch user ID on client side (more reliable than server-side)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial like count and user's like status
  useEffect(() => {
    const fetchLikeData = async () => {
      // Get total like count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      // Check if current user has liked
      let isLiked = false;
      if (userId) {
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('article_id', articleId)
          .eq('user_id', userId)
          .maybeSingle();
        isLiked = !!data;
      }

      setLikeData({ count: count || 0, isLiked });
    };

    // Fetch comment count
    const fetchCommentCount = async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId)
        .is('parent_id', null); // Only count top-level comments

      const commentCountValue = count || 0;
      setCommentCount({ count: commentCountValue });
    };

    // Expose refresh function via ref
    const refreshCommentCount = async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId)
        .is('parent_id', null);
      const commentCountValue = count || 0;
      setCommentCount({ count: commentCountValue });
    };

    if (refreshCommentCountRef) {
      refreshCommentCountRef.current = refreshCommentCount;
    }

    fetchLikeData();
    fetchCommentCount();
    
    // Refresh comment count periodically (every 5 seconds) to catch new comments
    const interval = setInterval(fetchCommentCount, 5000);
    return () => clearInterval(interval);
  }, [articleId, userId, refreshCommentCountRef]);

  const handleLike = async () => {
    if (!userId) {
      alert('يجب تسجيل الدخول للإعجاب بالمقالات');
      return;
    }

    setLoading(true);

    if (likeData.isLiked) {
      // Remove like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);

      if (error) {
        console.error('Error removing like:', error);
        alert('حدث خطأ في إزالة الإعجاب');
      } else {
        setLikeData({ count: Math.max(0, likeData.count - 1), isLiked: false });
      }
    } else {
      // Add like
      const { error } = await supabase
        .from('likes')
        .insert([{ user_id: userId, article_id: articleId }]);

      if (error) {
        console.error('Error adding like:', error);
        alert('حدث خطأ في الإعجاب');
      } else {
        setLikeData({ count: likeData.count + 1, isLiked: true });
      }
    }

    setLoading(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch((err) => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ الرابط إلى الحافظة');
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="border-b border-gray-200 py-1.5 mb-4 sm:mb-6 sm: width-full">
      <div className="flex items-center justify-between">
        {/* Left side: Engagement metrics */}
        <div className="flex items-center gap-6">
          {/* Like/Clap button */}
          <button
            onClick={handleLike}
            disabled={loading || !userId}
            className={`flex items-center gap-1.5 transition-colors ${
              likeData.isLiked
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={likeData.isLiked ? 'إزالة الإعجاب' : 'إعجاب'}
          >
            {likeData.isLiked ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            )}
            <span className="text-xs font-medium">{formatCount(likeData.count)}</span>
          </button>

          {/* Comment button */}
          <button
            onClick={() => {
              // Scroll to comments section
              const commentsSection = document.getElementById('comments-section');
              if (commentsSection) {
                commentsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            title="التعليقات"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-xs font-medium">{formatCount(commentCount.count)}</span>
          </button>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-4">
          {/* Bookmark button */}
          <BookmarkButton articleId={articleId} userId={userId} />

          {/* Share button */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              title="مشاركة"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

