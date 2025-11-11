'use client';

import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { supabase } from '../../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

type EventKey = 'on_publish' | 'on_comment' | 'on_like' | 'on_follow';

interface NotificationSettings {
  pref_email: boolean;
  on_publish: boolean;
  on_comment: boolean;
  on_like: boolean;
  on_follow: boolean;
}

const defaultSettings: NotificationSettings = {
  pref_email: false,
  on_publish: true,
  on_comment: true,
  on_like: false,
  on_follow: true,
};

const eventOptions: Array<{ key: EventKey; label: string; description: string }> = [
  {
    key: 'on_publish',
    label: 'عند نشر مقال جديد',
    description: 'استقبال إشعار عبر البريد عند نشر كتاب تتابعهم لمقالات جديدة.',
  },
  {
    key: 'on_comment',
    label: 'عند تلقي تعليق',
    description: 'عندما يعلّق أحد على مقالاتك أو يرد على تعليقك.',
  },
  {
    key: 'on_like',
    label: 'عند تلقي إعجاب',
    description: 'إشعار عند حصول مقالاتك على إعجابات جديدة.',
  },
  {
    key: 'on_follow',
    label: 'عند تلقي متابع جديد',
    description: 'إعلامك عندما يبدأ شخص بمتابعتك.',
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          router.replace('/login?redirect=/settings/notifications');
          return;
        }

        const { data, error } = await supabase
          .from('profile_notification_settings')
          .select('pref_email, on_publish, on_comment, on_like, on_follow')
          .eq('profile_id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching notification settings:', error);
          setErrorMessage('حدث خطأ أثناء تحميل الإعدادات. حاول مرة أخرى لاحقًا.');
        }

        if (data) {
          setSettings({
            pref_email: data.pref_email,
            on_publish: data.on_publish,
            on_comment: data.on_comment,
            on_like: data.on_like,
            on_follow: data.on_follow,
          });
        } else {
          const { error: upsertError } = await supabase
            .from('profile_notification_settings')
            .upsert({ profile_id: userId, ...defaultSettings });

          if (upsertError) {
            console.error('Error seeding default notification settings:', upsertError);
          }
        }
      } catch (error) {
        console.error('Unexpected error loading notification settings:', error);
        setErrorMessage('حدث خطأ أثناء تحميل الإعدادات. حاول مرة أخرى لاحقًا.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        router.replace('/login?redirect=/settings/notifications');
        return;
      }

      const { error } = await supabase
        .from('profile_notification_settings')
        .upsert({
          profile_id: userId,
          ...settings,
        });

      if (error) {
        console.error('Error saving notification settings:', error);
        setErrorMessage('تعذر حفظ الإعدادات. حاول مرة أخرى.');
        return;
      }

      setSuccessMessage('تم حفظ الإعدادات بنجاح!');
    } catch (error) {
      console.error('Unexpected error while saving settings:', error);
      setErrorMessage('تعذر حفظ الإعدادات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main dir="rtl" className="mx-2 sm:mx-20 max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300">
              ←
            </span>
            <span>العودة إلى لوحة التحكم</span>
          </button>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl.font-bold" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
            إعدادات الإشعارات
          </h1>
          <p className="mt-2 text-gray-600 text-sm">
            اختر كيف ومتى تحب استقبال الإشعارات من قلم عبر البريد الإلكتروني.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">يتم تحميل الإعدادات...</p>
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold mb-4">قناة الإرسال</h2>
              <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={settings.pref_email}
                  onChange={event => updateSetting('pref_email', event.target.checked)}
                  disabled={saving}
                />
                <div>
                  <p className="font-medium text-sm text-gray-900">البريد الإلكتروني</p>
                  <p className="text-xs text-gray-500 mt-1">إرسال رسالة إلى بريدك الإلكتروني المسجل عند حدوث التنبيهات المحددة.</p>
                </div>
              </label>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">متى يصلك إشعار؟</h2>
              <div className="space-y-4">
                {eventOptions.map(option => (
                  <label
                    key={option.key}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer.transition"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4"
                      checked={settings[option.key]}
                      onChange={event => updateSetting(option.key, event.target.checked)}
                      disabled={saving}
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}


