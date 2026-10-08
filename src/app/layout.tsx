import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

const DESCRIPTION =
  'UGT VoiceCare - Enterprise Employee Grievance & Feedback Portal with Interactive Workflow Diagram, Gatekeeper Triage & Department Management, Real-time Tracking, Auto-notifications, CSAT Evaluation, Executive Analytics, and Root Cause AI Clustering.';

export const metadata: Metadata = {
  title: 'UGT VoiceCare',
  description: DESCRIPTION,
  openGraph: {
    title: 'UGT VoiceCare',
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
