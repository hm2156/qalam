// app/explore/page.tsx (MINIMAL STYLE)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Link from 'next/link';
import type { ArticleWithAuthor } from '@/types/articles';
import { fetchArticlesWithAuthors } from './actions';

// ---------------------------------------------------
// Component: Article List Item
// ---------------------------------------------------

interface ArticleCardProps {
    article: ArticleWithAuthor;
    availableTags: { value: string; label: string; icon?: React.ReactNode }[];
}

const ArticleListItem = ({ article, availableTags }: ArticleCardProps) => {
    const router = useRouter();
    const preview = (article.content ?? '').replace(/<[^>]*>/g, '').trim();
    const text = preview.slice(0, 160) + (preview.length > 160 ? '…' : '');
    const tag = availableTags.find(t => t.value === article.tag);
    const author = article.authorName?.trim() || 'كاتب';

    const handleAuthorClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/author/${article.author_id}`);
    };

    return (
        <Link href={`/article/${article.slug}`} className="block">
            <article className="py-6">
                {/* top row: author + tag */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                        {article.authorAvatar ? (
                            <img src={article.authorAvatar} alt={author} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-700">
                                {author[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <button
                            onClick={handleAuthorClick}
                            className="text-gray-700 hover:text-black hover:underline text-left"
                        >
                            {author}
                        </button>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">
                            {new Date(article.created_at).toLocaleDateString('ar-EG', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                            })}
                        </span>
                    </div>
                    
                    {tag && tag.value !== 'general' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">
                            {tag.icon && <span className="w-3.5 h-3.5">{tag.icon}</span>}
                            {tag.label}
                        </span>
                    )}
                </div>

                {/* title */}
                <h2 
                    className="text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-black hover:text-gray-700 transition-colors"
                    style={{ fontFamily: 'var(--font-mirza), serif' }}
                >
                    {article.title}
                </h2>

                {/* preview */}
                {text && <p className="mt-2 text-[15px] leading-relaxed text-gray-600 line-clamp-3">{text}</p>}

                {/* bottom meta (quiet) */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    {article.reading_time && <span>{article.reading_time} دقيقة قراءة</span>}
                    <span>·</span>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 01 2-2h14a2 2 0 01 2 2z"/>
                            </svg>
                        <span>التعليقات {article.comments_count ?? 0}</span>
                        </span>
                    <span>·</span>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                        <span>الإعجابات {article.likes_count ?? 0}</span>
                        </span>
                </div>
            </article>
        </Link>
    );
};

// ---------------------------------------------------
// Component: TrendingTopics Sidebar
// ---------------------------------------------------

const TrendingTopics = ({ tags, selectedTag, onSelectTag }: { 
    tags: { value: string; label: string; icon?: React.ReactNode }[];
    selectedTag: string;
    onSelectTag: (tag: string) => void;
}) => (
    <aside className="hidden lg:block">
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-mirza), serif' }}>
                    التصنيفات
                </h3>
        <div className="flex flex-wrap gap-2">
            {tags.slice(0, 12).map(tag => (
                        <button
                            key={tag.value}
                            onClick={() => onSelectTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                        ${selectedTag === tag.value
                            ? 'border-black text-black bg-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                    {tag.label}
                        </button>
                    ))}
            </div>
            
        <div className="mt-8 border-t border-gray-200 pt-6">
            <Link href="/publish" className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm border border-gray-300 hover:border-gray-400">
                    ابدأ الكتابة
                </Link>
            </div>
        </aside>
    );

// ---------------------------------------------------
// Component: ExplorePage
// ---------------------------------------------------

export default function ExplorePage() {
    const router = useRouter();
  const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<ArticleWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const availableTags = [
    { value: 'all', label: 'الكل', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 11a3 3 0 11-6 0m6 0a3 3 0 10-6 0m6 0h1.5M15 11h-1.5m0 0H12m1.5 0V9m0 2v2m-6-2V9m0 2H9m0 0H6.5M9 11h1.5M9 9h1.5" />
      </svg>
    )},
    { value: 'general', label: 'عام', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
    { value: 'technology', label: 'تقنية', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { value: 'science', label: 'علوم', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )},
    { value: 'culture', label: 'ثقافة', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { value: 'literature', label: 'أدب', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )},
    { value: 'philosophy', label: 'فلسفة', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )},
    { value: 'history', label: 'تاريخ', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { value: 'politics', label: 'سياسة', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )},
    { value: 'society', label: 'مجتمع', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { value: 'art', label: 'فن', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )},
    { value: 'education', label: 'تعليم', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0l-3-3m3 3l3-3" />
      </svg>
    )},
    { value: 'health', label: 'صحة', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )},
    { value: 'business', label: 'أعمال', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { value: 'travel', label: 'سفر', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 11a3 3 0 11-6 0m6 0a3 3 0 10-6 0m6 0h1.5M15 11h-1.5m0 0H12m1.5 0V9m0 2v2m-6-2V9m0 2H9m0 0H6.5M9 11h1.5M9 9h1.5" />
      </svg>
    )},
    { value: 'food', label: 'طعام', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    )},
    { value: 'sports', label: 'رياضة', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { value: 'entertainment', label: 'ترفيه', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )},
  ];

  useEffect(() => {
    let isMounted = true;

    const fetchArticles = async () => {
      setLoading(true);

      try {
        const articlesWithAuthors = await fetchArticlesWithAuthors(selectedTag);

        if (!isMounted) {
          return;
        }

        if (selectedTag === 'all' && articlesWithAuthors.length > 0) {
          setFeaturedArticle(articlesWithAuthors[0]);
          setArticles(articlesWithAuthors.slice(1));
        } else {
          setFeaturedArticle(null);
          setArticles(articlesWithAuthors);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
        if (!isMounted) {
          return;
        }
        setArticles([]);
        setFeaturedArticle(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchArticles();

    return () => {
      isMounted = false;
    };
  }, [selectedTag]);

  return (
    <>
      <Header />
            <main dir="rtl" className="mx-2 sm:mx-20 max-w-7xl mx-auto px-4 py-10">
                
                {/* Hero */}
                <header className="mb-10 pb-6 border-b border-gray-200">
                    <h1 className="text-4xl font-bold mb-3 tracking-wider" style={{ fontFamily: 'var(--font-aref-ruqaa), serif', wordSpacing: '0.3em' }}>
                     العالم  كما  يُروى 
            </h1>
                    <p className="text-gray-600 text-base">
                    منصّة تُعطي للكلمات صوتها، وللأفكار أثرها 
            </p>
                </header>

        {/* Two Column Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8">
            
            {/* Mobile Tag Filter */}
                        <div className="mb-6 border-b border-gray-200 pb-4 lg:hidden">
                            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                {availableTags.map(tag => (
                  <button
                    key={tag.value}
                    onClick={() => setSelectedTag(tag.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border flex-shrink-0 transition-colors
                                            ${selectedTag === tag.value
                                                ? 'border-black text-black bg-white'
                                                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">جاري تحميل المقالات...</p>
              </div>
            ) : articles.length === 0 && !featuredArticle ? (
                            <div className="text-center py-20">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">لا توجد مقالات متاحة حالياً في هذا التصنيف</p>
              </div>
            ) : (
              <div>
                {/* Featured Article */}
                {selectedTag === 'all' && featuredArticle && (
                                    <section aria-labelledby="featured-heading" className="mt-6 lg:mt-4 mb-10">
                                        {/* Kicker row */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <span
                                                id="featured-heading"
                                                className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs font-medium"
                                            >
                      مقالة اليوم
                                            </span>
                                            <div className="h-px flex-1 bg-gray-200" />
                                        </div>

                                        {/* Full-width band */}
                                        <div className="-mx-4 bg-gray-50 border-y border-gray-200">
                                            <div className="mx-auto px-4 py-8">
                                                {/* Featured item with larger type and longer preview */}
                                                <Link href={`/article/${featuredArticle.slug}`} className="block">
                                                    <article>
                                                        {/* author row (kept quiet) */}
                                                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                                                            {featuredArticle.authorAvatar ? (
                                                                <img src={featuredArticle.authorAvatar} alt={featuredArticle.authorName ?? 'كاتب'} className="w-7 h-7 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] text-gray-700">
                                                                    {(featuredArticle.authorName ?? 'ك')[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    router.push(`/author/${featuredArticle.author_id}`);
                                                                }}
                                                                className="hover:text-black hover:underline text-left"
                                                            >
                                                                {featuredArticle.authorName ?? 'كاتب'}
                                                            </button>
                                                            <span className="text-gray-300">·</span>
                                                            <span>{new Date(featuredArticle.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        </div>

                                                        {/* bigger title */}
                                                        <h2
                                                            className="text-3xl sm:text-4xl font-bold leading-snug tracking-tight text-black hover:text-gray-700 transition-colors"
                                                            style={{ fontFamily: 'var(--font-mirza), serif' }}
                                                        >
                                                            {featuredArticle.title}
                    </h2>

                                                        {/* longer preview (4–5 lines) */}
                                                        <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-gray-700 line-clamp-5">
                                                            {((featuredArticle.content ?? '').replace(/<[^>]*>/g, '').trim()).slice(0, 320)}…
                                                        </p>

                                                        {/* quiet meta */}
                                                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                                                            {featuredArticle.reading_time && <span>{featuredArticle.reading_time} دقيقة قراءة</span>}
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1.5">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 01 2-2h14a2 2 0 01 2 2z"/>
                                                                </svg>
                                                                <span>التعليقات {featuredArticle.comments_count ?? 0}</span>
                                                            </span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1.5">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                                                </svg>
                                                                <span>الإعجابات {featuredArticle.likes_count ?? 0}</span>
                                                            </span>
                                                        </div>
                                                    </article>
                                                </Link>
                    </div>
                  </div>
                                    </section>
                )}
                
                {/* Articles List */}
                  {selectedTag !== 'all' && (
                                    <section className="mt-6 lg:mt-4 mb-10">
                                        {/* Kicker row */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs font-medium">
                      {availableTags.find(t => t.value === selectedTag)?.label}
                                            </span>
                                            <div className="h-px flex-1 bg-gray-200" />
                                        </div>
                                    </section>
                                )}
                                <div className="divide-y divide-gray-200">
                                    {articles.map(article => (
                                        <ArticleListItem key={article.id} article={article} availableTags={availableTags} />
                                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4">
            <TrendingTopics 
              tags={availableTags} 
              selectedTag={selectedTag} 
              onSelectTag={setSelectedTag}
            />
          </div>
        </div>
      </main>
      
      {/* Add custom scrollbar hiding for mobile tags */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
