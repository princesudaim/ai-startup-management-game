import React from "react";
import { cn } from "../utils/cn";

export function Panel({ title, right, children, className, sub }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; sub?: string }) {
  return (
    <div className={cn("rounded-lg border border-white/10 bg-[#0d1117]/80 backdrop-blur-sm", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">{title}</div>
            {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

export function Btn({
  children, onClick, kind = "default", disabled, className, title,
}: {
  children: React.ReactNode; onClick?: () => void; kind?: "default" | "primary" | "ghost" | "danger" | "warn";
  disabled?: boolean; className?: string; title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-35";
  const kinds = {
    default: "border border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200",
    primary: "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_-6px] shadow-cyan-500/50 hover:bg-cyan-400/25",
    ghost: "text-slate-400 hover:text-slate-100",
    danger: "border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
    warn: "border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20",
  };
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={cn(base, kinds[kind], className)}>
      {children}
    </button>
  );
}

export function Stat({ label, value, tone = "n", hint }: { label: string; value: React.ReactNode; tone?: "n" | "good" | "bad" | "warn"; hint?: string }) {
  const tones = { n: "text-slate-100", good: "text-emerald-300", bad: "text-rose-300", warn: "text-amber-300" };
  return (
    <div title={hint} className="min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={cn("truncate font-mono text-sm font-semibold tabular-nums", tones[tone])}>{value}</div>
    </div>
  );
}

export function Bar({ v, max = 1, tone = "cyan", h = 6, label }: { v: number; max?: number; tone?: string; h?: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, v / max)) * 100;
  const colors: Record<string, string> = {
    cyan: "from-cyan-500 to-sky-400",
    emerald: "from-emerald-500 to-teal-400",
    rose: "from-rose-500 to-orange-400",
    amber: "from-amber-500 to-yellow-400",
    violet: "from-violet-500 to-fuchsia-400",
  };
  return (
    <div>
      {label && <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500"><span>{label}</span><span className="tabular-nums">{Math.round(pct)}%</span></div>}
      <div className="w-full overflow-hidden rounded-full bg-white/5" style={{ height: h }}>
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", colors[tone] ?? colors.cyan)} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

export function Slider({
  value, onChange, min = 0, max = 1, step = 0.01, label, format, tone = "cyan",
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  label: string; format?: (v: number) => string; tone?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const accents: Record<string, string> = { cyan: "#22d3ee", emerald: "#34d399", rose: "#fb7185", amber: "#fbbf24", violet: "#a78bfa" };
  const c = accents[tone] ?? accents.cyan;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
        <span className="font-mono text-xs tabular-nums text-slate-200">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ga-slider w-full"
        style={{ background: `linear-gradient(90deg, ${c}88 ${pct}%, rgba(255,255,255,.08) ${pct}%)`, ["--accent" as never]: c }}
      />
    </div>
  );
}

export function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "border-white/15 bg-white/5 text-slate-300",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  };
  return <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", tones[tone] ?? tones.slate)}>{children}</span>;
}

export function Spark({ data, w = 120, h = 30, tone = "#22d3ee", fill = true }: { data: number[]; w?: number; h?: number; tone?: string; fill?: boolean }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 3) - 1.5]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      {fill && <polygon points={`0,${h} ${line} ${w},${h}`} fill={tone} opacity={0.13} />}
      <polyline points={line} fill="none" stroke={tone} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={tone} />
    </svg>
  );
}
