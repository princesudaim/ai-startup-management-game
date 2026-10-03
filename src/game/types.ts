export type Tab = "lab" | "train" | "models" | "market" | "people" | "world" | "board";

export type TileKind = "floor" | "rack" | "cooling" | "power" | "lab" | "security";

export interface Building {
  id: string;
  kind: TileKind;
  variant: string; // rack type id, or facility id
  built: number; // week built
  condition: number; // 0..1, degrades with heat
  units?: number; // accelerators installed in a rack
  unitGen?: string; // accelerator generation id
}

export interface Tile {
  x: number;
  y: number;
  unlocked: boolean;
  b?: Building;
}

export type ResearchField = "capability" | "alignment" | "interp" | "infra" | "data";

export interface Researcher {
  id: string;
  name: string;
  field: ResearchField;
  skill: number; // 1..10
  ego: number; // 0..1
  salary: number; // $k / week
  burnout: number; // 0..1
  morale: number; // 0..1
  poached?: boolean;
  quitter?: boolean;
  trait?: string;
}

export type ModelStatus = "training" | "evaluating" | "released" | "shelved" | "failed";

export interface ModelTraits {
  deception: number;
  hallucination: number;
  misuse: number;
  sycophancy: number;
  instability: number;
}

export interface EvalRecord {
  id: string;
  passed: boolean;
  week: number;
  score: number;
}

export interface Model {
  id: string;
  name: string;
  params: number;
  arch: string;
  bornWeek: number;
  status: ModelStatus;
  capability: number;
  quality: number;
  traits: ModelTraits;
  revealed: Record<keyof ModelTraits, boolean>;
  safetyShare: number;
  dataMix: DataMix;
  trainingCost: number; // $k spent
  evals: EvalRecord[];
  evalsPassed: number;
  weeksTrained: number;
  hiddenGem?: string; // emergent capability discovered mid-run
  inferenceShare: number; // 0..1 of fleet allocated
  price: number; // $ per 1k calls
  releaseWeek?: number;
  revenue: number; // $k earned lifetime
  generation: number;
}

export interface DataMix {
  licensed: number;
  scraped: number;
  synthetic: number;
  quality: number; // -0.2..0.5 derived
  contamination: number;
  legal: number; // legal exposure 0..1
}

export interface TrainingRun {
  id: string;
  name: string;
  params: number;
  arch: string;
  safetyShare: number;
  dataMix: { licensed: number; scraped: number; synthetic: number };
  computeNeeded: number;
  computeDone: number;
  allocatedUnits: number;
  allocatedTf: number;
  startedWeek: number;
  lossLog: number[];
  status: "running" | "paused" | "crashed";
  spend: number;
  notes: string[];
  emergent: string[];
  seed: number;
}

export type IncidentKind =
  | "hallucination"
  | "jailbreak"
  | "outage"
  | "lawsuit"
  | "contamination"
  | "misuse"
  | "leak"
  | "whistleblower"
  | "heatwave"
  | "hardware"
  | "poach"
  | "rival"
  | "regulator"
  | "press"
  | "opportunity";

export interface Choice {
  label: string;
  detail: string;
  cost?: number; // $k
  effects: Partial<EffectBundle>;
  flag?: string;
}

export interface EffectBundle {
  cash: number;
  trust: number;
  heat: number;
  capability: number;
  awareness: number;
  staffMorale: number;
  burnout: number;
  damage: number; // hardware damage
  delayWeeks: number;
  revealAll: number;
  evalPass: number;
}

export interface GameEvent {
  id: string;
  kind: IncidentKind | "training";
  title: string;
  body: string;
  tag: string;
  choices: Choice[];
  weight?: number;
  cond?: (s: GameState) => boolean;
  cooldown?: number;
}

export interface ActiveEvent extends GameEvent {
  instId: string;
  week: number;
}

export interface LogEntry {
  week: number;
  text: string;
  tone: "good" | "bad" | "neutral" | "major";
}

export interface Region {
  id: string;
  name: string;
  heat: number; // 0..100
  laws: Law[];
  marketShare: number;
}

export interface Law {
  id: string;
  name: string;
  week: number; // enacted week
  active: boolean;
  complied: boolean;
  lobbied: boolean;
  desc: string;
  costPerQuarter: number; // $k to comply
  penalty: number; // heat per week if ignored
  trustBonus: number;
}

export interface Rival {
  id: string;
  name: string;
  color: string;
  capability: number;
  budget: number;
  aggression: number;
  safetyPosture: number;
  blurb: string;
  milestones: string[];
  news: string[];
}

export interface Segment {
  id: string;
  name: string;
  size: number;
  priceSens: number;
  minCapability: number;
  minTrust: number;
  needsEvals: number;
  ref: number;
  churnNote: string;
  note: string;
}

export interface Objective {
  id: string;
  label: string;
  hint: string;
  done: (s: GameState) => boolean;
  progress?: (s: GameState) => number; // 0..1
}

export interface GameState {
  week: number;
  year: number;
  cash: number;
  debt: number;
  trust: number;
  awareness: number;
  heatHome: number;
  techLevel: number;
  brand: string;
  labName: string;
  grid: Tile[];
  researchers: Researcher[];
  candidates: Researcher[];
  models: Model[];
  run: TrainingRun | null;
  runHistory: { name: string; week: number; cap: number; params: number; status: string }[];
  events: ActiveEvent[];
  queue: ActiveEvent[];
  log: LogEntry[];
  rivals: Rival[];
  regions: Region[];
  segments: Segment[];
  priceIndex: number;
  powerPrice: number; // $/MWh
  coolingStress: number;
  uptime: number;
  fleetUtil: number;
  revenue: number; // this week
  revenueHistory: number[];
  expenseHistory: number[];
  history: { week: number; cash: number; rev: number; exp: number; trust: number; cap: number }[];
  inferenceShare: number;
  lastQuarter: number;
  quartersProfitable: number;
  valuation: number;
  ending: { kind: string; title: string; body: string } | null;
  tutorialStep: number;
  speed: number;
  paused: boolean;
  autoPause: boolean;
  incidentCount: number;
  incidentStreak: number;
  objectivesDone: string[];
  flags: Record<string, any>;
  seed: number;
  bestCap: number;
  milestoneWeeks: Record<string, number>;
  newsfeed: { week: number; text: string; who: string }[];
}
