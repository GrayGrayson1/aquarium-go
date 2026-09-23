/**
 * Party-mode glue. The audio lane's director watches `ui.partyMode` + `settings.partyUseMicrophone` and starts the
 * built-in groove (or the microphone, only when the player opted in). OWNER: lane "ui-shell".
 */
import { useAudioStore, type PartyStatus } from '@/audio/store';

export type { PartyStatus };

export function usePartyStatus(): { status: PartyStatus; message: string | null } {
  const status = useAudioStore((s) => s.partyStatus);
  const message = useAudioStore((s) => s.partyMessage);
  return { status, message };
}
