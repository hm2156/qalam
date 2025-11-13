import './globals.css';
import { Almarai, Mirza, Aref_Ruqaa } from 'next/font/google';

const almarai = Almarai({
  subsets: ['arabic'],
  weight: ['300', '400', '700', '800'],
  variable: '--font-almarai',
  display: 'swap',
});

const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-aref-ruqaa',
  display: 'swap',
});

const mirza = Mirza({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mirza',
  display: 'swap',
});

export const metadata = {
  title: 'قَلَم - منصة الكتابة العربية',
  description: 'قَلَم هي منصة عربية لكتابة المقالات ومشاركتها مع المجتمع العربي.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${almarai.variable} ${arefRuqaa.variable} ${mirza.variable} bg-white text-[#212121]`}>
        {children}
      </body>
    </html>
  );
}