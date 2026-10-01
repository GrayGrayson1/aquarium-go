/**
 * Move / separate a creature into another tank, with a compatibility preview that explains WHY before confirming.
 * OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowRightLeft, Ban } from 'lucide-react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { previewAddition, environmentGate } from '@/sim/compat';
import { moveCreature, separateCreature } from '@/sim/life/actions';
import { creaturesInTank, breedingStatus } from '@/sim/life';
import { useShell } from '../common/shellStore';
import { CompatView, VerdictBadge } from '../common/CompatView';
import { safe } from '../common/safe';
import { act } from '../common/actions';
import { WATER_CLASS_LABEL } from '../common/format';
import { Modal, Button, Empty } from '../kit';

export function MoveCreatureModal() {
  const id = useShell((s) => s.moveCreatureId);
  const game = useGame((s) => (id ? s.game : null)); // lane:perf — follow the game only while the dialog is open
  const c = id && game ? game.creatures[id] : null;
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => setTarget(null), [id]);
  const tanks = useMemo(() => (game && c ? game.tankOrder.filter((t) => t !== c.tankId).map((t) => game.tanks[t]).filter(Boolean) : []), [game?.tankOrder, c?.tankId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sp = c ? findSpecies(c.speciesId) : undefined;

  const rows = useMemo(() => {
    if (!game || !c || !sp) return [];
    return tanks.map((t) => {
      const gate = safe('environmentGate', () => environmentGate(sp, t), { ok: true });
      const report = gate.ok ? safe('previewAddition', () => previewAddition(game, t.id, { speciesId: c.speciesId, creatureIds: [c.id], sex: c.sex, sizeCm: c.sizeCm }), null) : null;
      return { t, gate, report, count: safe('creaturesInTank', () => creaturesInTank(game, t.id).length, 0) };
    });
  }, [tanks, c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // lane:qa-play — with a single water-compatible tank to go to, it is chosen already (one click fewer)
  // (runs after the reset above, so the queued null is what `t` sees when another animal's move opens)
  useEffect(() => {
    const ok = rows.filter((r) => r.gate.ok);
    setTarget((t) => (t !== null ? t : ok.length === 1 ? ok[0].t.id : null));
  }, [rows]);

  const close = () => useShell.getState().set({ moveCreatureId: null });
  const sel = rows.find((r) => r.t.id === target);
  const inBreeding = c && game ? !!safe('breedingStatus', () => breedingStatus(game, c.id), null) : false;

  const confirm = () => {
    if (!c || !sel) return;
    const toId = sel.t.id;
    // lane:guide — show the sim's own message: it names the tank and carries the warnings that matter (an adult
    // needs a bigger tank, eggs left without a parent, courtship interrupted), which a fixed "moved" text used to hide
    const r = act((d) => (inBreeding ? separateCreature(d, c.id, toId) : moveCreature(d, c.id, toId)), {
      flag: 'moved_creature',
      kindFor: (res) => (/Heads up|fungus|fall from the nest|stay behind|interrupted/i.test(res.message) ? 'warning' : 'success'),
    });
    if (r?.ok) {
      close();
      useUI.getState().set({ focusedTankId: toId, selectedCreatureId: c.id });
    }
  };

  return (
    <Modal
      open={!!c}
      onClose={close}
      title={c ? `Move ${c.name}` : 'Move'}
      subtitle="Every move is checked for water, space, temperament and predators first."
      width={880}
      testId="move-modal"
      actions={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant={sel?.report && (sel.report.verdict === 'high_risk' || sel.report.verdict === 'incompatible') ? 'coral' : 'primary'} disabled={!sel || !sel.gate.ok} onClick={confirm}>
            <ArrowRightLeft size={16} /> {sel ? `Move to ${sel.t.name}` : 'Choose a tank'}
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <Empty>You only have one tank. Buy another in Build to move or separate animals.</Empty>
      ) : (
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
            <div className="ag-movepreview__empty">Choose a tank to see how {c?.name} would get on there — and why.</div>
          ) : sel.gate.ok ? (
            <CompatView report={sel.report} focusSpeciesId={c?.speciesId} title={<>If {c?.name} joins <strong>{sel.t.name}</strong>:</>} />
          ) : (
            <div className="ag-callout ag-callout--danger">
              <Ban size={16} aria-hidden /> <span>{sel.gate.reason}</span>
            </div>
          )}
        </div>
        </div>
      )}
    </Modal>
  );
}
