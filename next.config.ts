import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ugt-nextjs-cicd-setup (2026-09-02): standalone deploy, no basePath — see
  // docs/project-context/decisions.md. `output: 'standalone'` is required by
  // the Dockerfile's `COPY .next/standalone` (gated on CI so local `next dev`
  // is unaffected).
  output: process.env.CI ? 'standalone' : undefined,
};

export default nextConfig;
