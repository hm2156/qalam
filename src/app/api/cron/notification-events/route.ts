import { NextResponse } from 'next/server';
import { processPendingNotificationEvents } from '../../notification-events/process/route';

const CRON_SECRET = process.env.NOTIFICATION_CRON_SECRET;

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  return querySecret === CRON_SECRET;
}

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'cron_secret_not_set' }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingNotificationEvents();
    return NextResponse.json(result);
  } catch (error) {
    if ((error as Error).message === 'failed_to_fetch_events') {
      return NextResponse.json({ error: 'failed_to_fetch_events' }, { status: 500 });
    }

    console.error('Cron notification processor error:', error);
    return NextResponse.json({ error: 'unhandled_error' }, { status: 500 });
  }
}
