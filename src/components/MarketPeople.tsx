import { useGame } from "../game/store";
import { Bar, Btn, Panel, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtCalls, fmtK, segmentFit } from "../game/engine";
import { RESEARCHER_POOL_NOTES } from "../game/content";
import { KV } from "./TrainPanel";
import type { Researcher } from "../game/types";

/* =============================== MARKET =============================== */

export function MarketPanel() {
  const { s, d, dispatch } = useGame();
  const live = s.models.filter((m) => m.status === "released");
  const hist = s.revenueHistory.slice(-40);

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <Panel title="Segments" sub="Demand is a function of capability, trust, eval gates, price and how loudly anyone has heard of you.">
          {live.length === 0 ? (
            <p className="text-xs text-slate-500">No model released. There is nothing to sell.</p>
          ) : (
            <div className="space-y-3">
              {s.segments.map((seg) => {
                const best = live.reduce((acc, m) => (segmentFit(m, seg, s, d) > segmentFit(acc, seg, s, d) ? m : acc), live[0]);
                const fit = segmentFit(best, seg, s, d);
                const unlocked = best.capability >= seg.minCapability * 0.85 && s.trust >= seg.minTrust - 32 && best.evalsPassed >= seg.needsEvals;
                return (
                  <div key={seg.id} className={cn("rounded-md border p-3", unlocked ? "border-white/10 bg-white/[0.02]" : "border-white/5 bg-black/20 opacity-60")}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{seg.name}</div>
                        <div className="text-[10px] text-slate-500">{seg.note}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {best.capability < seg.minCapability && <Tag tone="rose">needs cap {seg.minCapability}</Tag>}
                        {s.trust < seg.minTrust && <Tag tone="amber">needs trust {seg.minTrust}</Tag>}
                        {best.evalsPassed < seg.needsEvals && <Tag tone="violet">needs {seg.needsEvals} gates</Tag>}
                        {unlocked && <Tag tone="emerald">served by {best.name}-{best.generation}.0</Tag>}
                      </div>
                    </div>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                      <div>
                        <Bar v={Math.min(1, best.capability / (seg.minCapability * 1.6))} tone="cyan" label="capability fit" />
                      </div>
                      <div>
                        <Bar v={Math.min(1, s.trust / (seg.minTrust + 20))} tone="emerald" label="trust fit" />
                      </div>
                      <div>
                        <Bar v={Math.min(1, best.evalsPassed / Math.max(1, seg.needsEvals))} tone="violet" label="eval gates" />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
                      <span>ref price ${seg.ref.toFixed(2)}/1k · elasticity {seg.priceSens.toFixed(2)}</span>
                      <span className="text-cyan-300">demand ≈ {fit.toFixed(0)}k calls/wk @ ${best.price.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Operating Posture">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>Inference share of idle fleet</span><span className="text-cyan-200">{Math.round(s.inferenceShare * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={s.inferenceShare} onChange={(e) => dispatch({ t: "inferenceShare", v: parseFloat(e.target.value) })} className="ga-slider w-full" style={{ background: `linear-gradient(90deg,#22d3ee88 ${s.inferenceShare * 100}%,rgba(255,255,255,.08) ${s.inferenceShare * 100}%)`, ["--accent" as never]: "#22d3ee" }} />
              <p className="text-[10px] leading-snug text-slate-500">Idle accelerators still cost power. Serving costs more power and earns revenue. There is no fourth option.</p>
            </div>
            <div className="space-y-1.5">
              <KV k="Weekly revenue" v={fmtK(s.revenue)} tone="good" />
              <KV k="Weekly expenses" v={fmtK(d.expenses)} tone="bad" />
              <KV k="Net" v={fmtK(s.revenue - d.expenses)} tone={s.revenue - d.expenses > 0 ? "good" : "bad"} />
              <KV k="Annual run rate" v={`$${(s.revenue * 52 / 1000).toFixed(2)}B`} />
              <KV k="Valuation estimate" v={`$${s.valuation.toFixed(2)}B`} tone="cyan" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Revenue">
          <div className="flex items-end justify-between">
            <div className="font-mono text-3xl font-semibold tabular-nums text-emerald-300">{fmtK(s.revenue)}</div>
            <div className="font-mono text-[10px] text-slate-500">per week</div>
          </div>
          <div className="mt-3">
            <Sparkline data={hist} tone="#34d399" />
          </div>
          <div className="mt-3 space-y-1.5 font-mono text-[11px]">
            <KV k="Serving capacity" v={`${fmtCalls(d.inferCapK)} calls/wk`} />
            <KV k="Demand" v={`${fmtCalls(d.demandK)} calls/wk`} />
            <KV k="Utilisation" v={`${(s.fleetUtil * 100).toFixed(0)}%`} tone={s.fleetUtil > 0.8 ? "good" : "warn"} />
            <KV k="Uptime" v={`${(s.uptime * 100).toFixed(2)}%`} tone={s.uptime > 0.995 ? "good" : "bad"} />
            <KV k="Quarterly profit streak" v={`${s.quartersProfitable}`} />
          </div>
          {d.demandK > d.inferCapK * 1.15 && (
            <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-2 font-mono text-[10px] text-amber-200">
              OVERSUBSCRIBED — demand {(d.demandK / Math.max(1, d.inferCapK)).toFixed(1)}× capacity. You are turning away revenue. Buy accelerators or raise prices.
            </p>
          )}
        </Panel>
        <Panel title="Pricing">
          {live.length === 0 ? (
            <p className="text-xs text-slate-500">Release a model to set a price.</p>
          ) : (
            <div className="space-y-2">
              {live.map((m) => (
                <div key={m.id} className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-100">{m.name}-{m.generation}.0</span>
                    <span className="font-mono text-[10px] text-cyan-300">${m.price.toFixed(2)}/1k</span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {[0.3, 0.8, 2, 4, 7.5].map((p) => (
                      <Btn key={p} className="flex-1 px-1" onClick={() => dispatch({ t: "setPrice", modelId: m.id, price: p })}>${p}</Btn>
                    ))}
                  </div>
                  <div className="mt-1.5 font-mono text-[9px] text-slate-500">lifetime {fmtK(m.revenue)} · cap {m.capability.toFixed(1)} · {m.evalsPassed} gates</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Sparkline({ data, tone }: { data: number[]; tone: string }) {
  if (data.length < 2) return <div className="h-16 rounded bg-white/5" />;
  const w = 260, h = 64;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 64 }}>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={tone} opacity={0.15} />
      <polyline points={pts.join(" ")} fill="none" stroke={tone} strokeWidth={1.6} />
    </svg>
  );
}

/* =============================== PEOPLE =============================== */

const FIELD_TONE: Record<string, string> = { capability: "cyan", alignment: "emerald", interp: "violet", infra: "amber", data: "rose" };

export function PeoplePanel() {
  const { s, d, dispatch } = useGame();

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-2">
      <div className="space-y-3">
        <Panel title="Research Staff" sub={`${s.researchers.length} researchers · ${fmtK(d.salaries)}/wk payroll`}>
          {s.researchers.length === 0 ? (
            <p className="text-xs text-slate-500">Nobody works here. Hire someone below.</p>
          ) : (
            <div className="space-y-2">
              {s.researchers.map((r) => (
                <div key={r.id} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{r.name}</span>
                      <Tag tone={FIELD_TONE[r.field]}>{r.field}</Tag>
                      <span className="font-mono text-[10px] text-slate-500">skill {r.skill}/10</span>
                      {r.ego > 0.75 && <Tag tone="amber">high ego</Tag>}
                    </div>
                    <span className="font-mono text-[10px] text-cyan-300">${(r.salary * 52).toFixed(0)}k/yr</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Bar v={r.burnout} tone={r.burnout > 0.6 ? "rose" : "amber"} label="burnout" />
                    <Bar v={r.morale} tone={r.morale > 0.5 ? "emerald" : "rose"} label="morale" />
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="font-mono text-[9px] text-slate-600">{RESEARCHER_POOL_NOTES[r.field]}</span>
                    <div className="flex gap-1.5">
                      <Btn kind="ghost" disabled={s.cash < 18} onClick={() => dispatch({ t: "rest", id: r.id })} title="Sabbatical: 18k, -45% burnout">Rest</Btn>
                      <Btn kind="danger" onClick={() => dispatch({ t: "fire", id: r.id })}>Let go</Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Team Composition" sub="Capability and alignment compete for the same people and the same GPUs.">
          <div className="space-y-2">
            {(["capability", "alignment", "interp", "infra", "data"] as const).map((f) => {
              const staff = s.researchers.filter((r) => r.field === f);
              const weight = staff.reduce((a, r) => a + r.skill * (0.55 + 0.45 * r.morale) * (1 - 0.45 * r.burnout), 0);
              return (
                <div key={f} className="flex items-center gap-3">
                  <span className="w-24 font-mono text-[10px] uppercase tracking-wider text-slate-500">{f}</span>
                  <div className="flex-1"><Bar v={weight} max={Math.max(12, d.capabilityStaff)} tone={f === "alignment" ? "emerald" : f === "capability" ? "cyan" : f === "interp" ? "violet" : f === "infra" ? "amber" : "rose"} /></div>
                  <span className="w-20 text-right font-mono text-[10px] text-slate-400">{staff.length}p · {weight.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            <b className="text-slate-300">Capability</b> raises model scores. <b className="text-slate-300">Alignment</b> lowers latent risk and makes evals pass.
            <b className="text-slate-300"> Interpretability</b> reveals traits. <b className="text-slate-300">Infra</b> raises fleet efficiency and prevents cascade failures.
            <b className="text-slate-300"> Data</b> improves mixes and reduces contamination and legal exposure.
          </p>
        </Panel>
      </div>

      <Panel title="Hiring Market" sub="Refreshes every four weeks. Ego raises the price; skill raises everything else.">
        <div className="space-y-2">
          {s.candidates.map((r: Researcher) => (
            <div key={r.id} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{r.name}</span>
                  <Tag tone={FIELD_TONE[r.field]}>{r.field}</Tag>
                  <span className="font-mono text-[10px] text-slate-500">skill {r.skill}/10</span>
                </div>
                <span className="font-mono text-[10px] text-cyan-300">${(r.salary * 52).toFixed(0)}k/yr</span>
              </div>
              <div className="mt-1 font-mono text-[9px] text-slate-600">
                {RESEARCHER_POOL_NOTES[r.field]}
                {r.ego > 0.7 && " · Known to be difficult about authorship order."}
              </div>
              <div className="mt-2 flex justify-end">
                <Btn kind="primary" onClick={() => dispatch({ t: "hire", r })}>Hire</Btn>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
