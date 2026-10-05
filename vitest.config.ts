import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/sim/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    // Gate integrity (docs/agent/OPERATIONS.md §6): a test that asserts nothing fails, and a focused `.only` can never
    // slip into a run that is recorded as a passing gate.
    allowOnly: false,
    expect: { requireAssertions: true },
    // Simulation soak tests run many game-days; give them room on busy machines.
    testTimeout: 180000,
    hookTimeout: 60000,
    maxWorkers: 6,
  },
});
