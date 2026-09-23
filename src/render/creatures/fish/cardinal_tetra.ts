/**
 * Cardinal tetra (Paracheirodon axelrodi) — the neon's bolder cousin: a broad electric-blue stripe running nose to
 * tail over crimson that fills the whole lower body. Shares the tetra body plan (slightly deeper body).
 * OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import { tetraPlan } from './neon_tetra';

export const plan: PlanFn = (args) => tetraPlan(args, 'cardinal');
