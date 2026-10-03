import React, { useState } from "react";
import { useGame } from "../game/store";
import { ACCELS, FACILITIES, GRID, RACKS } from "../game/content";
import { Btn, Panel, Tag } from "./ui";
import { cn } from "../utils/cn";
import { fmtCalls, fmtK } from "../game/engine";

const TILE = 58;

interface FaceCfg { w: number; h: number; transform: string; }

function Box({
  w, d, h, colors, children, className,
}: { w: number; d: number; h: number; colors: { top: string; a: string; b: string }; children?: React.ReactNode; className?: string }) {
  const faces: FaceCfg[] = [
    { w, h: d, transform: `translateZ(${h / 2}px)` },
    { w, h, transform: `rotateX(90deg) translateZ(${d / 2}px)` },
    { w, h, transform: `rotateX(-90deg) translateZ(${d / 2}px)` },
    { w: d, h, transform: `rotateY(90deg) translateZ(${w / 2}px)` },
    { w: d, h, transform: `rotateY(-90deg) translateZ(${w / 2}px)` },
  ];
  const bg = [colors.top, colors.a, colors.b, colors.a, colors.b];
  return (
    <div className={cn("iso-box", className)} style={{ transform: `translateZ(${h / 2}px)` }}>
      {faces.map((f, i) => (
        <div
          key={i}
          className="iso-face"
          style={{
            width: f.w, height: f.h, left: -f.w / 2, top: -f.h / 2,
            transform: f.transform, background: bg[i],
            border: "1px solid rgba(8,12,20,0.85)",
          }}
        >{i === 0 && children}</div>
      ))}
    </div>
  );
}

const FAC_STYLE: Record<string, { top: string; a: string; b: string; glyph: string; h: number }> = {
  crac: { top: "#1e3a5f", a: "#12283f", b: "#0d1e30", glyph: "❄", h: 34 },
  chiller: { top: "#155e75", a: "#0e3d4d", b: "#0a2c38", glyph: "❄", h: 52 },
  sub: { top: "#7c5c1a", a: "#4a3712", b: "#33250c", glyph: "⚡", h: 38 },
  interconnect: { top: "#a16207", a: "#5f4209", b: "#422e06", glyph: "⚡", h: 60 },
  interplab: { top: "#4c1d95", a: "#2e1065", b: "#1e0b45", glyph: "◎", h: 44 },
  security: { top: "#3f1d2b", a: "#29121c", b: "#1b0b12", glyph: "⛨", h: 40 },
};

export default function IsoLab() {
  const { s, d, dispatch } = useGame();
  const [sel, setSel] = useState<{ x: number; y: number } | null>({ x: 1, y: 1 });
  const [tool, setTool] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const sceneRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fit = () => {
      const el = sceneRef.current;
      if (!el) return;
      setZoom(Math.min(1.2, Math.max(0.32, Math.min(el.clientWidth / 800, el.clientHeight / 560))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const tile = sel ? s.grid.find((t) => t.x === sel.x && t.y === sel.y) : null;
  const rack = tile?.b && tile.b.kind === "rack" ? RACKS.find((r) => r.id === tile.b!.variant) : null;
  const fac = tile?.b && tile.b.kind !== "rack" ? FACILITIES.find((f) => f.id === tile.b!.variant) : null;
  const hot = d.thermal > 1;
  const size = GRID * TILE;

  const world: React.CSSProperties = {
    width: size, height: size, position: "absolute", left: "50%", top: "50%",
    transform: "translate(-50%,-52%) rotateX(58deg) rotateZ(45deg)",
  };

  function onTile(x: number, y: number) {
    const t = s.grid.find((g) => g.x === x && g.y === y)!;
    if (tool) {
      if (!t.unlocked) { dispatch({ t: "buyFloor", x, y }); return; }
      if (t.b) { setSel({ x, y }); setTool(null); return; }
      const kind = RACKS.some((r) => r.id === tool) ? "rack" : "facility";
      dispatch({ t: "build", x, y, variant: tool, kind });
      setTool(null);
      setSel({ x, y });
      return;
    }
    setSel({ x, y });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
      {/* ---- scene ---- */}
      <div className="relative min-h-[340px] min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#080c13] via-[#070a11] to-[#04060a]">
        <div className="ga-grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute left-3 top-3 z-20 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">
          Ravel Industrial Park · Unit 4 · {s.grid.filter((t) => t.b).length} structures
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-400">
          <span className={cn(d.thermal > 1 ? "text-rose-300" : "text-emerald-300")}>THERMAL {d.thermal.toFixed(2)}×</span>
          <span>POWER {d.itPower.toFixed(0)}/{d.powerCap.toFixed(0)} kW</span>
          <span>COOL {d.coolingCap.toFixed(0)} kW</span>
          <span>EFF {(d.efficiency * 100).toFixed(0)}%</span>
          <span>UPTIME {(s.uptime * 100).toFixed(1)}%</span>
        </div>
        <div className="iso-scene absolute inset-0" ref={sceneRef}>
          <div className="absolute left-1/2 top-1/2" style={{ transform: `scale(${zoom})`, transformStyle: "preserve-3d" }}>
          <div className="iso-world" style={world}>
            {s.grid.map((t) => {
              const isSel = sel && sel.x === t.x && sel.y === t.y;
              const b = t.b;
              const rt = b && b.kind === "rack" ? RACKS.find((r) => r.id === b.variant)! : null;
              const fill = rt && b ? (b.units ?? 0) / rt.slots : 0;
              const cond = b?.condition ?? 1;
              const heatTint = hot ? Math.min(0.5, Math.max(0, d.thermal - 1) * 0.6) : 0;
              return (
                <div
                  key={`${t.x}-${t.y}`}
                  className="iso-tile absolute"
                  style={{ left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE }}
                  onClick={() => onTile(t.x, t.y)}
                >
                  {/* floor plate */}
                  <div
                    className={cn(
                      "absolute inset-[2px] cursor-pointer transition-colors",
                      !t.unlocked
                        ? "border border-dashed border-white/10 bg-black/40"
                        : isSel
                        ? "bg-cyan-400/25 ring-1 ring-cyan-300/70"
                        : b
                        ? "bg-[#141b26]"
                        : "bg-[#0e141d] hover:bg-cyan-400/10"
                    )}
                  >
                    {!t.unlocked && (
                      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-slate-600">
                        ${45 + Math.round(Math.max(t.x, t.y) * 16)}k
                      </span>
                    )}
                  </div>
                  {b && rt && (
                    <Box
                      w={TILE - 10}
                      d={TILE - 10}
                      h={14 + 52 * Math.max(0.12, fill)}
                      colors={{
                        top: heatTint > 0 ? `rgb(${34 + heatTint * 180},${211 - heatTint * 160},${238 - heatTint * 120})` : cond > 0.6 ? "#1f6f8b" : cond > 0.3 ? "#6b5b2a" : "#7a3030",
                        a: "#101823",
                        b: "#0b1119",
                      }}
                    >
                      <div className="grid h-full w-full place-items-center">
                        <div className="grid grid-cols-4 gap-[2px] p-[6px]">
                          {Array.from({ length: Math.max(4, Math.min(16, Math.round(rt.slots / 6))) }).map((_, i) => {
                            const active = i / Math.min(16, Math.round(rt.slots / 6)) < fill;
                            const training = s.run && fill > 0;
                            return (
                              <span
                                key={i}
                                className={cn("h-[3px] w-[3px] rounded-[1px]", active ? (training ? "ga-led bg-fuchsia-300" : "bg-cyan-300") : "bg-slate-700")}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </Box>
                  )}
                  {b && !rt && FAC_STYLE[b.variant] && (
                    <Box
                      w={TILE - 14}
                      d={TILE - 14}
                      h={FAC_STYLE[b.variant].h}
                      colors={{ top: FAC_STYLE[b.variant].top, a: FAC_STYLE[b.variant].a, b: FAC_STYLE[b.variant].b }}
                    >
                      <div className="grid h-full w-full place-items-center text-base opacity-80">{FAC_STYLE[b.variant].glyph}</div>
                    </Box>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
        {tool && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center">
            <div className="ga-in rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-100">
              Placing {RACKS.find((r) => r.id === tool)?.name ?? FACILITIES.find((f) => f.id === tool)?.name} — click a tile
            </div>
          </div>
        )}
      </div>

      {/* ---- side rail ---- */}
      <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto pr-1 lg:w-[330px]">
        <Panel title="Construction" sub={tool ? "Click a tile to place" : "Select a structure, then a tile"}>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Compute Racks</div>
              <div className="space-y-1.5">
                {RACKS.map((r) => {
                  const afford = s.cash >= r.cost;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setTool(tool === r.id ? null : r.id)}
                      disabled={!afford}
                      className={cn(
                        "w-full rounded-md border p-2 text-left transition-all disabled:opacity-35",
                        tool === r.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-100">{r.name}</span>
                        <span className="font-mono text-[11px] text-cyan-300">{fmtK(r.cost)}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">{r.slots} slots · {r.upkeep}k/wk upkeep</div>
                      <div className="mt-1 text-[10px] leading-snug text-slate-500">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Facilities</div>
              <div className="space-y-1.5">
                {FACILITIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTool(tool === f.id ? null : f.id)}
                    disabled={s.cash < f.cost}
                    className={cn(
                      "w-full rounded-md border p-2 text-left transition-all disabled:opacity-35",
                      tool === f.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-white/[0.06]"
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-100">{f.name}</span>
                      <span className="font-mono text-[11px] text-cyan-300">{fmtK(f.cost)}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-emerald-300/80">{f.effect}</div>
                    <div className="mt-1 text-[10px] leading-snug text-slate-500">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {tile && !tile.b && (
          <Panel title={`Tile ${sel?.x},${sel?.y}`}>
            {tile.unlocked ? (
              <p className="text-xs leading-relaxed text-slate-400">Empty floor. Pick a structure above, then place it here.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Undeveloped slab. Preparing it costs money and takes no time.</p>
                <Btn kind="primary" onClick={() => dispatch({ t: "buyFloor", x: tile.x, y: tile.y })} disabled={s.cash < 45 + Math.max(tile.x, tile.y) * 16}>
                  Prepare floor — {fmtK(45 + Math.round(Math.max(tile.x, tile.y) * 16))}
                </Btn>
              </div>
            )}
          </Panel>
        )}

        {tile?.b && rack && (
          <Panel title={rack.name} sub={`${tile.b.units ?? 0}/${rack.slots} slots · condition ${Math.round((tile.b.condition ?? 1) * 100)}%`}>
            <p className="mb-3 text-[11px] leading-snug text-slate-500">{rack.desc}</p>
            <div className="space-y-2">
              {ACCELS.filter((g) => s.week >= g.from).map((g) => {
                const room = rack.slots - (tile.b!.units ?? 0);
                const cur = tile.b!.unitGen === g.id;
                return (
                  <div key={g.id} className={cn("rounded-md border p-2", cur ? "border-cyan-400/40 bg-cyan-400/5" : "border-white/10 bg-white/[0.02]")}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-100">{g.name}</span>
                      <Tag tone={cur ? "cyan" : "slate"}>{fmtK(g.price)}/unit</Tag>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-500">{g.tf.toFixed(1)} tf · {g.power.toFixed(2)} kW · {g.note}</div>
                    <div className="mt-2 flex gap-1.5">
                      {[1, 4, 8].map((n) => (
                        <Btn key={n} kind="default" disabled={room < n || s.cash < g.price * n} onClick={() => dispatch({ t: "buyUnits", x: tile.x, y: tile.y, gen: g.id, count: n })}>
                          +{n}
                        </Btn>
                      ))}
                      <Btn kind="ghost" disabled={!(tile.b!.units ?? 0)} onClick={() => dispatch({ t: "sellUnits", x: tile.x, y: tile.y, count: 1 })}>−1</Btn>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-1">
                <Btn kind="danger" onClick={() => dispatch({ t: "demolish", x: tile.x, y: tile.y })}>Demolish (+{fmtK(rack.cost * 0.3)})</Btn>
              </div>
            </div>
          </Panel>
        )}

        {tile?.b && fac && (
          <Panel title={fac.name} sub={`${fac.effect} · condition ${Math.round((tile.b.condition ?? 1) * 100)}%`}>
            <p className="mb-3 text-[11px] leading-snug text-slate-500">{fac.desc}</p>
            <Btn kind="danger" onClick={() => dispatch({ t: "demolish", x: tile.x, y: tile.y })}>Demolish (+{fmtK(fac.cost * 0.3)})</Btn>
          </Panel>
        )}

        <Panel title="Fleet Allocation">
          <div className="space-y-2 font-mono text-[11px]">
            <Row k="Accelerators" v={`${d.units}`} />
            <Row k="Raw throughput" v={`${d.tf.toFixed(1)} tf/wk`} />
            <Row k="Efficiency" v={`${(d.efficiency * 100).toFixed(0)}%${d.thermal > 1 ? " (thermal derate)" : ""}`} tone={d.thermal > 1 ? "bad" : "n"} />
            <Row k="Training" v={`${s.run ? d.trainUnits + " units" : "idle"}`} tone={s.run ? "violet" : "n"} />
            <Row k="Inference" v={`${(d.units - d.trainUnits).toFixed(0)} × ${Math.round(s.inferenceShare * 100)}%`} />
            <Row k="Capacity" v={`${fmtCalls(d.inferCapK)} calls/wk`} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ k, v, tone = "n" }: { k: string; v: string; tone?: string }) {
  const t: Record<string, string> = { n: "text-slate-200", bad: "text-rose-300", violet: "text-fuchsia-300" };
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{k}</span>
      <span className={t[tone] ?? t.n}>{v}</span>
    </div>
  );
}
