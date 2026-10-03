import { useState } from "react";
import { GameProvider, useGame } from "./game/store";
import Hud from "./components/Hud";
import IsoLab from "./components/IsoLab";
import TrainPanel from "./components/TrainPanel";
import ModelsPanel from "./components/ModelsPanel";
import { MarketPanel, PeoplePanel } from "./components/MarketPeople";
import { WorldPanel, BoardPanel } from "./components/WorldBoard";
import { EndingScreen, EventModal, Intro } from "./components/Overlays";
import { cn } from "./utils/cn";
import type { Tab } from "./game/types";

function Game() {
  const { s, dispatch } = useGame();
  const [tab, setTab] = useState<Tab>("lab");

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#05070b]">
      <Hud tab={tab} setTab={setTab} />
      <main className="relative min-h-0 flex-1 p-3">
        {tab === "lab" && <IsoLab />}
        {tab === "train" && <TrainPanel goModels={() => setTab("models")} />}
        {tab === "models" && <ModelsPanel />}
        {tab === "market" && <MarketPanel />}
        {tab === "people" && <PeoplePanel />}
        {tab === "world" && <WorldPanel />}
        {tab === "board" && <BoardPanel />}
      </main>
      <Ticker />
      {s.flags.awaitingStart && <Intro onStart={() => dispatch({ t: "raiseCapital" })} />}
      <EventModal />
      <EndingScreen />
    </div>
  );
}

function Ticker() {
  const { s } = useGame();
  const items = s.log.slice(0, 3);
  return (
    <footer className="z-20 flex shrink-0 items-center gap-3 border-t border-white/10 bg-[#080b11] px-4 py-1.5">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400/70">wire</span>
      <div className="flex min-w-0 flex-1 gap-6 overflow-hidden">
        {items.length === 0 && <span className="font-mono text-[10px] text-slate-600">—</span>}
        {items.map((l, i) => (
          <span key={i} className={cn(
            "truncate font-mono text-[10px]",
            i === 0 ? (l.tone === "bad" ? "text-rose-300" : l.tone === "good" ? "text-emerald-300" : l.tone === "major" ? "text-cyan-200" : "text-slate-400") : "text-slate-600"
          )}>
            W{l.week} · {l.text}
          </span>
        ))}
      </div>
      <span className="hidden shrink-0 font-mono text-[9px] text-slate-600 md:inline">
        {s.researchers.length} staff · {s.models.length} models · {s.incidentCount} incidents
      </span>
    </footer>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
