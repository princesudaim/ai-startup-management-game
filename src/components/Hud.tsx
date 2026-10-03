import { useGame } from "../game/store";
import { cn } from "../utils/cn";
import { fmtK } from "../game/engine";
import { OBJECTIVES, objectiveIndex } from "../game/engine";
import type { Tab } from "../game/types";

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: "lab", label: "Lab", glyph: "▦" },
  { id: "train", label: "Train", glyph: "◈" },
  { id: "models", label: "Models", glyph: "◇" },
  { id: "market", label: "Market", glyph: "⌁" },
  { id: "people", label: "People", glyph: "☗" },
  { id: "world", label: "World", glyph: "◎" },
  { id: "board", label: "Board", glyph: "▤" },
];

export default function Hud({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { s, d, dispatch } = useGame();
  const idx = objectiveIndex(s);
  const obj = OBJECTIVES[idx];
  const net = s.revenue - d.expenses;
  const weeksLeft = 260 - s.week;

  return (
    <header className="z-30 shrink-0 border-b border-white/10 bg-[#080b11]/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_20px_-6px] shadow-cyan-500">
            <span className="text-sm font-black text-[#05070b]">GA</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-slate-100">Gradient Ascent</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Founder · Head of Research</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Metric label="Week" value={`${s.week}`} sub={`${s.year}Y · ${weeksLeft} left`} />
          <Metric label="Cash" value={fmtK(s.cash)} tone={s.cash < 300 ? "bad" : s.cash < 0 ? "bad" : "good"} sub={`net ${fmtK(net)}/wk`} />
          <Metric label="Revenue" value={fmtK(s.revenue)} tone="good" sub={`valuation $${s.valuation.toFixed(2)}B`} />
          <Metric label="Trust" value={s.trust.toFixed(0)} tone={s.trust > 65 ? "good" : s.trust < 35 ? "bad" : "warn"} sub={`heat ${s.heatHome.toFixed(0)}`} />
          <Metric label="Capability" value={s.bestCap.toFixed(1)} tone="cyan" sub={`tech lv ${s.techLevel}`} />
          <Metric label="Fleet" value={`${d.units}u`} tone={d.thermal > 1 ? "bad" : "n"} sub={`${d.tf.toFixed(0)} tf · ${(d.thermal * 100).toFixed(0)}% therm`} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {s.paused && s.week <= 2 && s.models.length === 0 && (
            <span className="mr-2 hidden items-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-cyan-200 sm:flex">
              <span className="ga-blink">▶</span> press play to run week 1
            </span>
          )}
          {s.run && (
            <span className="mr-1 hidden rounded border border-violet-400/40 bg-violet-400/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-violet-200 sm:inline">
              <span className="ga-blink">●</span> run {Math.min(100, (s.run.computeDone / s.run.computeNeeded) * 100).toFixed(0)}%
            </span>
          )}
          <SpeedBtn on={s.paused} onClick={() => dispatch({ t: "pause", v: !s.paused })} glyph={s.paused ? "▶" : "❚❚"} title={s.paused ? "Resume" : "Pause"} />
          {[1, 2, 3].map((v) => (
            <SpeedBtn key={v} on={!s.paused && s.speed === v} onClick={() => dispatch({ t: "speed", v })} glyph={`${v}×`} title={`Speed ${v}`} />
          ))}
        </div>
      </div>

      <div className="flex items-stretch gap-1 overflow-x-auto border-t border-white/[0.06] px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              tab === t.id ? "text-cyan-200" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="text-xs">{t.glyph}</span>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-cyan-400" />}
            {t.id === "models" && s.models.some((m) => m.status === "evaluating") && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 px-2 py-1.5">
          {s.queue.length > 0 ? (
            <span className="rounded border border-rose-400/40 bg-rose-400/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-rose-200">
              decision required
            </span>
          ) : (
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-slate-500 lg:inline">
              {idx + 1}/{OBJECTIVES.length} · {obj?.label}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value, sub, tone = "n" }: { label: string; value: string; sub?: string; tone?: string }) {
  const t: Record<string, string> = { n: "text-slate-100", good: "text-emerald-300", bad: "text-rose-300", warn: "text-amber-300", cyan: "text-cyan-200" };
  return (
    <div className="leading-tight">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={cn("font-mono text-sm font-semibold tabular-nums", t[tone])}>{value}</div>
      {sub && <div className="font-mono text-[9px] text-slate-600">{sub}</div>}
    </div>
  );
}

function SpeedBtn({ on, onClick, glyph, title }: { on: boolean; onClick: () => void; glyph: string; title: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-7 w-8 place-items-center rounded border font-mono text-[10px] transition-all",
        on ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-200"
      )}
    >
      {glyph}
    </button>
  );
}
