import React, { useMemo, useState } from "react";
import { useGame } from "../game/store";
import { ARCHS, PARAM_STEPS } from "../game/content";
import { computeNeeded, dataCostOf, preview } from "../game/sim";
import { Bar, Btn, Panel, Slider, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtCalls, fmtK } from "../game/engine";

export default function TrainPanel({ goModels }: { goModels: () => void }) {
  const { s, d, dispatch } = useGame();
  const [params, setParams] = useState(0.5);
  const [arch, setArch] = useState("dense");
  const [mix, setMix] = useState({ licensed: 70, scraped: 20, synthetic: 10 });
  const [safety, setSafety] = useState(0.12);
  const [units, setUnits] = useState(Math.max(1, Math.floor(d.units * 0.7)));

  const pv = useMemo(
    () => preview(s, d, params, arch, mix, safety, Math.min(units, d.units)),
    [s, d, params, arch, mix, safety, units]
  );
  const cost = dataCostOf(params, mix);
  const run = s.run;

  const archOk = ARCHS.filter((a) => s.techLevel >= a.unlock && params >= a.minParams);

  if (run) return <LiveRun />;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <Panel title="Training Run Planner" sub="Every choice here is a bet about what the model will be — and what it will do when nobody is watching.">
          <div className="space-y-4">
            <div>
              <Label>Model Scale — parameters</Label>
              <div className="flex flex-wrap gap-1.5">
                {PARAM_STEPS.map((p) => {
                  const tooBig = computeNeeded(p, arch) > d.tf * 40;
                  return (
                    <button
                      key={p}
                      onClick={() => setParams(p)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 font-mono text-xs transition-all",
                        params === p ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-400/30",
                        tooBig && "opacity-45"
                      )}
                    >
                      {p}B
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-slate-500">
                Compute required {pv.compute.toFixed(0)} units · your fleet does {d.tf.toFixed(1)} tf/wk
                {pv.weeks > 40 && <span className="text-rose-400"> — this will take {pv.weeks.toFixed(0)} weeks. Build a bigger cluster.</span>}
              </p>
            </div>

            <div>
              <Label>Architecture</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {archOk.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setArch(a.id)}
                    className={cn(
                      "rounded-md border p-2 text-left transition-all",
                      arch === a.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-white/10 bg-white/[0.02] hover:border-cyan-400/30"
                    )}
                  >
                    <div className="text-xs font-semibold text-slate-100">{a.name}</div>
                    <div className="font-mono text-[10px] text-cyan-300/80">{a.effects}</div>
                    <div className="mt-0.5 text-[10px] leading-snug text-slate-500">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Dataset Mix</Label>
              <div className="space-y-2">
                <Slider label="Licensed corpora" tone="emerald" value={mix.licensed} min={0} max={100} step={5} onChange={(v) => setMix((m) => ({ ...m, licensed: v }))} format={(v) => `${v}%`} />
                <Slider label="Web crawl (scraped)" tone="amber" value={mix.scraped} min={0} max={100} step={5} onChange={(v) => setMix((m) => ({ ...m, scraped: v }))} format={(v) => `${v}%`} />
                <Slider label="Synthetic / model-generated" tone="violet" value={mix.synthetic} min={0} max={100} step={5} onChange={(v) => setMix((m) => ({ ...m, synthetic: v }))} format={(v) => `${v}%`} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Tag tone="cyan">quality {(pv.quality * 100).toFixed(0)}%</Tag>
                <Tag tone={pv.legal > 0.4 ? "rose" : "slate"}>legal exposure {(pv.legal * 100).toFixed(0)}%</Tag>
                <Tag tone={pv.contamination > 0.3 ? "amber" : "slate"}>contamination {(pv.contamination * 100).toFixed(0)}%</Tag>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alignment budget</Label>
                <Slider label="Safety share of run" tone="emerald" value={safety} min={0} max={0.4} step={0.01} onChange={setSafety} format={(v) => `${Math.round(v * 100)}%`} />
                <p className="text-[10px] leading-snug text-slate-500">
                  Compute and researcher time diverted to fine-tuning, red-teaming and interpretability. Costs capability and wall-clock. Buys you a model that behaves when you aren't looking.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Fleet allocation</Label>
                <Slider
                  label="Accelerators on this run" tone="violet" value={Math.min(units, d.units)} min={0} max={d.units}
                  step={1} onChange={setUnits} format={(v) => `${v} / ${d.units}`}
                />
                <p className="text-[10px] leading-snug text-slate-500">
                  The rest serves customers. Inference capacity falls to {(pv.lostInference).toFixed(0)}k calls/wk — that revenue is what pays for this run.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Forecast">
          <div className="space-y-2.5">
            <KV k="Projected capability" v={pv.cap.toFixed(1)} tone="cyan" big />
            <KV k="Wall-clock estimate" v={pv.weeks > 900 ? "never" : `${pv.weeks.toFixed(1)} weeks`} tone={pv.weeks > 26 ? "bad" : "n"} />
            <KV k="Data licensing" v={fmtK(cost)} tone="n" />
            <KV k="Unmeasured-risk index" v={`${(pv.risk * 100).toFixed(0)}%`} tone={pv.risk > 0.4 ? "bad" : pv.risk > 0.25 ? "warn" : "emerald"} />
            <div className="pt-1"><Bar v={pv.risk} max={0.8} tone={pv.risk > 0.4 ? "rose" : "amber"} label="latent risk if you skip evals" /></div>
            <div className="pt-1">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">Capability vs. frontier rivals</div>
              <div className="relative h-3 w-full overflow-hidden rounded bg-white/5">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.min(100, (pv.cap / 60) * 100)}%` }} />
                {s.rivals.map((r) => (
                  <div key={r.id} className="absolute top-0 h-full w-[2px]" style={{ left: `${Math.min(100, (r.capability / 60) * 100)}%`, background: r.color }} />
                ))}
              </div>
              <div className="mt-1 flex gap-3 font-mono text-[9px] text-slate-500">
                {s.rivals.map((r) => <span key={r.id}><span style={{ color: r.color }}>▌</span> {r.name} {r.capability.toFixed(0)}</span>)}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Btn
              kind="primary"
              className="w-full py-2.5"
              disabled={s.cash < cost + 20 || d.units < 1 || pv.weeks > 200}
              onClick={() => dispatch({ t: "startRun", params, arch, safetyShare: safety, mix, units: Math.min(units, d.units), name: `GA-${s.models.length + 1}` })}
            >
              Launch run — {fmtK(cost)}
            </Btn>
            {s.cash < cost + 20 && <p className="text-center font-mono text-[10px] text-rose-400">Insufficient cash for data licensing.</p>}
            {d.units < 1 && <p className="text-center font-mono text-[10px] text-rose-400">No accelerators installed. Buy some in the lab.</p>}
            {s.models.some((m) => m.status === "evaluating") && (
              <Btn className="w-full" onClick={goModels}>A finished model is waiting in evaluation →</Btn>
            )}
          </div>
        </Panel>

        <Panel title="Scaling Notes">
          <ul className="space-y-2 text-[11px] leading-snug text-slate-400">
            <li><b className="text-slate-200">Compute</b> scales superlinearly with parameters. Doubling scale roughly doubles cost, not capability.</li>
            <li><b className="text-slate-200">Capability</b> grows with your researchers, your data quality, and the field's technique level (which rises whether you like it or not).</li>
            <li><b className="text-slate-200">Emergent behaviour</b> appears mid-run at thresholds you cannot see. Some are gifts. Some are liabilities you will discover in a headline.</li>
            <li><b className="text-slate-200">Every skipped evaluation is a loan</b> against a future disaster. The interest rate is set by how big the model is.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function LiveRun() {
  const { s, d, dispatch } = useGame();
  const r = s.run!;
  const frac = Math.max(0, Math.min(1, r.computeDone / r.computeNeeded));
  const eta = d.trainTf > 0.001 ? (r.computeNeeded - r.computeDone) / d.trainTf : Infinity;
  const loss = r.lossLog;
  const w = 520, h = 170;
  const pts = loss.length > 1
    ? loss.map((v, i) => `${((i / (loss.length - 1)) * w).toFixed(1)},${(h - ((v - 0.5) / 3.1) * h).toFixed(1)}`)
    : [];
  const cur = loss[loss.length - 1] ?? 3.4;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <Panel
          title={`Run · ${r.name}`}
          sub={`${r.params}B · ${ARCHS.find((a) => a.id === r.arch)?.name} · safety ${Math.round(r.safetyShare * 100)}%`}
          right={<Tag tone="violet">{frac >= 1 ? "FINALISING" : "TRAINING"}</Tag>}
        >
          <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#05080d]">
            <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" style={{ height: 190 }}>
              {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.05)" />)}
              {pts.length > 1 && (
                <>
                  <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="rgba(167,139,250,0.14)" />
                  <polyline points={pts.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
                </>
              )}
              <line x1={0} x2={w} y1={(h - ((1.9 - 0.5) / 3.1) * h)} y2={(h - ((1.9 - 0.5) / 3.1) * h)} stroke="rgba(52,211,153,0.35)" strokeDasharray="4 4" />
              <text x={6} y={(h - ((1.9 - 0.5) / 3.1) * h) - 5} fill="rgba(52,211,153,0.6)" fontSize="9" fontFamily="monospace">target loss 1.90</text>
            </svg>
            <div className="absolute right-3 top-3 text-right font-mono">
              <div className="text-[9px] uppercase tracking-widest text-slate-500">loss</div>
              <div className="text-2xl font-semibold tabular-nums text-violet-200">{cur.toFixed(3)}</div>
            </div>
            <div className="absolute left-3 bottom-3 font-mono text-[10px] text-slate-500">
              step {Math.round(frac * 100 * (10 + r.params))}% · {r.lossLog.length} checkpoints
            </div>
          </div>
          <div className="mt-3">
            <Bar v={frac} tone="violet" h={8} label={`compute consumed · ${(r.computeDone).toFixed(0)} / ${r.computeNeeded.toFixed(0)}`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KV k="Elapsed" v={`${s.week - r.startedWeek} wk`} />
            <KV k="ETA" v={eta > 900 ? "—" : `${eta.toFixed(1)} wk`} tone={eta > 20 ? "warn" : "n"} />
            <KV k="Allocated" v={`${d.trainUnits} units`} />
            <KV k="Throughput" v={`${d.trainTf.toFixed(1)} tf/wk`} tone={d.thermal > 1 ? "bad" : "n"} />
          </div>
          {d.thermal > 1 && (
            <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 font-mono text-[10px] text-rose-200">
              THERMAL OVERLOAD {d.thermal.toFixed(2)}× — the run is derated to {(d.efficiency * 100).toFixed(0)}% and hardware is degrading. Build cooling.
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Btn kind="danger" onClick={() => dispatch({ t: "cancelRun" })}>Abort run</Btn>
          </div>
        </Panel>

        <Panel title="Run Log">
          {r.notes.length === 0 ? (
            <p className="text-xs text-slate-500">Nothing anomalous. Yet.</p>
          ) : (
            <ul className="space-y-2">
              {r.notes.map((n, i) => (
                <li key={i} className="border-l-2 border-violet-400/50 pl-2 text-[11px] leading-snug text-slate-300">{n}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Emergent Behaviour">
          {r.emergent.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              Capability thresholds are crossed at roughly 30%, 55% and 80% of the run. What you find there is not something you chose.
            </p>
          ) : (
            <div className="space-y-2">
              {r.emergent.map((e) => (
                <div key={e} className="rounded-md border border-violet-400/30 bg-violet-400/10 p-2">
                  <div className="text-xs font-semibold text-violet-100">{e}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Contention">
          <p className="text-[11px] leading-relaxed text-slate-400">
            {d.trainUnits} of {d.units} accelerators are on this run. Inference is down to {fmtCalls(d.inferCapK)} calls/week
            {d.inferCapK < 20000 ? " — customers will notice." : "."}
          </p>
          <div className="mt-3">
            <Slider label="Inference share of remainder" value={s.inferenceShare} min={0} max={1} step={0.05} onChange={(v) => dispatch({ t: "inferenceShare", v })} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
          <div className="mt-3 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">Weekly revenue</span><span className="text-emerald-300">{fmtK(s.revenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Weekly burn</span><span className="text-rose-300">{fmtK(d.expenses)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Run spend to date</span><span className="text-slate-300">{fmtK(r.spend)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">{children}</div>;
}
export function KV({ k, v, tone = "n", big }: { k: string; v: string; tone?: string; big?: boolean }) {
  const t: Record<string, string> = { n: "text-slate-100", good: "text-emerald-300", bad: "text-rose-300", warn: "text-amber-300", cyan: "text-cyan-200" };
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{k}</span>
      <span className={cn("font-mono tabular-nums", big ? "text-xl font-semibold" : "text-xs", t[tone] ?? t.n)}>{v}</span>
    </div>
  );
}
