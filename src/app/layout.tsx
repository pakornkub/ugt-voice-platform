import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
