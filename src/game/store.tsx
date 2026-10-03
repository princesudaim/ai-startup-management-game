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
const SAVE_KEY = "gradient-ascent-save";
const SAVE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  return typeof value.week === "number"
    && typeof value.cash === "number"
    && Array.isArray(value.grid)
    && Array.isArray(value.researchers)
    && Array.isArray(value.models)
    && Array.isArray(value.rivals)
    && Array.isArray(value.regions)
    && Array.isArray(value.objectivesDone)
    && isRecord(value.flags);
}

function loadGame(): { state: GameState; canSave: boolean } {
  if (typeof window === "undefined") return { state: newGameFull(), canSave: false };
  try {
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (!saved) return { state: newGameFull(), canSave: true };
    const parsed: unknown = JSON.parse(saved);
    if (isRecord(parsed) && parsed.version === SAVE_VERSION && isGameState(parsed.state)) {
      return { state: parsed.state, canSave: true };
    }
    if (isGameState(parsed)) return { state: parsed, canSave: true };
    console.error("Saved game has an unsupported or invalid format; it was left untouched.");
    return { state: newGameFull(), canSave: false };
  } catch (e) {
    console.error("Could not load the saved game; it was left untouched.", e);
    return { state: newGameFull(), canSave: false };
  }
}

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
  const [initial] = React.useState(loadGame);
  const [s, raw] = useReducer(reducer, initial.state);
  const canSave = useRef(initial.canSave);
  const dispatch = React.useCallback((a: Action) => {
    if (a.t === "restart") canSave.current = true;
    raw(a);
  }, []);
  const d = useMemo(() => derive(s), [s]);
  const ref = useRef(s);
  ref.current = s;

  useEffect(() => {
    if (!canSave.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state: s }));
    } catch (e) {
      console.error("Could not save the game.", e);
    }
  }, [s]);

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
