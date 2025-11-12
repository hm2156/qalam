import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmailNotification } from '@/lib/notifications/delivery';
import { processPendingNotificationEvents } from '../../notification-events/process/route';

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://example.com';

const reviewerEnv =
  process.env.REVIEWER_EMAILS ||
  process.env.NEXT_PUBLIC_REVIEWER_EMAILS ||
  '';

const REVIEWER_EMAILS_RAW = reviewerEnv
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

const REVIEWER_EMAILS = REVIEWER_EMAILS_RAW.map((email) => email.toLowerCase());

type ReviewAction = 'submit' | 'revert' | 'approve' | 'reject';

interface ReviewActionRequest {
  articleId: number;
  action: ReviewAction;
  reviewNotes?: string | null;
}

function isReviewer(email: string | undefined | null): boolean {
  if (!email) return false;
  return REVIEWER_EMAILS.includes(email.toLowerCase());
}

async function queuePublishNotifications(articleId: number, authorId: string, articleTitle: string, articleSlug: string) {
  const { data: followers, error: followersError } = await supabaseAdmin
    .from('profile_follows')
    .select('follower_id')
    .eq('author_id', authorId)
    .eq('notify_on_publish', true);

  if (followersError) {
    console.error('Error fetching followers for publish notifications:', followersError);
    return;
  }

  if (!followers || followers.length === 0) {
    return;
  }

  const events = followers.map((follower) => ({
    event_type: 'publish',
    actor_id: authorId,
    article_id: articleId,
    recipient_id: follower.follower_id,
    payload: {
      article_title: articleTitle,
      article_slug: articleSlug,
    },
  }));

  const { error: enqueueError } = await supabaseAdmin
    .from('notification_events')
    .insert(events);

  if (enqueueError) {
    console.error('Error enqueueing publish notification events:', enqueueError);
  }
}

async function getAuthorContact(authorId: string): Promise<{ email: string | null; name: string }> {
  const [{ data: profile }, { data: authorUser }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', authorId)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(authorId),
  ]);

  const email = authorUser?.user?.email ?? null;
  const name =
    profile?.display_name ??
    authorUser?.user?.user_metadata?.full_name ??
    'كاتبنا العزيز';

  return { email, name };
}

async function sendApprovalEmail(authorEmail: string, authorName: string, articleTitle: string, articleSlug: string, reviewNotes?: string | null) {
  const articleUrl = `${APP_BASE_URL}/article/${articleSlug}`;

  const subject = 'تم نشر مقالتك على قَلَم';
  const textLines = [
    `${authorName},`,
    '',
    'يسعدنا إبلاغك بأن فريق التحرير اعتمد مقالتك وتم نشرها على منصة قَلَم.',
    '',
    `العنوان: ${articleTitle}`,
    `الرابط: ${articleUrl}`,
  ];

  if (reviewNotes) {
    textLines.push('', 'ملاحظات المحرر:', reviewNotes);
  }

  textLines.push('', 'نتطلع إلى المزيد من إبداعاتك.', '', 'فريق قَلَم');

  const htmlNotesBlock = reviewNotes
    ? `<div style="margin:0 0 24px;padding:16px;border:1px solid #E5E5E5;border-radius:8px;background:#FAFAFA;"><p style="margin:0;font-size:15px;color:#4A4A4A;line-height:1.7;">${reviewNotes.replace(
        /\n/g,
        '<br />'
      )}</p></div>`
    : '';

  const html = `
    <div style="font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;text-align:right;background-color:#F7F4ED;padding:32px 0;">
      <table role="presentation" style="max-width:640px;width:100%;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:48px;">
            <h1 style="margin-top:0;margin-bottom:24px;font-family:'Aref Ruqaa','Arabic Typesetting','Traditional Arabic',serif;font-size:32px;color:#242424;">قَلَم</h1>
            <p style="margin:0 0 18px;font-size:17px;color:#242424;">${authorName} العزيز،</p>
            <p style="margin:0 0 18px;font-size:16px;color:#4A4A4A;line-height:1.8;">
              يسعدنا إبلاغك بأن فريق التحرير اعتمد مقالتك
              <strong style="color:#242424;">«${articleTitle}»</strong>
              وتم نشرها الآن على منصة قَلَم.
            </p>
            ${htmlNotesBlock}
            <p style="margin:0 0 24px;font-size:16px;color:#4A4A4A;line-height:1.8;">
              يمكنك الاطلاع عليها ومشاركتها مع قرائك عبر الرابط التالي:
            </p>
            <p style="margin:0 0 32px;">
              <a href="${articleUrl}" style="display:inline-block;padding:12px 24px;background:#242424;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:16px;">مشاهدة المقال</a>
            </p>
            <p style="margin:0 0 18px;font-size:16px;color:#4A4A4A;">
              نتطلع دائماً لمزيد من إبداعاتك وكتاباتك الملهمة.
            </p>
            <p style="margin:0;font-size:15px;color:#4A4A4A;">فريق قَلَم</p>
          </td>
        </tr>
      </table>
      <p style="text-align:center;color:#999999;font-size:12px;margin-top:24px;">
        تم إرسال هذا البريد الإلكتروني تلقائياً من منصة قَلَم.
      </p>
    </div>
  `;

  const emailResult = await sendEmailNotification({
    to: authorEmail,
    subject,
    text: textLines.join('\n'),
    html,
  });

  if (!emailResult.success) {
    console.error('Failed to send approval email:', emailResult.error);
  }
}

async function sendReviewerSubmissionEmails(options: {
  articleId: number;
  articleTitle: string;
  authorName: string;
  submittedAt: string;
}) {
  if (REVIEWER_EMAILS_RAW.length === 0) {
    return;
  }

  const { articleId, articleTitle, authorName, submittedAt } = options;
  const dashboardUrl = `${APP_BASE_URL}/dashboard`;

  await Promise.all(
    REVIEWER_EMAILS_RAW.map(async (email) => {
      const subject = `مقال جديد بانتظار المراجعة: ${articleTitle}`;
      const submittedDate = new Date(submittedAt).toLocaleString('ar-EG', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      const text = [
        `يوجد مقال جديد بانتظار المراجعة.`,
        '',
        `العنوان: ${articleTitle}`,
        `الكاتب: ${authorName}`,
        `رقم المقال: ${articleId}`,
        `تاريخ الإرسال: ${submittedDate}`,
        '',
        `راجع لوحة التحكم: ${dashboardUrl}`,
      ].join('\n');

      const html = `
        <div style="font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;text-align:right;background-color:#F3F0E8;padding:32px 0;">
          <table role="presentation" style="max-width:620px;width:100%;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:40px;">
                <h2 style="margin-top:0;margin-bottom:18px;font-family:'Aref Ruqaa','Scheherazade New',serif;font-weight:400;font-size:28px;color:#242424;">مقال بانتظار المراجعة</h2>
                <p style="margin:0 0 14px;font-size:16px;color:#4A4A4A;line-height:1.8;">
                  وصلت مقالة جديدة تحتاج إلى اعتمادك قبل نشرها.
                </p>
                <table role="presentation" style="width:100%;margin:0 0 24px;background:#FAF7F1;border-radius:10px;padding:16px;">
                  <tr><td style="font-size:15px;color:#242424;"><strong>العنوان:</strong> ${articleTitle}</td></tr>
                  <tr><td style="font-size:15px;color:#242424;"><strong>الكاتب:</strong> ${authorName}</td></tr>
                  <tr><td style="font-size:15px;color:#242424;"><strong>رقم المقال:</strong> ${articleId}</td></tr>
                  <tr><td style="font-size:15px;color:#242424;"><strong>تاريخ الإرسال:</strong> ${submittedDate}</td></tr>
                </table>
                <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;">توجه إلى لوحة التحكم لمراجعة المقالة وإرسال ملاحظاتك أو اعتمادها.</p>
                <p style="margin:0;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:12px 22px;background:#242424;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:15px;">الانتقال إلى لوحة المراجعة</a>
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      const emailResult = await sendEmailNotification({
        to: email,
        subject,
        text,
        html,
      });

      if (!emailResult.success) {
        console.error('Failed to send reviewer submission email:', emailResult.error);
      }
    })
  );
}

async function sendRejectionEmail(authorEmail: string, authorName: string, articleTitle: string, reviewNotes: string) {
  const subject = 'حالة مقالتك على قَلَم';
  const text = [
    `${authorName},`,
    '',
    'نشكر لك ثقتك بقَلَم. راجع فريق التحرير مقالتك ووجد أنها بحاجة إلى بعض التعديلات قبل نشرها.',
    '',
    `العنوان: ${articleTitle}`,
    '',
    'ملاحظات المحرر:',
    reviewNotes,
    '',
    'يمكنك تعديل المقالة وإعادة إرسالها للمراجعة من خلال لوحة التحكم.',
    '',
    'فريق قَلَم',
  ].join('\n');

  const html = `
    <div style="font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;text-align:right;background-color:#F7F4ED;padding:32px 0;">
      <table role="presentation" style="max-width:640px;width:100%;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:48px;">
            <h1 style="margin-top:0;margin-bottom:24px;font-family:'Aref Ruqaa','Arabic Typesetting','Traditional Arabic',serif;font-size:32px;color:#BA1A1A;">قَلَم</h1>
            <p style="margin:0 0 18px;font-size:17px;color:#242424;">${authorName} العزيز،</p>
            <p style="margin:0 0 18px;font-size:16px;color:#4A4A4A;line-height:1.8;">
              شكرًا لإرسالك مقالتك
              <strong style="color:#242424;">«${articleTitle}»</strong>
              إلى فريق قَلَم. بعد المراجعة، نحتاج إلى بعض التعديلات قبل نشرها.
            </p>
            <div style="margin:0 0 24px;padding:16px;border:1px solid #E5E5E5;border-radius:8px;background:#FAFAFA;">
              <p style="margin:0;font-size:15px;color:#4A4A4A;line-height:1.8;">${reviewNotes.replace(
                /\n/g,
                '<br />'
              )}</p>
            </div>
            <p style="margin:0 0 18px;font-size:16px;color:#4A4A4A;line-height:1.8;">
              يمكنك تعديل المقالة وإعادة إرسالها للمراجعة من خلال لوحة التحكم في حسابك.
            </p>
            <p style="margin:0;font-size:15px;color:#4A4A4A;">فريق قَلَم</p>
          </td>
        </tr>
      </table>
      <p style="text-align:center;color:#999999;font-size:12px;margin-top:24px;">
        تم إرسال هذا البريد الإلكتروني تلقائياً من منصة قَلَم.
      </p>
    </div>
  `;

  const emailResult = await sendEmailNotification({
    to: authorEmail,
    subject,
    text,
    html,
  });

  if (!emailResult.success) {
    console.error('Failed to send rejection email:', emailResult.error);
  }
}

export async function POST(request: Request) {
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

  let body: ReviewActionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.articleId || !body?.action) {
    return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
  }

  if (!['submit', 'revert', 'approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }

  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, author_id, status, title, slug, review_submitted_at, content')
    .eq('id', body.articleId)
    .maybeSingle();

  if (articleError) {
    console.error('Error fetching article for review workflow:', articleError);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }

  if (!article) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  try {
    switch (body.action as ReviewAction) {
      case 'submit': {
        if (article.author_id !== user.id) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }

        if (article.status === 'published') {
          return NextResponse.json({ error: 'already_published' }, { status: 400 });
        }

        const { error: submitError } = await supabaseAdmin
          .from('articles')
          .update({
            status: 'pending_review',
            review_submitted_at: now,
            review_notes: body.reviewNotes?.trim() || null,
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq('id', article.id);

        if (submitError) {
          console.error('Error submitting article for review:', submitError);
          return NextResponse.json({ error: 'submit_failed' }, { status: 500 });
        }

        if (REVIEWER_EMAILS_RAW.length > 0) {
          try {
            const { name: authorName } = await getAuthorContact(article.author_id);
            await sendReviewerSubmissionEmails({
              articleId: article.id,
              articleTitle: article.title,
              authorName,
              submittedAt: now,
            });
          } catch (notifyError) {
            console.error('Error notifying reviewers of submission:', notifyError);
          }
        }

        return NextResponse.json({ ok: true, status: 'pending_review' });
      }

      case 'revert': {
        const canRevert = article.author_id === user.id || isReviewer(user.email);

        if (!canRevert) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }

        const { error: revertError } = await supabaseAdmin
          .from('articles')
          .update({
            status: 'draft',
            review_submitted_at: null,
            reviewed_at: null,
            reviewed_by: null,
            review_notes: body.reviewNotes?.trim() || null,
          })
          .eq('id', article.id);

        if (revertError) {
          console.error('Error reverting article to draft:', revertError);
          return NextResponse.json({ error: 'revert_failed' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, status: 'draft' });
      }

      case 'approve': {
        if (!isReviewer(user.email)) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }

        if (article.status !== 'pending_review' && article.status !== 'draft' && article.status !== 'rejected') {
          return NextResponse.json({ error: 'invalid_status_transition' }, { status: 400 });
        }

        const reviewNotes = body.reviewNotes?.trim() || null;

        const { error: approveError } = await supabaseAdmin
          .from('articles')
          .update({
            status: 'published',
            reviewed_at: now,
            reviewed_by: user.id,
            review_notes: reviewNotes,
            review_submitted_at: article.review_submitted_at || now,
          })
          .eq('id', article.id);

        if (approveError) {
          console.error('Error approving article:', approveError);
          return NextResponse.json({ error: 'approve_failed' }, { status: 500 });
        }

        await queuePublishNotifications(article.id, article.author_id, article.title, article.slug);

        const { email: authorEmail, name: authorName } = await getAuthorContact(article.author_id);

        if (authorEmail) {
          await sendApprovalEmail(authorEmail, authorName, article.title, article.slug, reviewNotes);
        } else {
          console.warn('Author email not found, skipping approval email.');
        }

        try {
          await processPendingNotificationEvents();
        } catch (processorError) {
          console.error('Error running notification processor after article approval:', processorError);
        }

        return NextResponse.json({ ok: true, status: 'published' });
      }

      case 'reject': {
        if (!isReviewer(user.email)) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }

        if (article.status !== 'pending_review') {
          return NextResponse.json({ error: 'invalid_status_transition' }, { status: 400 });
        }

        const reviewNotes = (body.reviewNotes ?? '').trim();

        if (!reviewNotes) {
          return NextResponse.json({ error: 'review_notes_required' }, { status: 400 });
        }

        const { error: rejectError } = await supabaseAdmin
          .from('articles')
          .update({
            status: 'rejected',
            reviewed_at: now,
            reviewed_by: user.id,
            review_notes: reviewNotes,
            review_submitted_at: article.review_submitted_at || now,
          })
          .eq('id', article.id);

        if (rejectError) {
          console.error('Error rejecting article:', rejectError);
          return NextResponse.json({ error: 'reject_failed' }, { status: 500 });
        }

        const { email: authorEmail, name: authorName } = await getAuthorContact(article.author_id);

        if (authorEmail) {
          await sendRejectionEmail(authorEmail, authorName, article.title, reviewNotes);
        } else {
          console.warn('Author email not found, skipping rejection email.');
        }

        return NextResponse.json({ ok: true, status: 'rejected' });
      }

      default:
        return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Unexpected review workflow error:', error);
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}

