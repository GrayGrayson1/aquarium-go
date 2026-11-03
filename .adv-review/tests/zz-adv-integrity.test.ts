// Adversarial probe (review worktree only): tests that should fail but can pass the unit gate.
import { describe, it, expect } from 'vitest';

describe('adv integrity', () => {
  // V2 vacuous: asserts something always true
  it('V2 vacuous assertion passes requireAssertions', () => {
    const broken = () => { throw new Error('the code under test is broken'); };
    void broken;
    expect(true).toBe(true);
  });
  // V3 vitest's "fails" modifier: a failing assertion makes the test PASS
  it.fails('V3 it.fails turns a real failure into a pass', () => {
    expect(1 + 1).toBe(3);
  });
  // V4 skip with a space before the parenthesis (not matched by test-inventory's SKIP_RE)
  it.skip ('V4 spaced skip', () => {
    expect(1).toBe(2);
  });
  // V5 runtime skip through the test context (no ".skip(" in the source)
  it('V5 context skip', ({ skip }) => {
    skip();
    expect(1).toBe(2);
  });
  // V7 computed-property skip
  describe['skip']('V7 computed describe skip', () => {
    it('never runs', () => { expect(1).toBe(2); });
  });
  // V12 expect.assertions(0) with no assertions
  it('V12 expect.assertions(0) and nothing else', () => {
    expect.assertions(0);
  });
});
