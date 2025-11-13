'use server';

import { createServerSupabaseClient } from '../../../lib/supabase/server';
import type { ArticleWithAuthor } from '../../types/articles';

type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  author_id: string;
  reading_time?: number | null;
  tag?: string | null;
  content?: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentCountRow = {
  article_id: number;
  comment_count: number;
};

type LikeCountRow = {
  article_id: number;
  like_count: number;
};

const FALLBACK_AUTHOR_NAME = 'كاتب';
const MAX_ARTICLES = 20;

export async function fetchArticlesWithAuthors(tag: string = 'all'): Promise<ArticleWithAuthor[]> {
  const supabase = await createServerSupabaseClient();

  let articlesQuery = supabase
    .from('articles')
    .select('id, title, slug, created_at, author_id, reading_time, tag, content')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(0, MAX_ARTICLES - 1);

  if (tag !== 'all') {
    articlesQuery = articlesQuery.eq('tag', tag);
  }

  const { data: articlesData, error: articlesError } = await articlesQuery as {
    data: ArticleRow[] | null;
    error: unknown;
  };

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
    return [];
  }

  if (!articlesData || articlesData.length === 0) {
    return [];
  }

  const authorIds = Array.from(
    new Set(articlesData.map((article) => article.author_id).filter(Boolean))
  );
  const articleIds = articlesData.map((article) => article.id);

  const [profilesResult, commentsResult, likesResult] = await Promise.all([
    authorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', authorIds)
      : Promise.resolve({ data: [] as ProfileRow[] | null, error: null }),
    articleIds.length > 0
      ? supabase
          .from('comments')
          .select('article_id')
          .in('article_id', articleIds)
          .is('parent_id', null)
      : Promise.resolve({ data: [] as CommentCountRow[] | null, error: null }),
    articleIds.length > 0
      ? supabase
          .from('likes')
          .select('article_id')
          .in('article_id', articleIds)
      : Promise.resolve({ data: [] as LikeCountRow[] | null, error: null }),
  ]);

  if (profilesResult.error) {
    console.error('Error fetching profiles:', profilesResult.error);
  }
  if (commentsResult.error) {
    console.error('Error fetching comments:', commentsResult.error);
  }
  if (likesResult.error) {
    console.error('Error fetching likes:', likesResult.error);
  }

  const profileMap = new Map<string, ProfileRow>();
  (profilesResult.data ?? []).forEach((profile) => {
    const typedProfile = profile as ProfileRow;
    profileMap.set(String(typedProfile.id), typedProfile);
  });

  const commentsCountMap = new Map<number, number>();
  ((commentsResult.data ?? []) as CommentCountRow[]).forEach((row) => {
    commentsCountMap.set(row.article_id, Number(row.comment_count) || 0);
  });

  const likesCountMap = new Map<number, number>();
  ((likesResult.data ?? []) as LikeCountRow[]).forEach((row) => {
    likesCountMap.set(row.article_id, Number(row.like_count) || 0);
  });

  return articlesData.map((article) => {
    const profile = article.author_id ? profileMap.get(String(article.author_id)) : undefined;
    const authorName =
      profile?.display_name?.trim()?.length
        ? profile.display_name.trim()
        : FALLBACK_AUTHOR_NAME;

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      created_at: article.created_at,
      author_id: article.author_id,
      reading_time: article.reading_time ?? undefined,
      tag: article.tag ?? undefined,
      content: article.content ?? undefined,
      authorName,
      authorAvatar: profile?.avatar_url ?? undefined,
      comments_count: commentsCountMap.get(article.id) ?? 0,
      likes_count: likesCountMap.get(article.id) ?? 0,
    };
  });
}

