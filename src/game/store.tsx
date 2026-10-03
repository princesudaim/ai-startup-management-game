import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { GameState } from "./types";
import { apply, newGameFull, type Action } from "./sim";
import { derive, type Derived } from "./engine";

interface Ctx {
  s: GameState;
  d: Derived;
  dispatch: (a: Action) => void;
}
const GameCtx = createContext<Ctx | null>(null);

function reducer(s: GameState, a: Action): GameState {
  if (a.t === "restart") return newGameFull();
  try {
    return apply(s, a);
  } catch (e) {
    console.error("action failed", a, e);
    return s;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [s, raw] = useReducer(reducer, undefined, () => newGameFull());
  const dispatch = React.useCallback((a: Action) => raw(a), []);
  const d = useMemo(() => derive(s), [s]);
  const ref = useRef(s);
  ref.current = s;

  useEffect(() => {
    if (s.paused || s.ending || s.queue.length) return;
    const ms = s.speed === 3 ? 550 : s.speed === 2 ? 1100 : 1900;
    const id = window.setInterval(() => {
      if (ref.current.paused || ref.current.ending || ref.current.queue.length) return;
      raw({ t: "tick" });
    }, ms);
    return () => window.clearInterval(id);
  }, [s.paused, s.speed, s.ending, s.queue.length]);

  return <GameCtx.Provider value={{ s, d, dispatch }}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("no game ctx");
  return c;
}
