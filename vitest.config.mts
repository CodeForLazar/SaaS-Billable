import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for plain logic (dates, money, permissions, validation) in Node: no browser, no
// database. They live in tests/unit (utils/money.ts -> tests/unit/money.test.ts). Pages and flows
// are covered by Playwright (end to end, tests/e2e) instead.
export default defineConfig({
   resolve: {
      // The same "@/..." imports as the app (tsconfig paths).
      alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) }]
   },
   test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts']
   }
});
