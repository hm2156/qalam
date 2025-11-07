// app/dashboard/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase/client';
import Header from '../components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Define the type for an article from your database
interface Article {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  status: 'draft' | 'published' | 'archived';
}

export default function AuthorDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'settings' | 'saved'>('settings');
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // ------------------------------------------
  // Fetch Articles (using useCallback to memoize)
  // ------------------------------------------
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    
    // Check for user session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect unauthenticated users to login
      router.push('/login');
      return;
    }

    // Fetch articles where author_id matches the current user's ID
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, created_at, status')
      .eq('author_id', user.id) // IMPORTANT: Filter by current user
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }, [router]);

  // Fetch saved articles
  const fetchSavedArticles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // Fetch bookmarked articles
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('article_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return;
    }

    if (!bookmarks || bookmarks.length === 0) {
      setSavedArticles([]);
      return;
    }

    // Fetch the actual articles
    const articleIds = bookmarks.map(b => b.article_id);
    const { data: articlesData, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, slug, created_at, status')
      .in('id', articleIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (articlesError) {
      console.error('Error fetching saved articles:', articlesError);
    } else {
      setSavedArticles(articlesData || []);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchSavedArticles();
    loadUserProfile();
  }, [fetchArticles, fetchSavedArticles]);

  // Load user profile data from profiles table
  const loadUserProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      
      // Load from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, bio, twitter_url, linkedin_url, website_url, github_url')
        .eq('id', currentUser.id)
        .single();
      
      if (profile) {
        setDisplayName(profile.display_name || '');
        setAvatarUrl(profile.avatar_url || '');
        setBio(profile.bio || '');
        setTwitterUrl(profile.twitter_url || '');
        setLinkedinUrl(profile.linkedin_url || '');
        setWebsiteUrl(profile.website_url || '');
        setGithubUrl(profile.github_url || '');
      } else {
        // Fallback to user metadata if profile doesn't exist
        setDisplayName(currentUser.user_metadata?.full_name || currentUser.user_metadata?.display_name || '');
        setAvatarUrl(currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '');
      }
    }
  };

  // Handle profile picture upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار ملف صورة صحيح');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى هو 2 ميجابايت');
      return;
    }

    setSaving(true);

    try {
      // Convert to base64 for now (in production, upload to Supabase Storage)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Update profiles table
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            avatar_url: base64,
            display_name: displayName || user.user_metadata?.full_name || '',
            bio: bio,
            twitter_url: twitterUrl,
            linkedin_url: linkedinUrl,
            website_url: websiteUrl,
            github_url: githubUrl
          });

        if (error) {
          console.error('Error updating profile:', error);
          alert('حدث خطأ أثناء تحديث الصورة.');
        } else {
          setAvatarUrl(base64);
          alert('تم تحديث الصورة بنجاح!');
          await loadUserProfile();
        }
        setSaving(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('حدث خطأ أثناء رفع الصورة.');
      setSaving(false);
    }
  };

  // Handle display name update
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    // Update profiles table
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl || '',
        bio: bio,
        twitter_url: twitterUrl,
        linkedin_url: linkedinUrl,
        website_url: websiteUrl,
        github_url: githubUrl
      });

    if (error) {
      console.error('Error updating profile:', error);
      alert('حدث خطأ أثناء تحديث الملف الشخصي.');
    } else {
      alert('تم تحديث الملف الشخصي بنجاح!');
      await loadUserProfile();
    }
    
    setSaving(false);
  };


  // ------------------------------------------
  // Change Status Function
  // ------------------------------------------
  const handleChangeStatus = async (article: Article, newStatus: 'draft' | 'published' | 'archived') => {
    const statusText = newStatus === 'published' ? 'منشور' : newStatus === 'draft' ? 'مسودة' : 'مؤرشف';
    if (!confirm(`هل أنت متأكد من تغيير حالة المقالة "${article.title}" إلى ${statusText}؟`)) {
      return;
    }

    const { error } = await supabase
      .from('articles')
      .update({ status: newStatus })
      .eq('id', article.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تحديث حالة المقالة.');
    } else {
      alert(`تم تحديث حالة المقالة بنجاح إلى ${statusText}!`);
      fetchArticles();
    }
  };

  // ------------------------------------------
  // Delete Article Function
  // ------------------------------------------
  const handleDeleteArticle = async (article: Article) => {
    if (!confirm(`هل أنت متأكد من حذف المقالة "${article.title}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', article.id);

    if (error) {
      console.error('Error deleting article:', error);
      alert('حدث خطأ أثناء حذف المقالة.');
    } else {
      alert('تم حذف المقالة بنجاح!');
      fetchArticles();
    }
  };

  // ------------------------------------------
  // Remove Bookmark Function
  // ------------------------------------------
  const handleRemoveBookmark = async (article: Article) => {
    if (!user) return;

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('article_id', article.id);

    if (error) {
      console.error('Error removing bookmark:', error);
      alert('حدث خطأ أثناء إزالة الحفظ.');
    } else {
      alert('تم إزالة الحفظ بنجاح!');
      fetchSavedArticles();
    }
  };


  if (loading) {
    return (
      <main className="mx-2 px-4 sm:mx-20 sm:px-4 max-w-7xl py-4 sm:py-8 md:py-8" dir="rtl">
        <Header />
        <p className="text-center mt-10 text-sm sm:text-base">...جاري تحميل المقالات</p>
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-2 px-4 mb-5 sm:pt-15 sm:mx-23 sm:px-4 max-w-7xl py-4 sm:py-6 md:py-8" dir="rtl">
        <div className="flex flex-row justify-between items-center gap-1 sm:gap-4 mb-6 sm:mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-2xl sm:text-4xl md:text-3xl font-light flex-shrink-0" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>لوحة التحكم</h1>
          {(activeTab === 'articles' || activeTab === 'saved') && activeTab === 'articles' && (
            <Link 
              href="/publish" 
              className="rounded-full bg-black px-3 sm:px-3 py-1.5 sm:py-2 text-white hover:bg-gray-800 transition text-xs sm:text-sm md:text-base whitespace-nowrap flex-shrink-0"
            >
              + انشر مقالة جديدة
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'settings' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            الإعدادات
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'articles' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            مقالاتي
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'saved' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            المقالات المحفوظة
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 sm:mb-6">الملف الشخصي</h2>
              
              {/* Profile Picture */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">الصورة الشخصية</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl sm:text-2xl">
                        {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition">
                      <span className="text-white text-xs">+</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">انقر على + لرفع صورة جديدة</p>
                    <p className="text-xs text-gray-400">PNG, JPG حتى 2MB</p>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم العرض</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="أدخل اسم العرض"
                  className="w-full border-b border-gray-300 pb-2 text-base sm:text-lg focus:border-black focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">الاسم الذي سيظهر على مقالاتك</p>
              </div>

              {/* Email (Read-only) */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full border-b border-gray-200 pb-2 text-base sm:text-lg text-gray-500 bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
              </div>

              {/* Bio */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">نبذة عنك</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة قصيرة عنك..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg p-3 text-base focus:border-black focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">ستظهر هذه النبذة في صفحتك الشخصية</p>
              </div>

              {/* Social Links */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">روابط التواصل</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Twitter</label>
                    <input
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://twitter.com/username"
                      className="w-full border-b border-gray-300 pb-2 text-base focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">LinkedIn</label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full border-b border-gray-300 pb-2 text-base focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">GitHub</label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full border-b border-gray-300 pb-2 text-base focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">الموقع الشخصي</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full border-b border-gray-300 pb-2 text-base focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preview and Save Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/author/${user?.id}`}
                  target="_blank"
                  className="rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 hover:border-gray-400 text-center transition"
                >
                  معاينة الملف الشخصي
                </Link>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={`rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base text-white transition flex-1 sm:flex-initial ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-black hover:bg-gray-800'
                  }`}
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <>
            {articles.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 text-sm sm:text-base">لم تقم بكتابة أي مقالة بعد.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {articles.map((article) => (
                  <div key={article.id} className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 hover:bg-gray-50 transition-colors">
                    
                    {/* Article Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2 text-black break-words">{article.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          article.status === 'published' 
                            ? 'bg-gray-100 text-gray-700' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {article.status === 'published' ? 'منشور' : 'مسودة'}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span>{new Date(article.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 sm:gap-2 sm:mr-6 sm:items-center">
                      {/* Edit Button - Always show for editing */}
                      <Link 
                        href={`/publish?id=${article.id}`}
                        className="text-xs sm:text-sm text-gray-600 hover:text-black px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition whitespace-nowrap"
                      >
                        تعديل
                      </Link>
                      
                      {/* View Button - Only for published articles */}
                      {article.status === 'published' && (
                        <Link 
                          href={`/article/${article.slug}`}
                          target="_blank"
                          className="text-xs sm:text-sm text-gray-600 hover:text-black px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition whitespace-nowrap"
                        >
                          عرض
                        </Link>
                      )}
                      
                      {/* Publish/Draft Toggle Button */}
                      {article.status === 'draft' ? (
                        <button
                          onClick={() => handleChangeStatus(article, 'published')}
                          className="text-xs sm:text-sm bg-black text-white px-2 sm:px-3 py-1 rounded hover:bg-gray-800 transition whitespace-nowrap"
                        >
                          نشر المقالة
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChangeStatus(article, 'draft')}
                          className="text-xs sm:text-sm bg-gray-200 text-gray-700 px-2 sm:px-3 py-1 rounded hover:bg-gray-300 transition whitespace-nowrap"
                        >
                          تحويل إلى مسودة
                        </button>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteArticle(article)}
                        className="text-xs sm:text-sm text-red-600 hover:text-red-800 px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition whitespace-nowrap"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Saved Articles Tab */}
        {activeTab === 'saved' && (
          <>
            {savedArticles.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 text-sm sm:text-base">لم تقم بحفظ أي مقالة بعد.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {savedArticles.map((article) => (
                  <div key={article.id} className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 hover:bg-gray-50 transition-colors">
                    
                    {/* Article Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/article/${article.slug}`}>
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 text-black hover:text-gray-600 transition break-words">
                          {article.title}
                        </h2>
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          منشور
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span>{new Date(article.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 sm:gap-2 sm:mr-6 sm:items-center">
                      {/* View Button */}
                      <Link 
                        href={`/article/${article.slug}`}
                        target="_blank"
                        className="text-xs sm:text-sm text-gray-600 hover:text-black px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition whitespace-nowrap"
                      >
                        عرض
                      </Link>
                      
                      {/* Remove Bookmark Button */}
                      <button
                        onClick={() => handleRemoveBookmark(article)}
                        className="text-xs sm:text-sm text-red-600 hover:text-red-800 px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition whitespace-nowrap"
                        title="إزالة الحفظ"
                      >
                        إزالة الحفظ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}