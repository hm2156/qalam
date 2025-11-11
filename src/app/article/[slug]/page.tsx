// app/article/[slug]/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import ArticleInteractionBar from '@/app/components/ArticleInteractionBar';
import CommentsSection from '@/app/components/CommentsSection';
import { createServerSupabaseClient } from '../../../../lib/supabase/server'; // Import server client
import { Metadata } from 'next';

// Define the expected props structure for a dynamic route
interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// 1. Fetch data for SEO (Metadata)
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const { data: article } = await supabase
    .from('articles')
    .select('title, content')
    .eq('slug', slug)
    .eq('status', 'published') // Only generate metadata for published articles
    .maybeSingle();

  if (!article) {
    return { title: 'مقالة غير موجودة' };
  }

  return {
    title: article.title,
    description: article.content.substring(0, 150).replace(/<[^>]*>?/gm, ''), // Clean HTML for description
  };
}


// 2. The Main Server Component to Render the Article
export default async function ArticlePage({ params }: ArticlePageProps) {
  const supabase = await createServerSupabaseClient();
  const { slug: rawSlug } = await params;
  
  // Decode URL-encoded slug
  const slug = decodeURIComponent(rawSlug);

  // Fetch the article content - use maybeSingle() instead of single() to handle no results gracefully
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, created_at, title, content, reading_time, slug, status, author_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  // If not found with decoded slug, try the raw slug (in case it's stored URL-encoded)
  let finalArticle = article;
  if (!article && !error) {
    const { data: articleWithRawSlug } = await supabase
      .from('articles')
      .select('id, created_at, title, content, reading_time, slug, status, author_id')
      .eq('slug', rawSlug)
      .eq('status', 'published')
      .maybeSingle();
    
    if (articleWithRawSlug) {
      finalArticle = articleWithRawSlug;
    }
  } else {
    finalArticle = article;
  }

  // Debug logging - check server terminal for these logs
  if (error) {
    console.error('❌ Article fetch error:', error);
    console.error('Raw slug:', rawSlug);
    console.error('Decoded slug:', slug);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return notFound();
  }

  if (!finalArticle) {
    console.error('❌ Article not found for slug:', slug, 'or raw:', rawSlug);
    return notFound();
  }

  // Fetch author profile separately
  let authorName = 'كاتب مجهول';
  let authorAvatar = null;
  
  if (finalArticle.author_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', finalArticle.author_id)
      .maybeSingle();
    
    if (profile) {
      authorName = profile.display_name || 'كاتب مجهول';
      authorAvatar = profile.avatar_url || null;
    }
  }

  // Get current user for bookmark functionality
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  
  return (
    <>
      <Header />
      <main className="mx-2 px-4 max-w-3xl sm:mx-20 sm:px-4 lg:max-w-7xl py-4 sm:py-6 md:py-8" dir="rtl">
        
        {/* Article Header */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-black leading-tight" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
          {finalArticle.title}
        </h1>
        
        {/* Article Meta with Author */}
        <div className="flex items-center gap-3 mb-4 pb-5 border-b border-gray-200">
          {/* Author Avatar */}
          {authorAvatar ? (
            <img 
              src={authorAvatar} 
              alt={authorName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold">
              {authorName[0]?.toUpperCase() || '?'}
            </div>
          )}
          
          {/* Author Info */}
          <div className="flex-1">
            <Link href={`/author/${finalArticle.author_id}`} className="font-semibold text-black text-base hover:text-gray-700 hover:underline inline-block">
              {authorName}
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
              <span>{new Date(finalArticle.created_at).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</span>
              {finalArticle.reading_time && (
                <>
                  <span>·</span>
                  <span>{finalArticle.reading_time} دقائق قراءة</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Bar */}
        <ArticleInteractionBar
          articleId={finalArticle.id}
          articleTitle={finalArticle.title}
          articleSlug={finalArticle.slug}
          articleAuthorId={finalArticle.author_id}
          userId={userId}
        />

        {/* Article Content */}
        <article 
          className="article-content" 
          dangerouslySetInnerHTML={{ __html: finalArticle.content }} 
          dir="rtl"
        />
        
        {/* Comments Section */}
        <CommentsSection
          articleId={finalArticle.id}
          articleTitle={finalArticle.title}
          articleSlug={finalArticle.slug}
          articleAuthorId={finalArticle.author_id}
          userId={userId}
        />
        
      </main>
    </>
  );
}