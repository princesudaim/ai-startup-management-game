import { useState } from "react";
import { useGame } from "../game/store";
import { EVALS, TRAIT_INFO } from "../game/content";
import { Bar, Btn, Panel, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtCalls, fmtK } from "../game/engine";
import type { Model, ModelTraits } from "../game/types";
import { KV } from "./TrainPanel";

const TRAITS: (keyof ModelTraits)[] = ["hallucination", "misuse", "deception", "sycophancy", "instability"];

export default function ModelsPanel() {
  const { s, d } = useGame();
  const [selId, setSelId] = useState<string | null>(s.models[0]?.id ?? null);
  const [price, setPrice] = useState<number | null>(null);
  const m = s.models.find((x) => x.id === selId) ?? s.models[0];

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[260px_1fr]">
      <div className="space-y-3">
        <Panel title="Model Registry" sub={`${s.models.length} generations trained`}>
          {s.models.length === 0 ? (
            <p className="text-xs text-slate-500">No models yet. Plan a run on the TRAIN tab.</p>
          ) : (
            <div className="space-y-1.5">
              {s.models.map((x) => (
                <button
                  key={x.id}
                  onClick={() => { setSelId(x.id); setPrice(null); }}
                  className={cn(
                    "w-full rounded-md border p-2 text-left transition-all",
                    m?.id === x.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-white/10 bg-white/[0.02] hover:border-cyan-400/30"
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-100">{x.name}-{x.generation}.0</span>
                    <span className="font-mono text-[10px] text-cyan-300">cap {x.capability.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag tone={x.status === "released" ? "emerald" : x.status === "evaluating" ? "amber" : x.status === "shelved" ? "slate" : "cyan"}>{x.status}</Tag>
                    <span className="font-mono text-[9px] text-slate-500">{x.params}B</span>
                    <span className="font-mono text-[9px] text-slate-500">{x.evalsPassed} gates</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Fleet Contention">
          <p className="text-[11px] leading-snug text-slate-400">Training and inference share one fleet. Runs take accelerators away from paying customers.</p>
          <div className="mt-3 space-y-2">
            <Bar v={d.trainUnits} max={Math.max(1, d.units)} tone="violet" label="training" />
            <Bar v={(d.units - d.trainUnits) * s.inferenceShare} max={Math.max(1, d.units)} tone="cyan" label="inference" />
            <Bar v={d.units} max={Math.max(1, d.slots)} tone="emerald" label="slots filled" />
          </div>
        </Panel>
      </div>

      {!m ? (
        <Panel title="No model selected"><p className="text-xs text-slate-500">Train something first.</p></Panel>
      ) : (
        <ModelDetail m={m} price={price} setPrice={setPrice} />
      )}
    </div>
  );
}

function ModelDetail({ m, price, setPrice }: { m: Model; price: number | null; setPrice: (v: number | null) => void }) {
  const { s, d, dispatch } = useGame();
  const p = price ?? m.price;
  const hiddenCount = TRAITS.filter((k) => !m.revealed[k]).length;
  const hazard = TRAITS.reduce((a, k) => a + m.traits[k], 0) / 5;

  return (
    <div className="space-y-3">
      <Panel
        title={`${m.name}-${m.generation}.0`}
        sub={`${m.params}B · ${m.arch} · trained week ${m.bornWeek} · cost ${fmtK(m.trainingCost)}`}
        right={<Tag tone={m.status === "released" ? "emerald" : m.status === "evaluating" ? "amber" : "slate"}>{m.status}</Tag>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <KV k="Capability" v={m.capability.toFixed(1)} tone="cyan" big />
            <div className="mt-2 space-y-1.5">
              <KV k="Data quality" v={`${(m.quality * 100).toFixed(0)}%`} />
              <KV k="Safety share at train" v={`${Math.round(m.safetyShare * 100)}%`} />
              <KV k="Eval gates passed" v={`${m.evalsPassed}`} tone={m.evalsPassed >= 3 ? "good" : "warn"} />
              <KV k="Lifetime revenue" v={fmtK(m.revenue)} tone="good" />
              <KV k="Unmeasured traits" v={`${hiddenCount} / 5`} tone={hiddenCount > 2 ? "bad" : hiddenCount > 0 ? "warn" : "good"} />
            </div>
            {m.hiddenGem && (
              <div className="mt-3 rounded-md border border-violet-400/30 bg-violet-400/10 p-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-violet-300">emergent</div>
                <div className="text-xs text-violet-100">{m.hiddenGem}</div>
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Trait Profile</div>
            <div className="space-y-2">
              {TRAITS.map((k) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <span className={cn("text-[11px]", m.revealed[k] ? "text-slate-200" : "text-slate-600")}>
                      {TRAIT_INFO[k].name}
                      {!m.revealed[k] && <span className="ml-1.5 font-mono text-[9px] text-amber-500/80">UNMEASURED</span>}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-slate-400">{m.revealed[k] ? (m.traits[k] * 100).toFixed(0) + "%" : "??"}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn("h-full rounded-full", m.revealed[k] ? (m.traits[k] > 0.45 ? "bg-rose-500" : m.traits[k] > 0.25 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-700")}
                      style={{ width: (m.revealed[k] ? m.traits[k] : 0.35) * 100 + "%" }}
                    />
                  </div>
                  {m.revealed[k] && <p className="mt-1 text-[10px] leading-snug text-slate-500">{TRAIT_INFO[k].desc}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Evaluation Gates" sub="Reveals traits. Gates unlock market segments.">
          <div className="space-y-2">
            {EVALS.map((ev) => {
              const times = m.evals.filter((e) => e.id === ev.id).length;
              const cost = Math.round(ev.cost * (1 + times * 0.9) * (1 + m.params / 90));
              return (
                <div key={ev.id} className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">{ev.name}</span>
                    <span className="font-mono text-[10px] text-cyan-300">{fmtK(cost)}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-500">{ev.desc}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex gap-1">
                      {m.evals.filter((e) => e.id === ev.id).map((e, i) => (
                        <Tag key={i} tone={e.passed ? "emerald" : "rose"}>{e.passed ? "PASS" : "FAIL"} {e.score}</Tag>
                      ))}
                      {times === 0 && <Tag>not run</Tag>}
                    </div>
                    <Btn disabled={s.cash < cost} onClick={() => dispatch({ t: "runEval", modelId: m.id, evalId: ev.id })}>
                      {times > 0 ? "Re-run" : "Run"}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-snug text-slate-500">
            Re-running a failed gate is cheaper than a news cycle. Interpretability audits are {(d.interpLab ? "" : "20 points ")}weaker without an Interpretability Suite.
          </p>
        </Panel>

        <Panel title="Deployment" sub="Pricing, release and retirement">
          {m.status === "released" ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <span>Price per 1k calls</span><span className="text-cyan-200">${p.toFixed(2)}</span>
                </div>
                <input type="range" min={0.1} max={12} step={0.05} value={p} onChange={(e) => setPrice(parseFloat(e.target.value))} className="ga-slider w-full" style={{ background: `linear-gradient(90deg, #22d3ee88 ${(p / 12) * 100}%, rgba(255,255,255,.08) ${(p / 12) * 100}%)`, ["--accent" as never]: "#22d3ee" }} />
                <div className="mt-1.5 flex justify-between font-mono text-[9px] text-slate-600"><span>$0.10 hobbyist floor</span><span>$12.00 regulated</span></div>
              </div>
              <Btn kind="primary" className="w-full" onClick={() => { dispatch({ t: "setPrice", modelId: m.id, price: p }); setPrice(null); }}>Apply price</Btn>
              <div className="grid grid-cols-2 gap-2">
                <KV k="Serving" v={`${fmtCalls(d.inferCapK)} calls/wk`} />
                <KV k="Uptime" v={`${(s.uptime * 100).toFixed(1)}%`} tone={s.uptime > 0.99 ? "good" : "warn"} />
                <KV k="Gates" v={`${m.evalsPassed}`} />
                <KV k="Risk index" v={`${(hazard * 100).toFixed(0)}%`} tone={hazard > 0.4 ? "bad" : "warn"} />
              </div>
              <Btn kind="danger" className="w-full" onClick={() => dispatch({ t: "shelve", modelId: m.id })}>Shelve (stop serving)</Btn>
            </div>
          ) : m.status === "shelved" ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-400">Shelved. Not served, not earning, not dangerous.</p>
              <Btn kind="primary" className="w-full" onClick={() => dispatch({ t: "release", modelId: m.id, price: p })}>Re-release</Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <span>Launch price / 1k calls</span><span className="text-cyan-200">${p.toFixed(2)}</span>
                </div>
                <input type="range" min={0.1} max={12} step={0.05} value={p} onChange={(e) => setPrice(parseFloat(e.target.value))} className="ga-slider w-full" style={{ background: `linear-gradient(90deg, #22d3ee88 ${(p / 12) * 100}%, rgba(255,255,255,.08) ${(p / 12) * 100}%)`, ["--accent" as never]: "#22d3ee" }} />
              </div>
              <div className={cn("rounded-md border p-2 font-mono text-[10px] leading-snug", hiddenCount >= 3 ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200")}>
                {hiddenCount >= 3
                  ? `RELEASING WITH ${hiddenCount} UNMEASURED TRAITS — you are betting the company that none of them is a headline.`
                  : hiddenCount === 0
                  ? "FULLY EVALUATED — the safety case is complete. Regulators and enterprise buyers will notice."
                  : `${hiddenCount} trait(s) unmeasured. Cheap to fix now, expensive to fix on a Tuesday.`}
              </div>
              <Btn kind="primary" className="w-full py-2.5" onClick={() => dispatch({ t: "release", modelId: m.id, price: p })}>
                Release {m.name}-{m.generation}.0
              </Btn>
            </div>
          )}
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Gate Requirements By Segment</div>
            <div className="space-y-1 font-mono text-[10px]">
              {s.segments.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between">
                  <span className={cn(m.evalsPassed >= seg.needsEvals && m.capability >= seg.minCapability ? "text-emerald-300" : "text-slate-500")}>
                    {seg.name}
                  </span>
                  <span className="text-slate-600">{seg.needsEvals} gates · cap {seg.minCapability} · trust {seg.minTrust}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
