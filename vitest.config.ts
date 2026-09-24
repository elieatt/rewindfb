import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Date formatting depends on the time zone; pin it so results are the same everywhere.
    env: { TZ: 'UTC' },
  },
});
