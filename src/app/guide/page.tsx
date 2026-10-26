// app/guide/page.tsx — no-login portal: the employee user guide. Public route (PUBLIC_PATHS in
// src/proxy.ts); the content is the employee part of the in-app manual (RoleGuidesSection).
import { PortalGuide, PortalHeader } from '@/components/PublicPortal';

// Rendered per request: the CSP script nonce (src/proxy.ts) only reaches dynamic pages — a
// prerendered page would ship scripts the browser then blocks.
export const dynamic = 'force-dynamic';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      <PortalHeader active="guide" />
      <PortalGuide />
    </div>
  );
}
