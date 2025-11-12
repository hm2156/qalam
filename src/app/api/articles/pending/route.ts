import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const REVIEWER_EMAILS = (
  process.env.REVIEWER_EMAILS ||
  process.env.NEXT_PUBLIC_REVIEWER_EMAILS ||
  ''
)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isReviewer(email: string | undefined | null): boolean {
  if (!email) return false;
  return REVIEWER_EMAILS.includes(email.toLowerCase());
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length);
  const { data: userData, error: tokenError } = await supabaseAdmin.auth.getUser(token);

  if (tokenError || !userData?.user) {
    return NextResponse.json({ error: 'auth_error' }, { status: 401 });
  }

  const user = userData.user;

  if (!isReviewer(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, created_at, review_submitted_at, author_id, status, content, review_notes')
    .eq('status', 'pending_review')
    .order('review_submitted_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending articles:', error);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }

  const payload = await Promise.all(
    (data || []).map(async (article) => {
      let authorDisplayName: string | null = null;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name')
        .eq('id', article.author_id)
        .maybeSingle();

      if (profile?.display_name) {
        authorDisplayName = profile.display_name;
      }

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        created_at: article.created_at,
        review_submitted_at: article.review_submitted_at,
        status: article.status,
        author_id: article.author_id,
        author_display_name: authorDisplayName,
        content: article.content,
        review_notes: article.review_notes,
      };
    })
  );

  return NextResponse.json({ items: payload });
}

