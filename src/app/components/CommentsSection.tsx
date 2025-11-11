'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import RTLContentEditable from './RTLContentEditable';

interface CommentsSectionProps {
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  articleAuthorId: string | null;
  userId: string | null;
  onCommentAdded?: () => void;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id: number | null;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

const COMMENT_EXCERPT_LENGTH = 180;

export default function CommentsSection({
  articleId,
  articleTitle,
  articleSlug,
  articleAuthorId,
  userId: initialUserId,
  onCommentAdded,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContents, setReplyContents] = useState<Map<number, string>>(new Map());
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContents, setEditContents] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState<string | null>(initialUserId || null);

  const enqueueCommentNotification = async (payload: { comment_excerpt: string }) => {
    if (!articleAuthorId || !userId || userId === articleAuthorId) return;

    await supabase.from('notification_events').insert({
      event_type: 'comment',
      actor_id: userId,
      recipient_id: articleAuthorId,
      article_id: articleId,
      payload: {
        article_title: articleTitle,
        article_slug: articleSlug,
        ...payload,
      },
    });
  };

  // Fetch user ID on client side (more reliable than server-side)
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
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, updated_at, user_id, parent_id')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setFetching(false);
      return;
    }

    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map<string, { display_name: string; avatar_url: string | null }>();
    profiles?.forEach(profile => profilesMap.set(profile.id, profile));

    const commentsMap = new Map<number, Comment>();
    const topLevelComments: Comment[] = [];

    data?.forEach(comment => {
      const commentWithAuthor: Comment = {
        ...comment,
        author: profilesMap.get(comment.user_id) || { display_name: 'مستخدم', avatar_url: null },
        replies: [],
      };

      commentsMap.set(comment.id, commentWithAuthor);

      if (comment.parent_id === null) {
        topLevelComments.push(commentWithAuthor);
      } else {
        const parent = commentsMap.get(comment.parent_id);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(commentWithAuthor);
        }
      }
    });

    setComments(topLevelComments);
    setFetching(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;

    setLoading(true);

    const content = newComment.trim();
    const { error } = await supabase
      .from('comments')
      .insert([{ article_id: articleId, user_id: userId, content, parent_id: null }]);

    if (error) {
      console.error('Error submitting comment:', error);
      alert('حدث خطأ في إضافة التعليق');
    } else {
      setNewComment('');
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
      await enqueueCommentNotification({
        comment_excerpt: content.slice(0, COMMENT_EXCERPT_LENGTH),
      });
    }

    setLoading(false);
  };

  const handleReply = async (parentId: number, e: React.FormEvent) => {
    e.preventDefault();
    const replyContent = (replyContents.get(parentId) || '').trim();
    if (!userId || !replyContent) return;

    setLoading(true);

    const { error } = await supabase
      .from('comments')
      .insert([{ article_id: articleId, user_id: userId, content: replyContent, parent_id: parentId }]);

    if (error) {
      console.error('Error submitting reply:', error);
      alert('حدث خطأ في إضافة الرد');
    } else {
      const newReplyContents = new Map(replyContents);
      newReplyContents.delete(parentId);
      setReplyContents(newReplyContents);
      setReplyingTo(null);
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
      await enqueueCommentNotification({
        comment_excerpt: replyContent.slice(0, COMMENT_EXCERPT_LENGTH),
      });
    }

    setLoading(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    setLoading(true);
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting comment:', error);
      alert('حدث خطأ في حذف التعليق');
    } else {
      await fetchComments();
      if (onCommentAdded) {
        onCommentAdded();
      }
    }
    setLoading(false);
  };

  const handleUpdateComment = async (commentId: number, e: React.FormEvent) => {
    e.preventDefault();
    const editContent = editContents.get(commentId) || '';
    if (!editContent.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('comments')
      .update({ content: editContent.trim() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating comment:', error);
      alert('حدث خطأ في تحديث التعليق');
    } else {
      const newEditContents = new Map(editContents);
      newEditContents.delete(commentId);
      setEditContents(newEditContents);
      setEditingComment(null);
      await fetchComments();
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { dateStyle: 'medium' });
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isReplying = replyingTo === comment.id;
    const isEditing = editingComment === comment.id;
    const isOwner = userId === comment.user_id;
    const replyContent = replyContents.get(comment.id) || '';
    const editContent = editContents.get(comment.id) || comment.content;

    return (
      <div className={`${depth > 0 ? 'mt-4' : 'mb-6'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          {comment.author?.avatar_url ? (
            <img
              src={comment.author.avatar_url}
              alt={comment.author.display_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
              {comment.author?.display_name[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-black">{comment.author?.display_name}</span>
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
            </div>
            
            {/* Edit form or content */}
            {isEditing && isOwner ? (
              <form onSubmit={(e) => handleUpdateComment(comment.id, e)} className="mb-2" dir="rtl">
                <RTLContentEditable
                  value={editContent}
                  onChange={(v) => {
                    const newEditContents = new Map(editContents);
                    newEditContents.set(comment.id, v);
                    setEditContents(newEditContents);
                  }}
                  placeholder="حرر تعليقك..."
                  className="min-h-[4.5rem]"
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingComment(null);
                      const newEditContents = new Map(editContents);
                      newEditContents.delete(comment.id);
                      setEditContents(newEditContents);
                    }}
                    className="text-xs px-4 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !editContent.trim()}
                    className="text-xs px-4 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap break-words" dir="rtl" lang="ar">{comment.content}</p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 mb-2">
              {/* Reply button */}
              {userId && depth < 2 && (
                <button
                  onClick={() => {
                    if (isReplying) {
                      setReplyingTo(null);
                      const newReplyContents = new Map(replyContents);
                      newReplyContents.delete(comment.id);
                      setReplyContents(newReplyContents);
                    } else {
                      setReplyingTo(comment.id);
                      const newReplyContents = new Map(replyContents);
                      newReplyContents.set(comment.id, '');
                      setReplyContents(newReplyContents);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {isReplying ? 'إلغاء' : 'رد'}
                </button>
              )}
              
              {/* Edit/Delete buttons - only for owner */}
              {isOwner && !isEditing && (
                <>
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      const newEditContents = new Map(editContents);
                      newEditContents.set(comment.id, comment.content);
                      setEditContents(newEditContents);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    حذف
                  </button>
                </>
              )}
            </div>

            {/* Reply form */}
            {isReplying && userId && (
              <form onSubmit={(e) => handleReply(comment.id, e)} className="mt-3 mb-4" dir="rtl">
                <RTLContentEditable
                  value={replyContent}
                  onChange={(v) => {
                    const newReplyContents = new Map(replyContents);
                    newReplyContents.set(comment.id, v);
                    setReplyContents(newReplyContents);
                  }}
                  placeholder="اكتب ردك..."
                  className="min-h-[6rem]"
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      const newReplyContents = new Map(replyContents);
                      newReplyContents.delete(comment.id);
                      setReplyContents(newReplyContents);
                    }}
                    className="text-xs px-4 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !replyContent.trim()}
                    className="text-xs px-4 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'جاري الإرسال...' : 'إرسال'}
                  </button>
                </div>
              </form>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 pr-4 border-r-2 border-gray-200">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="comments-section" className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
        التعليقات
      </h2>

      {/* Comment form */}
      {userId ? (
        <form onSubmit={handleSubmitComment} className="mb-8" dir="rtl">
          <RTLContentEditable
            value={newComment}
            onChange={setNewComment}
            onSubmit={() => {
              // Ctrl/Cmd+Enter to submit
              const fake = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
              handleSubmitComment(fake);
            }}
            placeholder="اكتب تعليقك..."
            className="min-h-[6rem]"
            autoFocus={false}
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="mt-3 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال التعليق'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 mb-8">
          <a href="/login" className="text-black underline">سجل الدخول</a> لإضافة تعليق
        </p>
      )}

      {/* Comments list */}
      {fetching ? (
        <p className="text-center text-gray-500 py-8">جاري تحميل التعليقات...</p>
      ) : comments.length === 0 ? (
        <p className="text-center text-gray-500 py-8">لا توجد تعليقات بعد. كن أول من يعلق!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}