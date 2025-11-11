-- Follow authors and notification preferences

-- 1) Author follow graph ------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notify_on_publish BOOLEAN DEFAULT false NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (follower_id, author_id),
  CHECK (follower_id <> author_id)
);

ALTER TABLE profile_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers can manage their follows"
ON profile_follows
FOR ALL
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Authors can view who follows them"
ON profile_follows
FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

-- 2) Per-profile notification preferences -------------------------------------
CREATE TABLE IF NOT EXISTS profile_notification_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  pref_email BOOLEAN DEFAULT false NOT NULL,
  on_publish BOOLEAN DEFAULT true NOT NULL,
  on_comment BOOLEAN DEFAULT true NOT NULL,
  on_like BOOLEAN DEFAULT false NOT NULL,
  on_follow BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE profile_notification_settings
  DROP COLUMN IF EXISTS pref_in_app,
  DROP COLUMN IF EXISTS pref_sms;

ALTER TABLE profile_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their notification settings"
ON profile_notification_settings
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

CREATE POLICY "Users can upsert their notification settings"
ON profile_notification_settings
FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- 3) Workflow events queue (optional but ready for future edge function) -------
CREATE TABLE IF NOT EXISTS notification_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- publish/comment/like/follow
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending/processing/completed/failed
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS notification_events_status_idx ON notification_events(status, created_at);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role processes notification events"
ON notification_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can enqueue notification events"
ON notification_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id);

-- 4) Delivery audit for external channels (email only for now) -----------------
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES notification_events(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL, -- currently only 'email'
  destination TEXT,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending/sent/failed
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS notification_deliveries_event_idx ON notification_deliveries(event_id, channel);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage delivery audit"
ON notification_deliveries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

