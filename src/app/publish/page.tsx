// app/publish/page.tsx (Example Submission Logic)

'use client'; 
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import { supabase } from '../../../lib/supabase/client';
import TiptapEditor from '../components/TiptapEditor';

export default function PublishPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = searchParams?.get('id');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); 
  const [tag, setTag] = useState('general');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);

  // Predefined tags in Arabic
  const availableTags = [
    'general',
    'technology',
    'science',
    'culture',
    'literature',
    'philosophy',
    'history',
    'politics',
    'society',
    'art',
    'education',
    'health',
    'business',
    'travel',
    'food',
    'sports',
    'entertainment',
  ];

  const tagLabels: Record<string, string> = {
    general: 'عام',
    technology: 'تقنية',
    science: 'علوم',
    culture: 'ثقافة',
    literature: 'أدب',
    philosophy: 'فلسفة',
    history: 'تاريخ',
    politics: 'سياسة',
    society: 'مجتمع',
    art: 'فن',
    education: 'تعليم',
    health: 'صحة',
    business: 'أعمال',
    travel: 'سفر',
    food: 'طعام',
    sports: 'رياضة',
    entertainment: 'ترفيه',
  };

  // Load article for editing
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) return;
      
      setIsLoadingArticle(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Convert articleId to number if it's a string
      const articleIdNum = parseInt(articleId, 10);
      if (isNaN(articleIdNum)) {
        console.error('Invalid article ID:', articleId);
        alert('معرف المقالة غير صحيح.');
        router.push('/dashboard');
        setIsLoadingArticle(false);
        return;
      }

      // Try to load the article - use maybeSingle to handle not found gracefully
      // RLS policy allows users to view their own articles OR published articles
      const { data: article, error } = await supabase
        .from('articles')
        .select('id, title, content, slug, status, tag, author_id')
        .eq('id', articleIdNum)
        .maybeSingle();

      if (error) {
        console.error('Error loading article:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Article ID:', articleIdNum);
        console.error('User ID:', session.user.id);
        alert(`حدث خطأ في تحميل المقالة: ${error.message || 'خطأ غير معروف'}`);
        router.push('/dashboard');
        setIsLoadingArticle(false);
        return;
      }

      if (!article) {
        console.error('Article not found');
        console.error('Article ID:', articleIdNum);
        console.error('User ID:', session.user.id);
        alert('المقالة غير موجودة.');
        router.push('/dashboard');
        setIsLoadingArticle(false);
        return;
      }

      // Security check: Ensure user owns the article
      if (article.author_id !== session.user.id) {
        console.error('Access denied: User does not own this article');
        console.error('Article author ID:', article.author_id);
        console.error('User ID:', session.user.id);
        alert('ليس لديك صلاحية لتعديل هذه المقالة.');
        router.push('/dashboard');
        setIsLoadingArticle(false);
        return;
      }

      setTitle(article.title);
      setContent(article.content || '');
      setTag(article.tag || 'general');
      setCurrentStatus(article.status || 'draft');
      setIsEditing(true);
      
      setIsLoadingArticle(false);
    };

    loadArticle();
  }, [articleId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get fresh session to ensure authentication is valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
        console.error('Session error:', sessionError);
        alert("يجب عليك تسجيل الدخول للمتابعة.");
        setLoading(false);
        return;
    }

    const user = session.user;

    // Validate title
    if (!title || !title.trim()) {
      alert("الرجاء إدخال العنوان.");
      setLoading(false);
      return;
    }

    // Validate content - check if it's not just empty HTML tags
    const contentText = content.replace(/<[^>]*>/g, '').trim();
    if (!content || !contentText) {
      alert("الرجاء إدخال محتوى المقالة.");
      setLoading(false);
      return;
    }

    // Ensure tag is set to 'general' if empty or not provided
    const finalTag = !tag || tag.trim() === '' ? 'general' : tag.trim().toLowerCase();

    if (isEditing && articleId) {
      // Update existing article - preserve the current status
      const { error } = await supabase
        .from('articles')
        .update({
          title: title.trim(),
          content: content.trim(),
          tag: finalTag,
          status: currentStatus, // Preserve the original status
        })
        .eq('id', articleId)
        .eq('author_id', user.id);

      if (error) {
        console.error('Update Error:', error);
        alert(`حدث خطأ في تحديث المقالة: ${error.message || 'خطأ غير معروف'}`);
      } else {
        alert('تم تحديث المقالة بنجاح!');
        router.push('/dashboard');
      }
    } else {
      // Create new article
      // Simple slug generation - handle Arabic characters better
      let slug = title.trim();
      if (/[\u0600-\u06FF]/.test(slug)) {
        const timestamp = Date.now();
        const hash = Math.abs(slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
        slug = `${timestamp}-${hash}`.substring(0, 50);
      } else {
        slug = slug
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .toLowerCase()
          .substring(0, 50);
      }

      if (!slug || slug.trim() === '') {
        alert('الرجاء إدخال عنوان صحيح.');
        setLoading(false);
        return;
      }

      const articleData = { 
        author_id: user.id,
        title: title.trim(), 
        content: content.trim(),
        slug,
        status: 'draft',
        tag: finalTag,
      };

      const { data, error } = await supabase
        .from('articles')
        .insert([articleData])
        .select();

      if (error) {
        console.error('Publish Error:', error);
        if (error.code === '42501' || error.message.includes('row-level security')) {
          alert('خطأ في الصلاحيات: يرجى التأكد من أن سياسات قاعدة البيانات تسمح لك بإنشاء المقالات.');
        } else {
          alert(`حدث خطأ في حفظ المقالة: ${error.message || 'خطأ غير معروف'}`);
        }
      } else {
        alert('تم حفظ المقالة كمسودة بنجاح!');
        router.push('/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl p-8" dir="rtl">
        <h1 className="mb-8 text-3xl font-light">{isEditing ? 'تعديل المقالة' : 'اكتب مقالتك'}</h1>

        {isLoadingArticle ? (
          <p className="text-center mt-10">...جاري تحميل المقالة</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="عنوان المقالة..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-b border-gray-300 py-8 pb-8 text-4xl font-bold focus:border-black focus:outline-none placeholder:text-gray-400"
                  style={{ fontFamily: 'var(--font-aref-ruqaa), serif', lineHeight: '1.4' }}
                />
              </div>
              
              {/* Tag Selection - Moved to top right */}
              <div className="md:mt-14">
                <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-2">
                  التصنيف
                </label>
                <select
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full md:w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  dir="rtl"
                >
                  {availableTags.map((tagOption) => (
                    <option key={tagOption} value={tagOption}>
                      {tagLabels[tagOption] || tagOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8">
              <TiptapEditor 
                initialContent={content}
                onChange={setContent}
              />
            </div>
            
            <div className="flex justify-end gap-4 pt-6">
              <Link
                href="/dashboard"
                className="rounded-full px-6 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 transition"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`rounded-full px-6 py-2 text-white transition duration-200 ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
                }`}
              >
                {loading ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ كمسودة'}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}