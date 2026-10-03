import type { GameState, Objective } from "./types";
import { RACKS, ACCELS, GRID } from "./content";

export const OBJECTIVES: Objective[] = [
  {
    id: "boot",
    label: "Boot the Lab",
    hint: "Plan your first training run on the TRAIN tab. Small model, mostly licensed data, and don't zero out the safety share.",
    done: (s) => s.runHistory.length > 0 || !!s.run,
    progress: (s) => (s.run ? 1 : 0),
  },
  {
    id: "firstlight",
    label: "First Light",
    hint: "Finish a training run to completion without it crashing.",
    done: (s) => s.runHistory.some((r) => r.status !== "crashed"),
    progress: (s) => (s.run ? Math.min(1, s.run.computeDone / Math.max(1, s.run.computeNeeded)) : 0),
  },
  {
    id: "doors",
    label: "Open The Doors",
    hint: "Evaluate a model, then release it and allocate fleet to inference.",
    done: (s) => s.models.some((m) => m.status === "released"),
    progress: (s) => (s.models.some((m) => m.status === "released") ? 1 : s.models.length ? 0.4 : 0),
  },
  {
    id: "prove",
    label: "Prove It Works",
    hint: "Pass three eval gates on a single released model. Gates are the only thing standing between you and a very bad quarter.",
    done: (s) => s.models.some((m) => m.evalsPassed >= 3),
    progress: (s) => Math.min(1, Math.max(0, ...s.models.map((m) => m.evalsPassed / 3))),
  },
  {
    id: "traction",
    label: "Real Traction",
    hint: "Reach $60k of weekly revenue. Buy more accelerators — inference throughput is the bottleneck.",
    done: (s) => s.revenue >= 60,
    progress: (s) => Math.min(1, s.revenue / 60),
  },
  {
    id: "estate",
    label: "Real Estate",
    hint: "Build 12 structures in the lab. You will need power and cooling to match, or the racks will cook.",
    done: (s) => s.grid.filter((t) => t.b).length >= 12,
    progress: (s) => Math.min(1, s.grid.filter((t) => t.b).length / 12),
  },
  {
    id: "contender",
    label: "Frontier Contender",
    hint: "Reach capability 25 on a released model. Rivals are not waiting for you.",
    done: (s) => s.bestCap >= 25,
    progress: (s) => Math.min(1, s.bestCap / 25),
  },
  {
    id: "trusted",
    label: "A Trusted Name",
    hint: "Hold Trust Score at 72 or above.",
    done: (s) => s.trust >= 72,
    progress: (s) => Math.min(1, s.trust / 72),
  },
  {
    id: "bigone",
    label: "The Big One",
    hint: "Train a model of 35B parameters or more. You will need liquid cooling and a real cluster.",
    done: (s) => s.models.some((m) => m.params >= 35),
    progress: (s) => Math.min(1, Math.max(0, ...s.models.map((m) => m.params / 35))),
  },
  {
    id: "era",
    label: "Era-Defining",
    hint: "Reach capability 45. This is the line where a lab stops being a lab and starts being an era.",
    done: (s) => s.bestCap >= 45,
    progress: (s) => Math.min(1, s.bestCap / 45),
  },
];

export function objectiveIndex(s: GameState) {
  const i = OBJECTIVES.findIndex((o) => !s.objectivesDone.includes(o.id));
  return i < 0 ? OBJECTIVES.length - 1 : i;
}

/* ---------------- initial state ---------------- */

export function newGame(): GameState {
  const grid: Tile[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const inGarage = x < 4 && y < 3;
      grid.push({ x, y, unlocked: inGarage });
    }
  }
  const startIdx = grid.findIndex((t) => t.x === 1 && t.y === 1);
  grid[startIdx].b = { id: "b1", kind: "rack", variant: "shelf", built: 0, condition: 1, units: 8, unitGen: "vulcan" };
  const grid2 = grid;
  return {
    week: 1,
    year: 1,
    cash: 3400,
    debt: 0,
    trust: 58,
    awareness: 0.12,
    heatHome: 10,
    techLevel: 1,
    brand: "Gradient Ascent",
    labName: "Gradient Ascent",
    grid: grid2,
    researchers: [
      { id: "r1", name: "Ines Marchetti", field: "capability", skill: 5, ego: 0.4, salary: 5.4, burnout: 0, morale: 0.8 },
      { id: "r2", name: "Otto Lindqvist", field: "infra", skill: 4, ego: 0.25, salary: 4.2, burnout: 0, morale: 0.82 },
    ],
    candidates: [],
    models: [],
    run: null,
    runHistory: [],
    events: [],
    queue: [],
    log: [{ week: 1, text: "Lease signed on a 40m² unit in the Ravel Industrial Park. Two GPUs short of a dream.", tone: "neutral" }],
    rivals: [],
    regions: [],
    segments: [],
    priceIndex: 1,
    powerPrice: 78,
    coolingStress: 0,
    uptime: 1,
    fleetUtil: 0,
    revenue: 0,
    revenueHistory: [],
    expenseHistory: [],
    history: [],
    inferenceShare: 0.6,
    lastQuarter: 0,
    quartersProfitable: 0,
    valuation: 30,
    ending: null,
    tutorialStep: 0,
    speed: 1,
    paused: true,
    autoPause: false,
    incidentCount: 0,
    incidentStreak: 0,
    objectivesDone: [],
    flags: {},
    seed: Math.floor(Math.random() * 1e9),
    bestCap: 0,
    milestoneWeeks: {},
    newsfeed: [],
  };
}

/* ---------------- derived economy ---------------- */

export interface Derived {
  slots: number;
  slotUse: number;
  units: number;
  tf: number;
  itPower: number;
  powerCap: number;
  coolingCap: number;
  thermal: number;
  efficiency: number;
  effTf: number;
  trainUnits: number;
  trainTf: number;
  inferTf: number;
  inferCapK: number;
  hwValue: number;
  salaries: number;
  upkeep: number;
  powerCost: number;
  amort: number;
  complianceCost: number;
  expenses: number;
  hardwareRisk: number;
  interpLab: boolean;
  security: boolean;
  capabilityStaff: number;
  alignmentStaff: number;
  interpStaff: number;
  infraStaff: number;
  dataStaff: number;
  hazard: number;
  demandK: number;
  utilisation: number;
}

import { FACILITIES, SEGMENTS, LAWS } from "./content";
import type { Model, Segment, Tile } from "./types";

export function segmentFit(m: Model, seg: Segment, s: GameState, _d?: Derived) {
  if (m.capability < seg.minCapability * 0.85) return 0;
  const capFit = Math.min(1.65, Math.max(0, m.capability / seg.minCapability) ** 0.85);
  const trustFit = Math.max(0, Math.min(1.25, (s.trust - seg.minTrust + 32) / 58));
  const evalFit = seg.needsEvals > 0 ? Math.min(1, m.evalsPassed / seg.needsEvals) ** 1.4 : 1;
  const awareFit = 0.22 + 0.78 * Math.min(1, s.awareness / 0.85);
  const priceFit = Math.max(0.05, Math.min(2.4, (seg.ref / m.price) ** seg.priceSens));
  const archBonus = m.arch === "longctx" && (seg.id === "enterprise" || seg.id === "regulated") ? 1.22 : 1;
  return seg.size * capFit * trustFit * evalFit * awareFit * priceFit * archBonus * s.priceIndex;
}

export function derive(s: GameState): Derived {
  let slots = 0,
    slotUse = 0,
    units = 0,
    tf = 0,
    itPower = 0,
    powerCap = 95,
    coolingCap = 62,
    hwValue = 0,
    upkeep = 0,
    interpLab = false,
    security = false;

  for (const t of s.grid) {
    const b = t.b;
    if (!b) continue;
    if (b.kind === "rack") {
      const rt = RACKS.find((r) => r.id === b.variant)!;
      slots += rt.slots;
      slotUse += b.units ?? 0;
      upkeep += rt.upkeep;
      hwValue += rt.cost;
      const gen = ACCELS.find((a) => a.id === b.unitGen);
      if (gen) {
        units += b.units ?? 0;
        tf += (b.units ?? 0) * gen.tf;
        itPower += (b.units ?? 0) * gen.power;
        hwValue += (b.units ?? 0) * gen.price;
      }
    } else {
      const f = FACILITIES.find((x) => x.id === b.variant);
      if (f) {
        upkeep += f.upkeep;
        hwValue += f.cost;
        coolingCap += f.cooling ?? 0;
        powerCap += f.power ?? 0;
        if (f.id === "interplab") interpLab = true;
        if (f.id === "security") security = true;
      }
    }
  }

  const infraStaff = s.researchers.filter((r) => r.field === "infra").reduce((a, r) => a + r.skill, 0);
  const thermal = coolingCap > 0 ? itPower / coolingCap : 3;
  const effBase = Math.max(0.35, 1.1 - 0.42 * Math.max(0, thermal - 0.82));
  const efficiency = Math.min(1.22, effBase * (1 + infraStaff * 0.022));

  const trainUnits = s.run ? Math.min(s.run.allocatedUnits, units) : 0;
  const trainShare = units > 0 ? trainUnits / units : 0;
  const trainTf = tf * trainShare * efficiency;
  const inferTf = tf * (1 - trainShare) * s.inferenceShare * efficiency;
  const inferCapK = inferTf * 2200;

  const salaries = s.researchers.reduce((a, r) => a + r.salary, 0);
  const powerCost = itPower * 0.000168 * s.powerPrice * (0.35 + 0.65 * Math.max(trainShare, s.inferenceShare));
  const amort = hwValue * 0.0034;
  const complianceCost = s.regions[0]?.laws.filter((l) => l.active && l.complied).reduce((a, l) => a + l.costPerQuarter / 13, 0) ?? 0;

  let capabilityStaff = 0, alignmentStaff = 0, interpStaff = 0, dataStaff = 0;
  for (const r of s.researchers) {
    const w = r.skill * (0.55 + 0.45 * r.morale) * (1 - 0.45 * r.burnout);
    if (r.field === "capability") capabilityStaff += w;
    if (r.field === "alignment") alignmentStaff += w;
    if (r.field === "interp") interpStaff += w;
    if (r.field === "data") dataStaff += w;
  }

  // hazard from unrevealed traits of live models
  let hazard = 0;
  for (const m of s.models) {
    if (m.status !== "released") continue;
    const revShare = m.revenue > 0 ? 1 : 0.55;
    const hidden = (["deception", "hallucination", "misuse", "sycophancy", "instability"] as const).filter((k) => !m.revealed[k]);
    const hiddenMass = hidden.reduce((a, k) => a + m.traits[k], 0) / 5;
    const openMass = (["deception", "hallucination", "misuse", "sycophancy", "instability"] as const).reduce((a, k) => a + m.traits[k], 0) / 5;
    hazard += (hiddenMass * 1.5 + openMass * 0.35) * revShare;
  }
  hazard *= 1 - (security ? 0.28 : 0);
  if (s.run) hazard *= 0.55;

  let demandK = 0;
  const live = s.models.filter((m) => m.status === "released");
  if (live.length && inferTf > 0) {
    const dproxy = { inferCapK } as Derived;
    for (const seg of s.segments) {
      const best = Math.max(0, ...live.map((m) => segmentFit(m, seg, s, dproxy)));
      demandK += best;
    }
  }

  const hardwareRisk = Math.max(0, thermal - 0.95) * 0.55 + (1 - s.uptime) * 0.4;
  const utilisation = units > 0 ? (trainUnits + (units - trainUnits) * s.inferenceShare) / units : 0;

  return {
    slots, slotUse, units, tf, itPower, powerCap, coolingCap, thermal, efficiency, effTf: tf * efficiency,
    trainUnits, trainTf, inferTf, inferCapK, hwValue, salaries, upkeep, powerCost, amort, complianceCost,
    expenses: salaries + upkeep + powerCost + amort + complianceCost,
    hardwareRisk, interpLab, security, capabilityStaff, alignmentStaff, interpStaff, infraStaff, dataStaff,
    hazard, demandK, utilisation,
  };
}

export function fmtCalls(k: number) {
  if (k >= 1000) return `${(k / 1000).toFixed(k >= 10000 ? 0 : 1)}M`;
  return `${Math.round(k)}k`;
}
export function fmtMoney(v: number) {
  const a = Math.abs(v);
  if (a >= 1000) return `$${(v / 1000).toFixed(a >= 10000 ? 1 : 2)}B`;
  if (a >= 1) return `$${v.toFixed(a >= 100 ? 0 : 1)}M`;
  return `$${Math.round(v * 1000)}k`;
}
export function fmtK(v: number) {
  const a = Math.abs(v);
  if (a >= 1000) return `${(v / 1000).toFixed(1)}M`;
  return `${v < 0 ? "-" : ""}${Math.round(a)}k`;
}

export const SEG = SEGMENTS;
export const ALL_LAWS = LAWS;
