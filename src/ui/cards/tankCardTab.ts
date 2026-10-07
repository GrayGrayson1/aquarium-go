/**
 * Deep link into a tab of the tank card (a one-shot command the card consumes when it is open): the alerts'
 * "Equipment failed" row and `#/tanks/:id/equipment` open straight on Equipment. Its own module so the router can
 * send it without loading the card. OWNER: lane "ui-shell".
 */
import { create } from 'zustand';

export type TankCardTabId = 'water' | 'gear' | 'life' | 'value';

export const useTankCardTab = create<{ want: TankCardTabId | null }>(() => ({ want: null }));
