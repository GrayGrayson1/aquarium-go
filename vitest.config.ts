import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/sim/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    // Test integrity: a test that asserts nothing fails, and a focused `.only` can never slip into a run that is
    // reported as passing.
    allowOnly: false,
    expect: { requireAssertions: true },
    // Lets each worker's event loop read Vitest's own RPC replies between long synchronous tests (ADR-0010, BF-002).
    setupFiles: ['tests/sim/setup/yield-between-tests.ts'],
    // Simulation soak tests run many game-days; give them room on busy machines.
    testTimeout: 180000,
    hookTimeout: 60000,
    // Render's build machine (it runs the tests before publishing, ADR-0035) has few CPUs: six workers starved each
    // other until long simulation tests held a worker past Vitest's 60 s RPC reply timer ("Timeout calling
    // onTaskUpdate", ADR-0010) in a run where every test passed. Two workers there; six elsewhere.
    maxWorkers: process.env.RENDER ? 2 : 6,
  },
});
