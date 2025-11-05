// app/page.tsx - Landing page (public)

import Link from 'next/link';
import Header from './components/Header';
import AuthRedirect from './components/AuthRedirect';

export default function Home() {
  return (
    <>
      <AuthRedirect />
      <Header />
      <main className="mx-auto max-w-7xl px-8" dir="rtl">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="max-w-5xl">
            <h1 
              className="text-5xl md:text-7xl lg:text-7xl font-black text-black mb-6 leading-tight" 
              style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}
            >
              افتح مدادك.
              <br />
              <span className="text-gray-600">واجعل فكرتك رحلة.</span>
        </h1>
            <p className="text-2xl md:text-2xl sm:text-lg text-gray-700 mb-10 leading-relaxed max-w-3xl">
              قلم هي منصة النشر العربية الجديدة. نؤمن بأن الأفكار العظيمة تستحق مساحة نظيفة وأنيقة لتصل إلى القارئ.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center rounded bg-black px-6 py-2.5 text-white hover:bg-gray-800 transition-colors text-base font-medium"
              >
                ابدأ الكتابة الآن
              </Link>
              <Link 
                href="/explore" 
                className="inline-flex items-center justify-center rounded border border-gray-300 px-6 py-2.5 text-black hover:border-black transition-colors text-base font-medium"
              >
                استكشف المقالات
              </Link>
            </div>
          </div>
        </section>

        {/* Medium-style Visual Break */}
        <div className="w-full h-px bg-gray-200"></div>
      </main>

      {/* Features Section - Full Width */}
      <section className="py-30 bg-black w-full" dir="rtl">
        <div className="mx-auto max-w-7xl px-8">
          <h2 className="text-5xl font-regular mb-18 text-center text-white" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
            لماذا تختار قلم؟
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1: Writing */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                محرر عربي فائق
              </h3>
              <p className="text-gray-300 leading-relaxed">
                محرر TipTap مُعدّل خصيصًا ليضمن انسيابية الكتابة العربية (RTL) مع دعم الصور والوسائط المتعددة.
              </p>
            </div>

            {/* Feature 2: Community */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                صوتك يصل
              </h3>
              <p className="text-gray-300 leading-relaxed">
                ابنِ جمهورك وتفاعل مع القراء عبر التعليقات والمشاركات والاطلاع على إحصائيات مقالاتك.
              </p>
            </div>

            {/* Feature 3: Design */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                جمالية القراءة
              </h3>
              <p className="text-gray-300 leading-relaxed">
                تصميم يركز على المحتوى. تجربة قراءة مريحة للعين وخالية من التشتيت، مستوحاة من أفضل منصات النشر العالمية.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-18 pt-15" dir="rtl">
        {/* Stats/Hashtags Section */}
        <section className="py-30 pt-25">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-extrabold text-black mb-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                # مداد
              </div>
              <p className="text-gray-600">قصص قوية</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-extrabold text-black mb-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                # نشر
              </div>
              <p className="text-gray-600">بلا قيود</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-extrabold text-black mb-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                # مجتمع
              </div>
              <p className="text-gray-600">عربي</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-extrabold text-black mb-2" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
                # محتوى
              </div>
              <p className="text-gray-600">أصلي</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-gray-200">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6" style={{ fontFamily: 'var(--font-aref-ruqaa), serif' }}>
              كن جزءاً من القصة.
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              ابدأ الكتابة في قلم. الأمر بسيط ومجاني ولن يستغرق سوى دقيقة.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center rounded bg-black px-8 py-3 text-white hover:bg-gray-800 transition-colors text-base font-medium"
            >
              ابدأ الآن مجانًا
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 mt-5">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-600 text-sm">
            © 2024 قلم. جميع الحقوق محفوظة.
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/explore" className="text-gray-600 hover:text-black transition">
              اكتشف
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-black transition">
              تسجيل الدخول
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}