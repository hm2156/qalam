'use server';

import { createServerSupabaseClient } from '../../../lib/supabase/server';

interface Article {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  author_id: string;
  reading_time?: number;
  tag?: string;
  content?: string;
}

interface AuthorProfile {
  display_name: string;
  avatar_url?: string;
}

export interface ArticleWithAuthor extends Article {
  authorName: string;
  authorAvatar?: string;
  authorBio?: string;
  comments_count: number;
  likes_count: number;
}

export async function fetchArticlesWithAuthors(tag: string = 'all'): Promise<ArticleWithAuthor[]> {
  const supabase = await createServerSupabaseClient();

  // Build base query
  let query = supabase
    .from('articles')
    .select('id, title, slug, created_at, author_id, reading_time, tag, content')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Filter by tag if not 'all'
  if (tag !== 'all') {
    query = query.eq('tag', tag);
  }

  const { data: articlesData, error } = await query;

  if (error || !articlesData || articlesData.length === 0) {
    return [];
  }

  // Fetch author profiles
  const authorIds = [...new Set(articlesData.map(a => a.author_id).filter(Boolean))];
  const profileMap = new Map<string, AuthorProfile>();

  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);

    if (profilesError) {
      console.error('Error fetching profiles in server action:', profilesError);
    }

    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        // Ensure ID is a string for consistent Map key lookup
        const profileId = String(profile.id);
        const displayName = profile.display_name?.trim();
        profileMap.set(profileId, {
          display_name: displayName && displayName.length > 0 ? displayName : 'كاتب',
          avatar_url: profile.avatar_url || undefined
        });
      });
    }
  }

  // Fetch counts for all articles
  const articleIds = articlesData.map(a => a.id);

  // Fetch comment counts
  const { data: commentsData } = await supabase
    .from('comments')
    .select('article_id')
    .in('article_id', articleIds)
    .is('parent_id', null);

  // Fetch like counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('article_id')
    .in('article_id', articleIds);

  // Count comments and likes per article
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

  // Combine articles with author info and counts
  return articlesData.map(article => {
    // Handle null/undefined author_id and ensure string conversion for Map lookup
    const authorId = article.author_id ? String(article.author_id) : null;
    const profile = authorId ? profileMap.get(authorId) : undefined;
    
    // Get author name - prioritize profile display_name, fallback to 'كاتب'
    let authorName = 'كاتب';
    if (profile && profile.display_name) {
      const trimmedName = profile.display_name.trim();
      if (trimmedName.length > 0) {
        authorName = trimmedName;
      }
    }

    return {
      ...article,
      authorName, // Always set authorName, never undefined or empty
      authorAvatar: profile?.avatar_url || undefined,
      authorBio: undefined, // Bio column doesn't exist in profiles table yet
      comments_count: commentsCountMap.get(article.id) || 0,
      likes_count: likesCountMap.get(article.id) || 0,
    };
  });
}

