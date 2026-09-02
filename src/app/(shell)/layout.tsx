import Shell from './shell';

// ponytail: every page under this shell reads localStorage synchronously during
// render (unchanged from the original app), so none of them can be statically
// prerendered — force client-only rendering here instead of touching every
// component's data access.
export const dynamic = 'force-dynamic';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
