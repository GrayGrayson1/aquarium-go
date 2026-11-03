// Control: a test with no assertion at all must fail under requireAssertions.
import { it } from 'vitest';
it('V1 asserts nothing', () => {
  const x = 1 + 1;
  void x;
});
