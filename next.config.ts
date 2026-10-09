import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ugt-nextjs-cicd-setup: deployed under https://ugtweb.ube.co.th with
  // basePath /ugt-voice-platform (prod) · /ugt-voice-platform-dev (dev), passed
  // as a build arg by the Jenkinsfile; empty locally (decisions.md 2026-10-09).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // `output: 'standalone'` is required by the Dockerfile's
  // `COPY .next/standalone` (gated on CI so local `next dev` is unaffected).
  output: process.env.CI ? 'standalone' : undefined,
  // Version-skew protection (owner report 2026-10-09: a page left open across a redeploy called
  // Server Actions that no longer exist). The Jenkins build number, passed as a Docker build arg;
  // on a mismatch Next.js reloads the page instead of failing. Unset locally / in the CI build.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
};

export default nextConfig;
