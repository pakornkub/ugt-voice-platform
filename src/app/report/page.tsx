// app/report/page.tsx — no-login portal: file a ticket (owner 2026-10-21). Public route
// (PUBLIC_PATHS in src/proxy.ts); src/components/PublicPortal.tsx has the details.
import { PortalHeader, PortalReport } from '@/components/PublicPortal';

// Rendered per request: the CSP script nonce (src/proxy.ts) only reaches dynamic pages — a
// prerendered page would ship scripts the browser then blocks.
export const dynamic = 'force-dynamic';

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      <PortalHeader active="report" />
      <PortalReport />
    </div>
  );
}
