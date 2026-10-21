// app/track/page.tsx — no-login portal: open ONE ticket with its tracking code + secret (owner
// 2026-10-21). Public route (PUBLIC_PATHS in src/proxy.ts); a ticket already opened in this browser
// (portal cookie) shows straight away.
import { PortalHeader, PortalTrack } from '@/components/PublicPortal';
import { getPublicTicket } from '@/lib/actions/public-tickets';

export default async function TrackPage() {
  const ticket = await getPublicTicket();
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      <PortalHeader active="track" />
      <PortalTrack initialTicket={ticket} />
    </div>
  );
}
