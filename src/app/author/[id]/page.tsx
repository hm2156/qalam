// app/author/[id]/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import type { ArticleWithAuthor } from '../../../types/articles';

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    github_url: string | null;
    created_at: string;
}

export default function AuthorProfilePage() {
    const params = useParams();
    const router = useRouter();
    const authorId = params.id as string;
    const [activeTab, setActiveTab] = useState<'home' | 'about'>('home');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinDate, setJoinDate] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isSelf, setIsSelf] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [notifyOnPublish, setNotifyOnPublish] = useState(false);
    const [followActionLoading, setFollowActionLoading] = useState(false);
    const [notifyToggleLoading, setNotifyToggleLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchArticles();
    }, [authorId]);

    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const { data } = await supabase.auth.getUser();
                const userId = data?.user?.id ?? null;
                setCurrentUserId(userId);
                setIsSelf(userId === authorId);
                if (userId && userId !== authorId) {
                    await fetchFollowState(userId);
                } else {
                    setIsFollowing(false);
                    setNotifyOnPublish(false);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        getCurrentUser();
    }, [authorId]);

    const fetchProfile = async () => {
        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url, bio, twitter_url, linkedin_url, website_url, github_url, created_at')
                .eq('id', authorId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return;
            }

            if (profileData) {
                setProfile(profileData);
                setJoinDate(profileData.created_at);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const { data: articlesData, error } = await supabase
                .from('articles')
                .select('id, title, slug, created_at, author_id, reading_time, tag, content')
                .eq('author_id', authorId)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching articles:', error);
                return;
            }

            // Fetch author profiles for all articles
            const authorIds = [...new Set(articlesData.map(a => a.author_id).filter(Boolean))];
            const profileMap = new Map<string, { display_name: string; avatar_url?: string }>();

            if (authorIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, avatar_url')
                    .in('id', authorIds);

                if (profiles) {
                    profiles.forEach(p => {
                        profileMap.set(String(p.id), {
                            display_name: p.display_name?.trim() || 'كاتب',
                            avatar_url: p.avatar_url || undefined
                        });
                    });
                }
            }

            // Fetch counts
            const articleIds = articlesData.map(a => a.id);
            const { data: commentsData } = await supabase
                .from('comments')
                .select('article_id')
                .in('article_id', articleIds)
                .is('parent_id', null);

            const { data: likesData } = await supabase
                .from('likes')
                .select('article_id')
                .in('article_id', articleIds);

            const commentsCountMap = new Map<number, number>();
            const likesCountMap = new Map<number, number>();

            commentsData?.forEach(comment => {
                const count = commentsCountMap.get(comment.article_id) || 0;
                commentsCountMap.set(comment.article_id, count + 1);
            });

            likesData?.forEach(like => {
                const count = likesCountMap.get(like.article_id) || 0;
                likesCountMap.set(like.article_id, count + 1);
            });

            // Combine articles with author info
            const articlesWithAuthors: ArticleWithAuthor[] = articlesData.map(article => {
                const authorProfile = profileMap.get(article.author_id);
                return {
                    ...article,
                    authorName: authorProfile?.display_name || 'كاتب',
                    authorAvatar: authorProfile?.avatar_url,
                    authorBio: undefined,
                    comments_count: commentsCountMap.get(article.id) || 0,
                    likes_count: likesCountMap.get(article.id) || 0,
                };
            });

            setArticles(articlesWithAuthors);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowState = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profile_follows')
                .select('notify_on_publish')
                .eq('follower_id', userId)
                .eq('author_id', authorId)
                .maybeSingle();

            if (error) {
                // When no row, maybeSingle returns error 406 PGRST116
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching follow state:', error);
                }
                setIsFollowing(false);
                setNotifyOnPublish(false);
                return;
            }

            if (data) {
                setIsFollowing(true);
                setNotifyOnPublish(Boolean(data.notify_on_publish));
            } else {
                setIsFollowing(false);
                setNotifyOnPublish(false);
            }
        } catch (error) {
            console.error('Error determining follow state:', error);
        }
    }, [authorId]);

    const handleFollowToggle = async () => {
        if (followActionLoading) return;
        if (!authorId) return;

        if (!currentUserId) {
            router.push(`/login?redirect=/author/${authorId}`);
            return;
        }

        if (isSelf) {
            return;
        }

        setFollowActionLoading(true);
        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from('profile_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('author_id', authorId);

                if (error) throw error;

                setIsFollowing(false);
                setNotifyOnPublish(false);
            } else {
                const defaultNotify = true;
                const { error } = await supabase
                    .from('profile_follows')
                    .upsert({
                        follower_id: currentUserId,
                        author_id: authorId,
                        notify_on_publish: defaultNotify,
                    });

                if (error) throw error;

                setIsFollowing(true);
                setNotifyOnPublish(defaultNotify);

                try {
                    await supabase.from('notification_events').insert({
                        event_type: 'follow',
                        actor_id: currentUserId,
                        recipient_id: authorId,
                        payload: {},
                    });
                } catch (enqueueError) {
                    console.error('Error enqueueing follow notification:', enqueueError);
                }
            }

        } catch (error) {
            console.error('Error updating follow status:', error);
        } finally {
            setFollowActionLoading(false);
        }
    };

    const handleTogglePublishNotifications = async () => {
        if (notifyToggleLoading || !isFollowing || !currentUserId) return;

        const nextValue = !notifyOnPublish;
        setNotifyToggleLoading(true);
        try {
            const { error } = await supabase
                .from('profile_follows')
                .update({ notify_on_publish: nextValue })
                .eq('follower_id', currentUserId)
                .eq('author_id', authorId);

            if (error) throw error;

            setNotifyOnPublish(nextValue);
        } catch (error) {
            console.error('Error updating publish notification preference:', error);
        } finally {
            setNotifyToggleLoading(false);
        }
    };

    if (loading && !profile) {
        return (
            <>
                <Header />
                <main dir="rtl" className="mx-2 sm:mx-20 max-w-7xl mx-auto px-4 py-10">
                    <div className="text-center py-20">
                        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">جاري التحميل...</p>
                    </div>
                </main>
            </>
        );
    }

    if (!profile) {
        return (
            <>
                <Header />
                <main dir="rtl" className="mx-2 sm:mx-20 max-w-7xl mx-auto px-4 py-10">
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">المستخدم غير موجود</p>
                    </div>
                </main>
            </>
        );
    }

    const displayName = profile.display_name || 'كاتب';
    const hasBioOrSocials = profile.bio || profile.twitter_url || profile.linkedin_url || profile.website_url || profile.github_url;

    return (
        <>
            <Header />
            <main dir="rtl" className="mx-2 sm:mx-20 max-w-7xl mx-auto px-4 py-10">
                {/* Profile Header */}
                <div className="mb-10 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-4 sm:gap-6">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-700 font-bold">
                                {displayName[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold mb-2 " style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                                {displayName}
                            </h1>
                            {joinDate && (
                                <p className="text-gray-500 text-sm mt-3">
                                    انضم إلى قلم في {new Date(joinDate).toLocaleDateString('ar-EG', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            )}
                            {!isSelf && (
                                <div className="mt-4 flex items-center gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleFollowToggle}
                                        disabled={followActionLoading}
                                        className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                                            isFollowing
                                                ? 'bg-black text-white border-black hover:bg-gray-800'
                                                : 'bg-white text-black border-gray-300 hover:border-black'
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    >
                                        {followActionLoading
                                            ? 'جاري التحديث...'
                                            : isFollowing
                                                ? 'إلغاء المتابعة'
                                                : 'تابع هذا الكاتب'}
                                    </button>
                                    {isFollowing && (
                                        <button
                                            type="button"
                                            onClick={handleTogglePublishNotifications}
                                            disabled={notifyToggleLoading}
                                            className={`px-4 py-2 rounded-full text-sm transition-colors border ${
                                                notifyOnPublish
                                                    ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                                                    : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'
                                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                                        >
                                            {notifyToggleLoading
                                                ? 'جاري التحديث...'
                                                : notifyOnPublish
                                                    ? 'إيقاف تنبيهات النشر'
                                                    : 'تفعيل تنبيهات النشر'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors ${
                            activeTab === 'home'
                                ? 'text-black border-b-2 border-black'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        الصفحة الرئيسية
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors ${
                            activeTab === 'about'
                                ? 'text-black border-b-2 border-black'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        عن الكاتب
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'home' ? (
                    <div>
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500">جاري تحميل المقالات...</p>
                            </div>
                        ) : articles.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500 text-lg">لا توجد مقالات منشورة بعد</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {articles.map(article => (
                                    <Link key={article.id} href={`/article/${article.slug}`} className="block">
                                        <article className="py-6">
                                            <h2 className="text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-black hover:text-gray-700 transition-colors mb-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                                                {article.title}
                                            </h2>
                                            <p className="text-sm text-gray-500 mb-3">
                                                {new Date(article.created_at).toLocaleDateString('ar-EG', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                                {article.reading_time && (
                                                    <>
                                                        <span className="mx-2">·</span>
                                                        <span>{article.reading_time} دقيقة قراءة</span>
                                                    </>
                                                )}
                                            </p>
                                            {article.content && (
                                                <p className="text-[15px] leading-relaxed text-gray-600 line-clamp-2">
                                                    {article.content.replace(/<[^>]*>/g, '').trim().slice(0, 160)}…
                                                </p>
                                            )}
                                        </article>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-2xl">
                        {hasBioOrSocials ? (
                            <div className="space-y-6">
                                {profile.bio && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-3">نبذة</h2>
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                                    </div>
                                )}
                                {(profile.twitter_url || profile.linkedin_url || profile.website_url || profile.github_url) && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-3">روابط التواصل</h2>
                                        <div className="flex flex-wrap gap-3">
                                            {profile.twitter_url && (
                                                <a
                                                    href={profile.twitter_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 text-sm text-gray-700 hover:text-black transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                                                    </svg>
                                                    Twitter
                                                </a>
                                            )}
                                            {profile.linkedin_url && (
                                                <a
                                                    href={profile.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 text-sm text-gray-700 hover:text-black transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                                    </svg>
                                                    LinkedIn
                                                </a>
                                            )}
                                            {profile.github_url && (
                                                <a
                                                    href={profile.github_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 text-sm text-gray-700 hover:text-black transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                    </svg>
                                                    GitHub
                                                </a>
                                            )}
                                            {profile.website_url && (
                                                <a
                                                    href={profile.website_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 text-sm text-gray-700 hover:text-black transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                                                    </svg>
                                                    الموقع الشخصي
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500">
                                    {joinDate && `انضم إلى قلم في ${new Date(joinDate).toLocaleDateString('ar-EG', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}`}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}

