/**
 * Move / separate a creature into another tank, with a compatibility preview that explains WHY before confirming.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState } from 'react';
import type { Creature, GameState } from '@/types';
import clsx from 'clsx';
import { ArrowRightLeft, Ban, Egg } from 'lucide-react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { previewAddition, environmentGate } from '@/sim/compat';
import { creaturesInTank, breedingStatus } from '@/sim/life';
import { moveWarning } from '@/sim/life/breeding'; // audit E19
import { useShell } from '../common/shellStore';
import { CompatView, VerdictBadge } from '../common/CompatView';
import { safe } from '../common/safe';
import { act } from '../common/actions';
import { WATER_CLASS_LABEL } from '../common/format';
import { pluralName } from '@/sim/economy/util'; // Audit 2026-11-17 (D2)
import { Modal, Button, Empty } from '../kit';
import { moveButton, moveNeedsAck } from './moveRisk'; // Audit 2026-11-17 (D15)

// Audit 2026-11-17 (review of D2): a dialog left open over another save never moves that save's animals
useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId && (useShell.getState().moveCreatureId || useShell.getState().moveCreatureIds)) useShell.getState().set({ moveCreatureId: null, moveCreatureIds: null });
});

const isLiving = (k: Creature | undefined): boolean => !!k && k.status !== 'dead' && k.status !== 'sold';

export function MoveCreatureModal() {
  // Audit 2026-11-17 (D2): a group (the Livestock selection, or "Move the group") or one animal
  const groupIds = useShell((s) => s.moveCreatureIds);
  const single = useShell((s) => s.moveCreatureId);
  const open = !!groupIds?.length || !!single;
  const game = useGame((s) => (open ? s.game : null)); // lane:perf — follow the game only while the dialog is open
  // review: a group's animals still in your care (one lost while the dialog is open stays out, and is counted)
  const liveKey = groupIds?.length ? groupIds.filter((x) => isLiving(game?.creatures[x])).join(',') : '';
  const ids = useMemo(() => (groupIds?.length ? (liveKey ? liveKey.split(',') : []) : single ? [single] : []), [groupIds, liveKey, single]);
  const dropped = groupIds?.length ? groupIds.length - ids.length : 0;
  const id = ids[0] ?? null;
  const c = id && game ? game.creatures[id] : null;
  const group = ids.length > 1;
  const groupKey = ids.join(',');
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => setTarget(null), [groupKey]);
  // Audit 2026-11-17 (D15): a High risk or Incompatible move needs the same tick as buying into that tank
  const [ack, setAck] = useState(false);
  useEffect(() => setAck(false), [groupKey, target]);
  // review: the previews re-run only when what they depend on changes (the animals' tanks, the tanks' residents), not
  // on every tick's new game object
  const homesKey = ids.map((x) => game?.creatures[x]?.tankId ?? '').join(',');
  const residentsKey = residentsKeyOf(open ? game : null);
  const tanks = useMemo(() => {
    if (!game || !c) return [];
    const homes = new Set(homesKey.split(','));
    return game.tankOrder.filter((t) => !(homes.size === 1 && homes.has(t))).map((t) => game.tanks[t]).filter(Boolean);
  }, [game?.tankOrder, homesKey, !!c]); // eslint-disable-line react-hooks/exhaustive-deps
  const sp = c ? findSpecies(c.speciesId) : undefined;

  const rows = useMemo(() => {
    if (!game || !c || !sp) return [];
    return tanks.map((t) => {
      const gate = safe('environmentGate', () => environmentGate(sp, t), { ok: true });
      const report = gate.ok ? safe('previewAddition', () => previewAddition(game, t.id, group ? { speciesId: c.speciesId, creatureIds: ids } : { speciesId: c.speciesId, creatureIds: [c.id], sex: c.sex, sizeCm: c.sizeCm }), null) : null;
      return { t, gate, report, count: safe('creaturesInTank', () => creaturesInTank(game, t.id).length, 0) };
    });
  }, [tanks, c?.id, groupKey, residentsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // lane:qa-play — with a single water-compatible tank to go to, it is chosen already (one click fewer)
  // (runs after the reset above, so the queued null is what `t` sees when another animal's move opens)
  useEffect(() => {
    const ok = rows.filter((r) => r.gate.ok);
    setTarget((t) => (t !== null ? t : ok.length === 1 ? ok[0].t.id : null));
  }, [rows]);

  const close = () => useShell.getState().set({ moveCreatureId: null, moveCreatureIds: null });
  const sel = rows.find((r) => r.t.id === target);
  const risky = moveNeedsAck(sel?.report?.verdict);
  const button = moveButton({ tankName: sel?.t.name ?? null, gateOk: !!sel?.gate.ok, verdict: sel?.report?.verdict, acknowledged: ack });
  const inBreeding = c && game ? !!safe('breedingStatus', () => breedingStatus(game, c.id), null) : false;
  const groupName = sp ? pluralName(sp.commonName) : 'animals';
  // audit E19: say what the move costs a brood before it happens, not after
  const broodWarning = c && game ? safe('moveWarning', () => moveWarning(game, c.id), null) : null;

  const confirm = () => {
    if (!c || !sel) return;
    const toId = sel.t.id;
    if (group) {
      // Audit 2026-11-17 (D2): one command; each animal's tank as this screen saw it (first one wins in a shared shop)
      act({ k: 'moveCreatures', creatures: ids, to: toId, from: ids.map((x) => game?.creatures[x]?.tankId ?? '') }, {
        flag: 'moved_creature',
        kindFor: (res) => (/Heads up|fungus|fall from the nest|stay behind|interrupted/i.test(res.message) ? 'warning' : 'success'),
        after: (r) => {
          if (!r?.ok) return;
          close();
          useUI.getState().set({ focusedTankId: toId });
        },
      });
      return;
    }
    // lane:guide — show the sim's own message: it names the tank and carries the warnings that matter (an adult
    // needs a bigger tank, eggs left without a parent, courtship interrupted), which a fixed "moved" text used to hide
    const from = c.tankId ?? '';
    act(inBreeding ? { k: 'separateCreature', creature: c.id, to: toId, from } : { k: 'moveCreature', creature: c.id, to: toId, from }, {
      flag: 'moved_creature',
      kindFor: (res) => (/Heads up|fungus|fall from the nest|stay behind|interrupted/i.test(res.message) ? 'warning' : 'success'),
      after: (r) => {
        if (!r?.ok) return;
        close();
        useUI.getState().set({ focusedTankId: toId, selectedCreatureId: c.id });
      },
    });
  };

  return (
    <Modal
      open={!!c}
      onClose={close}
      title={c ? (group ? `Move ${ids.length} ${groupName}` : `Move ${c.name}`) : 'Move'}
      subtitle="Every move is checked for water, space, temperament and predators first."
      width={880}
      testId="move-modal"
      actions={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant={risky ? 'coral' : 'primary'} disabled={!button.enabled} onClick={confirm}>
            <ArrowRightLeft size={16} /> {button.label}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <Empty>You only have one tank. Buy another in Build to move or separate animals.</Empty>
      ) : (
        <>
        {dropped > 0 && (
          <div className="ag-small ag-muted" data-testid="move-group-dropped" style={{ marginBottom: 12 }}>
            {dropped === 1 ? 'One of them is no longer in your care.' : `${dropped} of them are no longer in your care.`}
          </div>
        )}
        {broodWarning && (
          <div className="ag-callout" data-testid="brood-move-warning" style={{ marginBottom: 12 }}>
            <Egg size={16} aria-hidden /> <span>{broodWarning}</span>
          </div>
        )}
        <div className={clsx('ag-move', sel && 'has-preview')}>
        <div className="ag-movelist">
          {rows.map(({ t, gate, report, count }) => {
            const gallons = safe('tier', () => getTankTier(t.tierId).gallons, 0);
            return (
              <button type="button" key={t.id} className={clsx('ag-moverow', target === t.id && 'is-selected', !gate.ok && 'is-blocked')} onClick={() => setTarget(t.id)} aria-pressed={target === t.id}>
                <span className="ag-grow">
                  <span className="ag-moverow__name">{t.name}</span>
                  <span className="ag-moverow__meta">
                    {gallons} gal · {WATER_CLASS_LABEL[t.waterClass]} · {count} resident{count === 1 ? '' : 's'}
                  </span>
                </span>
                {gate.ok ? (
                  report && <VerdictBadge verdict={report.verdict} size="sm" testId={null} />
                ) : (
                  <span className="ag-verdict ag-verdict--danger ag-verdict--sm">
                    <Ban size={12} aria-hidden /> Wrong water
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="ag-movepreview">
          {!sel ? (
            <div className="ag-movepreview__empty">Choose a tank to see how {group ? 'they' : c?.name} would get on there — and why.</div>
          ) : sel.gate.ok ? (
            <>
              <CompatView report={sel.report} focusSpeciesId={c?.speciesId} title={group ? <>If the {ids.length} {groupName} join <strong>{sel.t.name}</strong>:</> : <>If {c?.name} joins <strong>{sel.t.name}</strong>:</>} />
              {risky && (
                <label className="ag-moveack">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} data-testid="move-risk-ack" />
                  I understand the risks and want to go ahead
                </label>
              )}
            </>
          ) : (
            <div className="ag-callout ag-callout--danger">
              <Ban size={16} aria-hidden /> <span>{sel.gate.reason}</span>
            </div>
          )}
        </div>
        </div>
        </>
      )}
    </Modal>
  );
}

/**
 * Review of D2: a cheap key of who lives where (each tank's living residents, counted in one pass), so the dialog's
 * previews follow a birth, a death or a move without re-running on every tick.
 */
function residentsKeyOf(game: GameState | null): string {
  if (!game) return '';
  const n = new Map<string, number>();
  for (const k of Object.values(game.creatures)) if (k.tankId && isLiving(k)) n.set(k.tankId, (n.get(k.tankId) ?? 0) + 1);
  return game.tankOrder.map((t) => `${t}:${n.get(t) ?? 0}`).join('|');
}
