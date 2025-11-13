export interface ArticleWithAuthor {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  author_id: string;
  reading_time?: number;
  tag?: string;
  content?: string;
  authorName: string;
  authorAvatar?: string;
  comments_count: number;
  likes_count: number;
}

