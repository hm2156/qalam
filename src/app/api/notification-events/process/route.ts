import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase/admin';
import { sendEmailNotification } from '../../../../lib/notifications/delivery';

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://example.com';

const DEFAULT_SETTINGS = {
  pref_email: false,
  on_publish: true,
  on_comment: true,
  on_like: false,
  on_follow: true,
};

interface RecipientContact {
  email: string | null;
  displayName: string | null;
}

const recipientCache = new Map<string, RecipientContact>();
const profileNameCache = new Map<string, string | null>();

const COLORS = {
  text: '#242424',
  textLight: '#6B6B6B',
  textMuted: '#757575',
  green: '#1A8917',
  background: '#FFFFFF',
  border: '#F2F2F2',
  highlight: '#FFC017',
};

const FONTS = {
  serif: "'Aref Ruqaa', 'Scheherazade New', 'Arabic Typesetting', 'Traditional Arabic', Georgia, serif",
  sans: "'Almarai', 'Cairo', 'Noto Sans Arabic', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

async function getRecipientContact(profileId: string): Promise<RecipientContact> {
  if (recipientCache.has(profileId)) {
    return recipientCache.get(profileId)!;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', profileId)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching recipient profile:', profileError);
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profileId);

  if (authError) {
    console.error('Error fetching auth user for recipient:', authError);
  }

  const contact: RecipientContact = {
    email: authUser?.user?.email ?? null,
    displayName: profile?.display_name ?? authUser?.user?.user_metadata?.full_name ?? null,
  };

  recipientCache.set(profileId, contact);
  return contact;
}

async function getProfileDisplayName(profileId: string | null | undefined): Promise<string | null> {
  if (!profileId) return null;
  if (profileNameCache.has(profileId)) {
    return profileNameCache.get(profileId)!;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile display name:', error);
  }

  const displayName = data?.display_name ?? null;
  profileNameCache.set(profileId, displayName);
  return displayName;
}

function buildEmailShell(content: string) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Almarai:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#F7F4ED;font-family:${FONTS.sans};direction:rtl;">
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#F7F4ED;">
      <tr>
        <td align="center" style="padding:0;">
          
          <!-- Qalam Header -->
          <table role="presentation" style="max-width:680px;width:100%;margin:50px auto 0;">
            <tr>
              <td style="padding:0 20px 40px;text-align:center;">
                <h1 style="margin:0;font-size:42px;font-weight:400;font-family:${FONTS.serif};color:${COLORS.text};">قَلم</h1>
              </td>
            </tr>
          </table>

          <!-- Content Card -->
          <table role="presentation" style="max-width:680px;width:100%;background:${COLORS.background};margin:0 auto;">
            ${content}
          </table>

          <!-- Footer -->
          <table role="presentation" style="max-width:680px;width:100%;margin:0 auto;">
            <tr>
              <td style="padding:40px 20px;text-align:center;">
                <p style="margin:0 0 12px;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};line-height:1.6;">
                  <a href="${APP_BASE_URL}" style="color:${COLORS.text};text-decoration:none;margin:0 8px;">قَلم</a>
                  <span style="color:${COLORS.border};">·</span>
                  <a href="${APP_BASE_URL}/settings/notifications" style="color:${COLORS.textMuted};text-decoration:none;margin:0 8px;">تعديل الإشعارات</a>
                 
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildPublishEmail(options: {
  recipientName: string;
  authorName: string;
  articleTitle: string;
  excerpt: string;
  articleUrl: string;
}) {
  const { recipientName, authorName, articleTitle, excerpt, articleUrl } = options;
  
  const content = `
    <tr>
      <td style="padding:50px 50px 60px;">
        
        <!-- Author info -->
        <table role="presentation" width="100%" style="margin-bottom:32px;">
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:48px;height:48px;background:${COLORS.text};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                  <span style="color:${COLORS.background};font-weight:500;font-size:18px;font-family:${FONTS.sans};">${authorName.charAt(0)}</span>
                </div>
                <div style="display:inline-block;vertical-align:middle;margin-right:12px;">
                  <p style="margin:0;font-size:15px;font-weight:500;color:${COLORS.text};font-family:${FONTS.sans};">${authorName}</p>
                  <p style="margin:4px 0 0;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};">نشر مقالاً جديداً</p>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Article title -->
        <h2 style="margin:0 0 24px;font-size:32px;font-weight:700;color:${COLORS.text};font-family:${FONTS.serif};line-height:1.3;letter-spacing:-0.5px;">${articleTitle}</h2>
        
        <!-- Article excerpt -->
        <p style="margin:0 0 32px;font-size:18px;color:${COLORS.textLight};line-height:1.7;font-family:${FONTS.sans};">${excerpt}</p>
        
        <!-- Divider -->
        <div style="height:1px;background:${COLORS.border};margin:40px 0;"></div>
        
        <!-- CTA -->
        <a href="${articleUrl}" style="display:inline-block;padding:12px 24px;background:${COLORS.text};color:${COLORS.background};text-decoration:none;font-size:16px;font-weight:500;border-radius:4px;font-family:${FONTS.sans};">اقرأ المقال</a>
        
      </td>
    </tr>
  `;
  
  return buildEmailShell(content);
}

function buildCommentEmail(options: {
  recipientName: string;
  commenterName: string;
  articleTitle: string;
  commentExcerpt: string;
  articleUrl: string;
}) {
  const { recipientName, commenterName, articleTitle, commentExcerpt, articleUrl } = options;
  
  const content = `
    <tr>
      <td style="padding:50px 50px 60px;">
        
        <!-- Notification type -->
        <p style="margin:0 0 24px;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};text-transform:uppercase;letter-spacing:0.5px;">تعليق جديد</p>
        
        <!-- Commenter info -->
        <table role="presentation" width="100%" style="margin-bottom:28px;">
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:${COLORS.text};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                  <span style="color:${COLORS.background};font-weight:500;font-size:16px;font-family:${FONTS.sans};">${commenterName.charAt(0)}</span>
                </div>
                <div style="display:inline-block;vertical-align:middle;margin-right:12px;">
                  <p style="margin:0;font-size:16px;font-weight:500;color:${COLORS.text};font-family:${FONTS.sans};">${commenterName}</p>
                  <p style="margin:4px 0 0;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};">علّق على مقالك</p>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Article title as link -->
        <p style="margin:0 0 20px;font-size:15px;color:${COLORS.textLight};font-family:${FONTS.sans};">
          على: <a href="${articleUrl}" style="color:${COLORS.text};text-decoration:none;font-weight:500;">${articleTitle}</a>
        </p>
        
        <!-- Comment content -->
        <div style="padding:24px;background:#FAFAFA;border-right:3px solid ${COLORS.text};margin:24px 0;">
          <p style="margin:0;font-size:17px;color:${COLORS.text};line-height:1.7;font-family:${FONTS.sans};font-style:italic;">"${commentExcerpt}"</p>
        </div>
        
        <!-- Divider -->
        <div style="height:1px;background:${COLORS.border};margin:40px 0;"></div>
        
        <!-- CTA -->
        <a href="${articleUrl}" style="display:inline-block;padding:12px 24px;background:${COLORS.text};color:${COLORS.background};text-decoration:none;font-size:16px;font-weight:500;border-radius:4px;font-family:${FONTS.sans};">عرض التعليق والرد</a>
        
      </td>
    </tr>
  `;
  
  return buildEmailShell(content);
}

function buildLikeEmail(options: {
  recipientName: string;
  likerName: string;
  articleTitle: string;
  articleUrl: string;
}) {
  const { recipientName, likerName, articleTitle, articleUrl } = options;
  
  const content = `
    <tr>
      <td style="padding:50px 50px 60px;">
        
        <!-- Notification type -->
        <p style="margin:0 0 24px;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};text-transform:uppercase;letter-spacing:0.5px;">إعجاب جديد</p>
        
        <!-- Liker info -->
        <table role="presentation" width="100%" style="margin-bottom:28px;">
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:${COLORS.text};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                  <span style="color:${COLORS.background};font-weight:500;font-size:16px;font-family:${FONTS.sans};">${likerName.charAt(0)}</span>
                </div>
                <div style="display:inline-block;vertical-align:middle;margin-right:12px;">
                  <p style="margin:0;font-size:16px;font-weight:500;color:${COLORS.text};font-family:${FONTS.sans};">${likerName}</p>
                  <p style="margin:4px 0 0;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};">أعجب بمقالك</p>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Article title -->
        <h3 style="margin:0 0 32px;font-size:24px;font-weight:600;color:${COLORS.text};font-family:${FONTS.serif};line-height:1.4;">${articleTitle}</h3>
        
        <!-- Encouragement message -->
        <p style="margin:0 0 32px;font-size:17px;color:${COLORS.textLight};line-height:1.7;font-family:${FONTS.sans};">
          مقالاتك تلقى صدى لدى القرّاء. استمر في الكتابة ومشاركة أفكارك.
        </p>
        
        <!-- Divider -->
        <div style="height:1px;background:${COLORS.border};margin:40px 0;"></div>
        
        <!-- CTA -->
        <a href="${articleUrl}" style="display:inline-block;padding:12px 24px;background:${COLORS.text};color:${COLORS.background};text-decoration:none;font-size:16px;font-weight:500;border-radius:4px;font-family:${FONTS.sans};">مشاهدة المقال</a>
        
      </td>
    </tr>
  `;
  
  return buildEmailShell(content);
}

function buildFollowEmail(options: {
  recipientName: string;
  followerName: string;
  followerUrl: string;
}) {
  const { recipientName, followerName, followerUrl } = options;
  
  const content = `
    <tr>
      <td style="padding:50px 50px 60px;">
        
        <!-- Notification type -->
        <p style="margin:0 0 24px;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};text-transform:uppercase;letter-spacing:0.5px;">متابع جديد</p>
        
        <!-- Follower info -->
        <table role="presentation" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="width:48px;vertical-align:middle;">
              <table role="presentation" style="width:48px;height:48px;background:${COLORS.text};border-radius:50%;">
                <tr>
                  <td style="text-align:center;vertical-align:middle;">
                    <span style="color:${COLORS.background};font-weight:500;font-size:18px;font-family:${FONTS.sans};line-height:1;">${followerName.charAt(0)}</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="padding-right:12px;vertical-align:middle;">
              <p style="margin:0;font-size:18px;font-weight:500;color:${COLORS.text};font-family:${FONTS.sans};">${followerName}</p>
              <p style="margin:4px 0 0;font-size:14px;color:${COLORS.textMuted};font-family:${FONTS.sans};">بدأ بمتابعتك</p>
            </td>
          </tr>
        </table>
        <!-- Message -->
        <p style="margin:32px 0;font-size:17px;color:${COLORS.textLight};line-height:1.7;font-family:${FONTS.sans};">
          لديك الآن قارئ جديد سيصله إشعار بكل مقال تنشره. استمر في مشاركة كتاباتك.
        </p>
        
        <!-- Divider -->
        <div style="height:1px;background:${COLORS.border};margin:40px 0;"></div>
        
        <!-- CTA -->
        <a href="${followerUrl}" style="display:inline-block;padding:12px 24px;background:${COLORS.text};color:${COLORS.background};text-decoration:none;font-size:16px;font-weight:500;border-radius:4px;font-family:${FONTS.sans};">عرض الملف الشخصي</a>
        
      </td>
    </tr>
  `;
  
  return buildEmailShell(content);
}

function buildPlainTextPublish(options: { authorName: string; articleTitle: string; excerpt: string; articleUrl: string }) {
  return `${options.authorName} نشر مقالاً جديداً على قَلَم

${options.articleTitle}

${options.excerpt}

اقرأ المقال:
${options.articleUrl}

────────────────────────

قَلم - منصة الكتابة العربية
تعديل الإشعارات: ${APP_BASE_URL}/settings/notifications`;
}

function buildPlainTextComment(options: { commenterName: string; articleTitle: string; commentExcerpt: string; articleUrl: string }) {
  return `${options.commenterName} علّق على مقالك

على: ${options.articleTitle}

"${options.commentExcerpt}"

عرض التعليق والرد:
${options.articleUrl}

────────────────────────

قَلم - منصة الكتابة العربية
تعديل الإشعارات: ${APP_BASE_URL}/settings/notifications`;
}

function buildPlainTextLike(options: { likerName: string; articleTitle: string; articleUrl: string }) {
  return `${options.likerName} أعجب بمقالك

${options.articleTitle}

مقالاتك تلقى صدى لدى القرّاء. استمر في الكتابة.

مشاهدة المقال:
${options.articleUrl}

────────────────────────

قَلم - منصة الكتابة العربية
تعديل الإشعارات: ${APP_BASE_URL}/settings/notifications`;
}

function buildPlainTextFollow(options: { followerName: string; followerUrl: string }) {
  return `${options.followerName} بدأ بمتابعتك على قَلَم

لديك الآن قارئ جديد سيصله إشعار بكل مقال تنشره.

عرض الملف الشخصي:
${options.followerUrl}

────────────────────────

قَلم - منصة الكتابة العربية
تعديل الإشعارات: ${APP_BASE_URL}/settings/notifications`;
}

function buildNotificationContent(event: any, recipient: RecipientContact, authorName: string | null) {
  const recipientName = recipient.displayName ?? 'عزيزي القارئ';
  const actor = authorName ?? 'مستخدم';
  
  switch (event.event_type) {
    case 'comment': {
      const articleTitle = event.payload?.article_title ?? 'مقالك';
      const articleSlug = event.payload?.article_slug;
      const commentExcerpt = event.payload?.comment_excerpt ?? 'تم إضافة تعليق جديد.';
      const articleUrl = articleSlug ? `${APP_BASE_URL}/article/${articleSlug}` : APP_BASE_URL;
      
      return {
        subject: `${actor} علّق على مقالك`,
        text: buildPlainTextComment({ commenterName: actor, articleTitle, commentExcerpt, articleUrl }),
        html: buildCommentEmail({ recipientName, commenterName: actor, articleTitle, commentExcerpt, articleUrl }),
      };
    }
    
    case 'like': {
      const articleTitle = event.payload?.article_title ?? 'مقالك';
      const articleSlug = event.payload?.article_slug;
      const articleUrl = articleSlug ? `${APP_BASE_URL}/article/${articleSlug}` : APP_BASE_URL;
      
      return {
        subject: `${actor} أعجب بمقالك`,
        text: buildPlainTextLike({ likerName: actor, articleTitle, articleUrl }),
        html: buildLikeEmail({ recipientName, likerName: actor, articleTitle, articleUrl }),
      };
    }
    
    case 'follow': {
      const followerUrl = `${APP_BASE_URL}/author/${event.actor_id ?? ''}`;
      
      return {
        subject: `${actor} بدأ بمتابعتك`,
        text: buildPlainTextFollow({ followerName: actor, followerUrl }),
        html: buildFollowEmail({ recipientName, followerName: actor, followerUrl }),
      };
    }
    
    case 'publish':
    default: {
      const articleTitle = event.payload?.article_title ?? 'مقال جديد';
      const articleSlug = event.payload?.article_slug;
      const excerpt = event.payload?.excerpt ?? 'اكتشف هذا المقال الجديد.';
      const articleUrl = articleSlug ? `${APP_BASE_URL}/article/${articleSlug}` : APP_BASE_URL;
      
      return {
        subject: `${actor}: ${articleTitle}`,
        text: buildPlainTextPublish({ authorName: actor, articleTitle, excerpt, articleUrl }),
        html: buildPublishEmail({ recipientName, authorName: actor, articleTitle, excerpt, articleUrl }),
      };
    }
  }
}

interface ProcessNotificationsResult {
  processed: number;
  failed: Array<{ id: number; reason: string }>;
  skipped: number;
  total: number;
  message?: string;
}

export async function processPendingNotificationEvents(): Promise<ProcessNotificationsResult> {
  const { data: events, error } = await supabaseAdmin
    .from('notification_events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching notification events:', error);
    throw new Error('failed_to_fetch_events');
  }

  if (!events || events.length === 0) {
    return { processed: 0, failed: [], skipped: 0, total: 0, message: 'no_pending_events' };
  }

  let processedCount = 0;
  let skippedCount = 0;
  const failedEvents: Array<{ id: number; reason: string }> = [];

  for (const event of events) {
    try {
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('profile_notification_settings')
        .select('pref_email, on_publish, on_comment, on_like, on_follow')
        .eq('profile_id', event.recipient_id)
        .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      const settings = settingsData ?? DEFAULT_SETTINGS;

      const isEventEnabled = (() => {
        switch (event.event_type) {
          case 'publish':
            return settings.on_publish ?? true;
          case 'comment':
            return settings.on_comment ?? true;
          case 'like':
            return settings.on_like ?? false;
          case 'follow':
            return settings.on_follow ?? true;
          default:
            return true;
        }
      })();

      if (!isEventEnabled) {
        await supabaseAdmin
          .from('notification_events')
          .update({ status: 'skipped', processed_at: new Date().toISOString(), error: 'event_disabled' })
          .eq('id', event.id);
        skippedCount += 1;
        continue;
      }

      if (!settings.pref_email) {
        await supabaseAdmin
          .from('notification_events')
          .update({ status: 'skipped', processed_at: new Date().toISOString(), error: 'email_disabled' })
          .eq('id', event.id);
        skippedCount += 1;
        continue;
      }

      const recipientContact = await getRecipientContact(event.recipient_id);
      const authorName = await getProfileDisplayName(event.actor_id);
      const content = buildNotificationContent(event, recipientContact, authorName);

      if (!recipientContact.email) {
        await supabaseAdmin
          .from('notification_deliveries')
          .insert({
            event_id: event.id,
            channel: 'email',
            destination: null,
            status: 'failed',
            error: 'no_email_on_file',
          });

        await supabaseAdmin
          .from('notification_events')
          .update({ status: 'failed', processed_at: new Date().toISOString(), error: 'no_email_on_file' })
          .eq('id', event.id);

        failedEvents.push({ id: event.id, reason: 'no_email_on_file' });
        continue;
      }

      const emailResult = await sendEmailNotification({
        to: recipientContact.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });

      await supabaseAdmin
        .from('notification_deliveries')
        .insert({
          event_id: event.id,
          channel: 'email',
          destination: recipientContact.email,
          status: emailResult.success ? 'sent' : 'failed',
          error: emailResult.error ?? null,
          sent_at: emailResult.success ? new Date().toISOString() : null,
        });

      await supabaseAdmin
        .from('notification_events')
        .update({
          status: emailResult.success ? 'completed' : 'failed',
          processed_at: new Date().toISOString(),
          error: emailResult.error ?? null,
        })
        .eq('id', event.id);

      if (emailResult.success) {
        processedCount += 1;
      } else {
        failedEvents.push({ id: event.id, reason: emailResult.error ?? 'email_failed' });
      }
    } catch (eventError) {
      console.error(`Error processing notification event ${event.id}:`, eventError);
      failedEvents.push({ id: event.id, reason: (eventError as Error).message ?? 'unknown' });
      await supabaseAdmin
        .from('notification_events')
        .update({ status: 'failed', processed_at: new Date().toISOString(), error: (eventError as Error).message ?? 'unknown' })
        .eq('id', event.id);
    }
  }

  return { processed: processedCount, failed: failedEvents, skipped: skippedCount, total: events.length };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length);
  const { data: userData, error: tokenError } = await supabaseAdmin.auth.getUser(token);

  if (tokenError) {
    console.error('Error verifying user for notification processing:', tokenError);
    return NextResponse.json({ error: 'auth_error' }, { status: 401 });
  }

  if (!userData?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingNotificationEvents();

    if (result.message === 'no_pending_events') {
      return NextResponse.json({ processed: 0, message: result.message });
    }

    return NextResponse.json(result);
  } catch (error) {
    if ((error as Error).message === 'failed_to_fetch_events') {
      return NextResponse.json({ error: 'failed_to_fetch_events' }, { status: 500 });
    }

    console.error('Unhandled error processing notification events:', error);
    return NextResponse.json({ error: 'unhandled_error' }, { status: 500 });
  }
}