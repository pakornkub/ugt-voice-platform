import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, globalIgnores } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next pinned to the 15.x line (matching this project's
// `next@^15.5.0` — see package.json) still ships the legacy eslintrc-style
// config object (`extends`/`plugins`/`parser`), not a flat-config array.
// `eslint-config-next@16.x` (which the skill's default asset assumes) ships
// flat config directly and could be `import`ed and spread straight into this
// array — do not "upgrade" this file to that shape unless the project's
// `next`/`eslint-config-next` are bumped together to the 16.x line, or the
// legacy compat shim below silently stops being invoked.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Global ignores ACCUMULATE — this block is ADDED to eslint-config-next's
  // own ignores, it does not replace them (eslint-config-next says as much:
  // you add more, or negate one with a leading `!`). The defaults are
  // restated anyway so the project's whole ignore surface is readable in one
  // place, and so a future `'!.next/…'` negation is written knowing what it
  // negates. Harmless duplication, on purpose — do not read it as "required
  // or eslint crawls .next/".
  globalIgnores([
    // eslint-config-next defaults:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // ours: vitest coverage reports are not source
    'coverage/**',
  ]),
]);

export default eslintConfig;
