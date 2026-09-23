/**
 * Endler's livebearer (Poecilia wingei) — a pocket guppy: small slim males patched in neon orange, metallic green
 * and black (black "comma" spot, orange flank patch, black-edged tail, optional top sword), plain tan-silver females.
 * Shares the livebearer body plan with the fancy guppy. OWNER: lane "fishart".
 */
import type { PlanFn } from './common';
import { livebearerPlan } from './fancy_guppy';

export const plan: PlanFn = (args) => livebearerPlan(args, 'endler');
