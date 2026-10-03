import { useGame } from "../game/store";
import { Btn, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtK } from "../game/engine";

const KIND_TONE: Record<string, string> = {
  hallucination: "rose", jailbreak: "rose", outage: "amber", lawsuit: "amber", contamination: "violet",
  misuse: "rose", leak: "rose", whistleblower: "rose", heatwave: "amber", hardware: "amber",
  poach: "cyan", rival: "violet", regulator: "amber", press: "cyan", opportunity: "emerald", training: "violet",
};

export function EventModal() {
  const { s, dispatch } = useGame();
  const ev = s.queue[0];
  if (!ev || s.ending) return null;
  const tone = KIND_TONE[ev.kind] ?? "slate";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="ga-in w-full max-w-2xl overflow-hidden rounded-xl border border-white/15 bg-[#0a0e15] shadow-2xl">
        <div className={cn("flex items-center justify-between border-b px-5 py-3",
          tone === "rose" ? "border-rose-500/30 bg-rose-500/10" : tone === "amber" ? "border-amber-400/30 bg-amber-400/10"
          : tone === "emerald" ? "border-emerald-400/30 bg-emerald-400/10" : tone === "violet" ? "border-violet-400/30 bg-violet-400/10"
          : "border-cyan-400/30 bg-cyan-400/10")}>
          <div className="flex items-center gap-2">
            <span className="ga-blink h-2 w-2 rounded-full bg-current text-rose-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">{ev.tag} · WEEK {ev.week}</span>
          </div>
          <Tag tone={tone}>{ev.kind.replace("_", " ")}</Tag>
        </div>
        <div className="px-5 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">{ev.title}</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{ev.body}</p>
          <div className="mt-5 space-y-2">
            {ev.choices.map((c, i) => {
              const afford = !c.cost || s.cash >= c.cost;
              return (
                <button
                  key={i}
                  disabled={!afford}
                  onClick={() => dispatch({ t: "resolve", instId: ev.instId, choice: i })}
                  className={cn(
                    "group w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-all",
                    afford ? "hover:border-cyan-400/50 hover:bg-cyan-400/[0.08]" : "cursor-not-allowed opacity-35"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-100 group-hover:text-cyan-100">{c.label}</span>
                    {!!c.cost && <span className="shrink-0 font-mono text-[11px] text-rose-300">−{fmtK(c.cost)}</span>}
                    {!c.cost && !!c.effects?.cash && <span className="shrink-0 font-mono text-[11px] text-emerald-300">+{fmtK(c.effects.cash)}</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{c.detail}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            <Tag>cash {fmtK(s.cash)}</Tag>
            <Tag tone="emerald">trust {s.trust.toFixed(0)}</Tag>
            <Tag tone="amber">heat {s.heatHome.toFixed(0)}</Tag>
            {s.queue.length > 1 && <Tag tone="rose">{s.queue.length - 1} more waiting</Tag>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EndingScreen() {
  const { s, dispatch } = useGame();
  if (!s.ending) return null;
  const win = s.ending.kind === "win" || s.ending.kind === "ipo";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 backdrop-blur">
      <div className="ga-in max-w-2xl rounded-xl border border-white/15 bg-[#0a0e15] p-8 shadow-2xl">
        <div className={cn("font-mono text-[10px] uppercase tracking-[0.28em]", win ? "text-emerald-400" : s.ending.kind === "draw" ? "text-amber-400" : "text-rose-400")}>
          {s.ending.kind === "draw" ? "Five Years" : win ? "Victory" : "Company Dissolved"}
        </div>
        <h1 className={cn("mt-2 text-4xl font-bold tracking-tight", win ? "text-emerald-200" : s.ending.kind === "draw" ? "text-amber-100" : "text-rose-200")}>
          {s.ending.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">{s.ending.body}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <End k="Weeks" v={`${s.week}`} />
          <End k="Capability" v={s.bestCap.toFixed(1)} />
          <End k="Trust" v={s.trust.toFixed(0)} />
          <End k="Incidents" v={`${s.incidentCount}`} />
          <End k="Models" v={`${s.models.length}`} />
          <End k="Released" v={`${s.models.filter((m) => m.status === "released").length}`} />
          <End k="Final cash" v={fmtK(s.cash)} />
          <End k="Valuation" v={`$${s.valuation.toFixed(2)}B`} />
        </div>
        <div className="mt-7 flex gap-2">
          <Btn kind="primary" className="px-5 py-2.5" onClick={() => dispatch({ t: "restart" })}>Run it again</Btn>
        </div>
      </div>
    </div>
  );
}

function End({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="font-mono text-lg font-semibold text-slate-100">{v}</div>
    </div>
  );
}

export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05070b] p-6">
      <div className="ga-grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="ga-in relative max-w-3xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-400/80">an isometric AI-lab tycoon</div>
        <h1 className="mt-3 text-6xl font-bold leading-none tracking-tighter text-transparent sm:text-7xl"
          style={{ backgroundImage: "linear-gradient(100deg,#22d3ee,#a78bfa 55%,#f0abfc)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
          GRADIENT<br />ASCENT
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
          Grow a garage AI lab into the lab that defines an era — one training run, one power bill, and one regretted shortcut at a time.
          You decide how fast to scale capability and how much to spend on keeping it safe. Every evaluation you skip is a loan against a future disaster.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            { h: "Build the lab", b: "Racks, power feeds, cooling. Keep utilisation high without cooking your uptime." },
            { h: "Train the model", b: "Scale, data mix, architecture, and the safety share. Watch the loss curve and pray." },
            { h: "Survive the world", b: "Eval gates, prices, rivals, regulators, jailbreaks and the evening news." },
          ].map((c) => (
            <div key={c.h} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">{c.h}</div>
              <div className="mt-1 text-[12px] leading-snug text-slate-400">{c.b}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onStart}
            className="rounded-md border border-cyan-400/50 bg-cyan-500/15 px-7 py-3 font-mono text-xs uppercase tracking-[0.2em] text-cyan-100 shadow-[0_0_30px_-8px] shadow-cyan-500/60 transition-all hover:bg-cyan-400/25"
          >
            Sign the lease ▸
          </button>
          <span className="font-mono text-[10px] text-slate-600">5-year horizon · three win states · three ways to lose the company</span>
        </div>
      </div>
    </div>
  );
}
