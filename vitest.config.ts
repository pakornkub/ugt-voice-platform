// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-test-lint-setup/vitest.config.ts
// kit-hash: 8c8cc78b2ed8
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // user-event-heavy component tests (tab switching through large ported
    // upstream screens) can exceed vitest's 5s default on a loaded CI agent.
    testTimeout: 20_000,
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Tests must run without a real .env — otherwise CI has to hold secrets
    // just to run unit tests. GEMINI_API_KEY is explicitly cleared (not just
    // left unset) because vitest's `env` only ADDS to the inherited process
    // env, it does not isolate from it — a real key exported in the runner's
    // shell (or a real value in .env.local, which some dev machines have for
    // manual testing) would otherwise leak through and make
    // src/app/api/ai/*/route.test.ts hit the live Gemini API instead of
    // exercising the deterministic no-API-key fallback branch it tests.
    env: { SKIP_ENV_VALIDATION: '1', GEMINI_API_KEY: '' },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', '.claude/**'],
    // JUnit reporter only on CI — the Jenkins Unit Tests stage reads
    // test-results/junit.xml. Enabling it everywhere litters every local run
    // with report files.
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      // lcov is required by SonarQube (sonar.javascript.lcov.reportPaths)
      reporter: ['text', 'html', 'lcov'],
      // include must cover ALL real source — listing only dirs that already
      // have tests inflates coverage and makes the Quality Gate
      // (new_coverage >= 60%) meaningless. This project's real source lives
      // under src/ (Next.js App Router + components/services from the Phase A
      // migration) plus the root-level lib/ (Prisma client/env/Server Actions
      // from ugt-nextjs-database-setup — see tsconfig.json's `@/lib/*` path).
      include: ['src/app/**', 'src/components/**', 'src/services/**', 'lib/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', '**/generated/**'],
    },
  },
  resolve: {
    alias: [
      // Mirror tsconfig.json's `paths` exactly, including order: the more
      // specific "@/lib/*" -> root ./lib must be matched before the general
      // "@/*" -> ./src, same reasoning as tsconfig.json's own comment.
      { find: '@/lib', replacement: resolve(__dirname, './lib') },
      { find: '@', replacement: resolve(__dirname, './src') },
      // `server-only` throws outside a React Server environment → alias it to
      // an in-project stub. Never alias into node_modules/next internals: that
      // breaks in git worktrees without a full install.
      { find: 'server-only', replacement: resolve(__dirname, 'vitest.server-only-stub.js') },
    ],
  },
});
