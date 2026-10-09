// lib/environment.ts — which deployment this build is. NEXT_PUBLIC_BASE_PATH is baked in at build
// time: '/ugt-voice-platform-dev' on the dev deployment, '/ugt-voice-platform' on prod, '' locally.
import { env } from '@/lib/env';

/** The dev deployment (basePath ending in `-dev`): mail dev mode, the DEV bar and the [DEV] title. */
export const isDevEnvironment = (): boolean => (env.NEXT_PUBLIC_BASE_PATH ?? '').endsWith('-dev');
