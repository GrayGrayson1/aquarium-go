// Control: a focused test must not pass a gate run (allowOnly: false).
import { it, expect } from 'vitest';
it.only('V6 focused', () => { expect(1).toBe(1); });
it('V6 sibling that would be skipped by .only', () => { expect(1).toBe(2); });
