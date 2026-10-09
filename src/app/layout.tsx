import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { DevEnvironmentBar } from '@/components/DevEnvironmentBar';
import { isDevEnvironment } from '@/lib/environment';

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
  'UGT VoicePlatform - Enterprise Employee Grievance & Feedback Portal with Interactive Workflow Diagram, Gatekeeper Triage & Department Management, Real-time Tracking, Auto-notifications, CSAT Evaluation, Executive Analytics, and Root Cause AI Clustering.';

// The dev deployment says so in the browser tab too (owner request 2026-10-09).
const TITLE = isDevEnvironment() ? '[DEV] UGT VoicePlatform' : 'UGT VoicePlatform';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>
        <LanguageProvider>
          {isDevEnvironment() && <DevEnvironmentBar />}
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
