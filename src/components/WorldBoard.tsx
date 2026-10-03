import { useGame } from "../game/store";
import { Bar, Btn, Panel, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtK } from "../game/engine";
import { OBJECTIVES, objectiveIndex } from "../game/engine";
import { KV } from "./TrainPanel";
import { GAME_LENGTH } from "../game/content";

/* =============================== WORLD =============================== */

export function WorldPanel() {
  const { s, d, dispatch } = useGame();
  const laws = s.regions[0]?.laws ?? [];
  const rivalBest = Math.max(...s.rivals.map((r) => r.capability));

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <Panel title="The Race" sub={`Frontier held by ${s.rivals.reduce((a, r) => (r.capability > a.capability ? r : a), s.rivals[0])?.name}. Your best: ${s.bestCap.toFixed(1)}.`}>
          <div className="mb-4">
            <div className="relative h-7 w-full overflow-hidden rounded bg-white/5">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${Math.min(100, (s.bestCap / 60) * 100)}%` }} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold text-white/90">GA · {s.bestCap.toFixed(1)}</span>
              {s.rivals.map((r) => (
                <div key={r.id} className="absolute top-0 h-full w-[2px] opacity-80" style={{ left: `${Math.min(99, (r.capability / 60) * 100)}%`, background: r.color }}>
                  <span className="absolute -top-0.5 left-1 whitespace-nowrap font-mono text-[9px]" style={{ color: r.color }}>{r.name.split(" ")[0]} {r.capability.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {s.rivals.map((r) => (
              <div key={r.id} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold" style={{ color: r.color }}>{r.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">cap {r.capability.toFixed(1)} · safety posture {Math.round(r.safetyPosture * 100)}%</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{r.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.milestones.slice(-4).map((m, i) => <Tag key={i}>{m}</Tag>)}
                </div>
              </div>
            ))}
          </div>
          {s.bestCap > rivalBest + 2 && <p className="mt-3 font-mono text-[10px] text-emerald-300">You hold the frontier by {(s.bestCap - rivalBest).toFixed(1)} points.</p>}
        </Panel>

        <Panel title="Regulation" sub="Fictional jurisdictions. Real tradeoffs.">
          <div className="space-y-2">
            {laws.map((l) => (
              <div key={l.id} className={cn("rounded-md border p-2.5", l.active ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-white/5 bg-white/[0.02] opacity-60")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{l.name}</span>
                  <div className="flex items-center gap-1.5">
                    {!l.active && <Tag>pending · week {l.week}</Tag>}
                    {l.active && l.complied && <Tag tone="emerald">complying</Tag>}
                    {l.active && !l.complied && !l.lobbied && <Tag tone="rose">ignoring · +{l.penalty.toFixed(2)} heat/wk</Tag>}
                    {l.active && l.lobbied && <Tag tone="amber">lobbying · +{(l.penalty).toFixed(2)} heat/wk</Tag>}
                  </div>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{l.desc}</p>
                {l.active && (
                  <>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
                      <span>compliance cost {fmtK(l.costPerQuarter)}/quarter</span>
                      <span>trust bonus +{l.trustBonus} on adoption</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {!l.complied && <Btn kind="primary" onClick={() => dispatch({ t: "comply", lawId: l.id })}>Adopt compliance programme</Btn>}
                      {!l.lobbied && <Btn kind="warn" disabled={s.cash < 260} onClick={() => dispatch({ t: "lobby", lawId: l.id })}>Lobby (260k, −3 trust)</Btn>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            Heat rises when you ignore active law and when you have public incidents. At 100 heat your deployment licence is revoked — that is a loss state, not a fine.
          </p>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Standing">
          <div className="space-y-2">
            <div>
              <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500"><span>Trust Score</span><span className="tabular-nums text-slate-300">{s.trust.toFixed(0)}/100</span></div>
              <Bar v={s.trust} max={100} tone={s.trust > 65 ? "emerald" : s.trust > 35 ? "amber" : "rose"} h={8} />
            </div>
            <div>
              <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500"><span>Regulatory Heat</span><span className="tabular-nums text-slate-300">{s.heatHome.toFixed(0)}/100</span></div>
              <Bar v={s.heatHome} max={100} tone={s.heatHome > 60 ? "rose" : "amber"} h={8} />
            </div>
            <div>
              <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500"><span>Public Awareness</span><span className="tabular-nums text-slate-300">{(s.awareness * 100).toFixed(0)}%</span></div>
              <Bar v={s.awareness} tone="cyan" h={8} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <KV k="Incidents to date" v={`${s.incidentCount}`} tone={s.incidentCount > 5 ? "bad" : "n"} />
            <KV k="Latent risk index" v={`${(d.hazard * 100).toFixed(0)}%`} tone={d.hazard > 0.4 ? "bad" : "warn"} />
            <KV k="Hardware risk" v={`${(d.hardwareRisk * 100).toFixed(0)}%`} tone={d.hardwareRisk > 0.2 ? "bad" : "n"} />
            <KV k="Technique level" v={`${s.techLevel} / 6`} />
            <KV k="Power price" v={`$${s.powerPrice}/MWh`} />
          </div>
        </Panel>

        <Panel title="The Wire">
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {s.newsfeed.length === 0 && <p className="text-xs text-slate-500">Quiet week. Enjoy it.</p>}
            {s.newsfeed.map((n, i) => (
              <div key={i} className="border-l-2 border-cyan-400/30 pl-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-600">W{n.week} · {n.who}</div>
                <div className="text-[11px] leading-snug text-slate-300">{n.text}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =============================== BOARD =============================== */

export function BoardPanel() {
  const { s, d } = useGame();
  const idx = objectiveIndex(s);
  const cur = OBJECTIVES[idx];
  const rivalBest = Math.max(...s.rivals.map((r) => r.capability));
  const cashHist = s.history.map((h) => h.cash);
  const revHist = s.history.map((h) => h.rev);
  const trustHist = s.history.map((h) => h.trust);
  const q = Math.floor((s.week - 1) / 13) + 1;
  const quarterRev = s.revenueHistory.slice(-13).reduce((a, b) => a + b, 0);
  const quarterExp = s.expenseHistory.slice(-13).reduce((a, b) => a + b, 0);

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <Panel title={`Quarter ${q} Board Pack`} sub={`Week ${s.week} of ${GAME_LENGTH} · Year ${s.year} of 5`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KV k="Cash" v={fmtK(s.cash)} tone={s.cash < 0 ? "bad" : "good"} big />
            <KV k="Quarter revenue" v={fmtK(quarterRev)} tone="good" big />
            <KV k="Quarter expenses" v={fmtK(quarterExp)} tone="bad" big />
            <KV k="Valuation" v={`$${s.valuation.toFixed(2)}B`} tone="cyan" big />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Chart data={cashHist} label="cash" tone="#22d3ee" />
            <Chart data={revHist} label="weekly revenue" tone="#34d399" />
            <Chart data={trustHist} label="trust" tone="#a78bfa" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <KV k="Best capability" v={s.bestCap.toFixed(1)} tone="cyan" />
              <KV k="Best rival capability" v={rivalBest.toFixed(1)} tone={s.bestCap > rivalBest ? "good" : "bad"} />
              <KV k="Models released" v={`${s.models.filter((m) => m.status === "released").length}`} />
              <KV k="Profitable quarters" v={`${s.quartersProfitable}`} />
            </div>
            <div className="space-y-1.5">
              <KV k="Weekly burn" v={fmtK(d.expenses)} tone="bad" />
              <KV k="Hardware book value" v={fmtK(d.hwValue)} />
              <KV k="Incidents" v={`${s.incidentCount}`} tone={s.incidentCount > 4 ? "bad" : "n"} />
              <KV k="Fleet" v={`${d.units} units · ${d.slots} slots`} />
            </div>
          </div>
        </Panel>

        <Panel title="Terminal Conditions" sub="Three ways to win. Three ways to end the company.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Goal
              title="Capability Breakthrough"
              desc="Frontier-first and still trusted. Best-in-world capability with a Trust Score above 52."
              progress={Math.min(s.bestCap / 40, (s.bestCap - rivalBest + 4) / 8, s.trust / 52)}
              detail={`cap ${s.bestCap.toFixed(0)}/40 · lead ${(s.bestCap - rivalBest).toFixed(1)} · trust ${s.trust.toFixed(0)}/52`}
            />
            <Goal
              title="Trusted Steward"
              desc="Boring, profitable, beloved. $6M cash, Trust 80, five profitable quarters."
              progress={Math.min(s.cash / 6000, s.trust / 80, s.quartersProfitable / 5)}
              detail={`cash ${fmtK(s.cash)}/6.0M · trust ${s.trust.toFixed(0)}/80 · ${s.quartersProfitable}/5 quarters`}
            />
            <Goal
              title="IPO Exit"
              desc="$6B valuation on a $550k/week run rate with Trust above 45."
              progress={Math.min(s.valuation / 6, s.revenue / 550, s.trust / 45)}
              detail={`$${s.valuation.toFixed(2)}B / 6.0 · ${fmtK(s.revenue)}/wk / 550 · trust ${s.trust.toFixed(0)}/45`}
            />
            <Goal
              title="Failure Modes"
              desc="Cash below −1.4M (bankruptcy) · heat 100 (licence revoked) · trust ≤11 (cascade)."
              progress={Math.max(s.cash < 0 ? -s.cash / 1400 : 0, s.heatHome / 100, (30 - s.trust) / 30)}
              danger
              detail={`cash ${fmtK(s.cash)} · heat ${s.heatHome.toFixed(0)}/100 · trust ${s.trust.toFixed(0)}`}
            />
          </div>
        </Panel>

        <Panel title="Company Log">
          <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
            {s.log.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-10 shrink-0 font-mono text-[9px] text-slate-600">W{l.week}</span>
                <span className={cn("text-[11px] leading-snug",
                  l.tone === "good" ? "text-emerald-300" : l.tone === "bad" ? "text-rose-300" : l.tone === "major" ? "text-cyan-200" : "text-slate-400")}>
                  {l.text}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Current Objective" sub={`Step ${idx + 1} of ${OBJECTIVES.length}`}>
          <div className="text-sm font-semibold text-cyan-100">{cur.label}</div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{cur.hint}</p>
          <div className="mt-3"><Bar v={cur.progress?.(s) ?? 0} tone="cyan" label="progress" /></div>
          <div className="mt-4 space-y-1.5">
            {OBJECTIVES.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-sm border font-mono text-[9px]",
                  s.objectivesDone.includes(o.id) ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300" : i === idx ? "border-cyan-400/50 text-cyan-300" : "border-white/10 text-slate-600")}>
                  {s.objectivesDone.includes(o.id) ? "✓" : i + 1}
                </span>
                <span className={cn("text-[11px]", s.objectivesDone.includes(o.id) ? "text-slate-500 line-through" : i === idx ? "text-slate-200" : "text-slate-600")}>{o.label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Run History">
          {s.runHistory.length === 0 ? <p className="text-xs text-slate-500">No runs launched.</p> : (
            <div className="space-y-1 font-mono text-[10px]">
              {s.runHistory.slice(0, 14).map((r, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-slate-500">W{r.week} {r.name}</span>
                  <span className={cn(r.status === "trained" ? "text-emerald-300" : "text-slate-600")}>{r.params}B · {r.status}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Goal({ title, desc, progress, detail, danger }: { title: string; desc: string; progress: number; detail: string; danger?: boolean }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className={cn("rounded-md border p-2.5", danger ? "border-rose-500/25 bg-rose-500/[0.06]" : "border-white/10 bg-white/[0.02]")}>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-xs font-semibold", danger ? "text-rose-200" : "text-slate-100")}>{title}</span>
        <span className="font-mono text-[10px] text-slate-400">{(p * 100).toFixed(0)}%</span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">{desc}</p>
      <div className="mt-2"><Bar v={p} tone={danger ? "rose" : "emerald"} /></div>
      <div className="mt-1.5 font-mono text-[9px] text-slate-600">{detail}</div>
    </div>
  );
}

function Chart({ data, label, tone }: { data: number[]; label: string; tone: string }) {
  if (data.length < 2) return <div><div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 h-14 rounded bg-white/5" /></div>;
  const w = 200, h = 56;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 6) - 3}`);
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500">
        <span>{label}</span><span className="tabular-nums text-slate-400">{data[data.length - 1].toFixed(1)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 56 }}>
        <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={tone} opacity={0.13} />
        <polyline points={pts.join(" ")} fill="none" stroke={tone} strokeWidth={1.5} />
      </svg>
    </div>
  );
}
