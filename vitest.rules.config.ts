import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Security rules tests. They need the Firestore emulator: run `npm run test:rules` (requires Java 21+).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests-rules/**/*.test.ts'], testTimeout: 20_000, fileParallelism: false }
});
