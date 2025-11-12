// app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import { Aref_Ruqaa } from 'next/font/google';
import { Almarai } from 'next/font/google';

// Configure Aref Ruqaa for headings
const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-aref-ruqaa',
});

// Configure Almarai for body text
const almarai = Almarai({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '700', '800'],
  variable: '--font-almarai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'قلم | Qalam',
  description: 'A simple Arabic blogging platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${arefRuqaa.variable} ${almarai.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}