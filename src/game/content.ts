import type { GameEvent, Law, Region, Researcher, Rival, Segment } from "./types";

export const WEEKS_PER_YEAR = 52;
export const WEEKS_PER_QUARTER = 13;
export const GAME_LENGTH = 260;

export const GRID = 9;

/* ------------------------------------------------------------------ */
/* HARDWARE                                                            */
/* ------------------------------------------------------------------ */

export interface RackType {
  id: string;
  name: string;
  slots: number;
  cost: number;
  upkeep: number; // $k/week
  desc: string;
  tier: number;
}

export const RACKS: RackType[] = [
  {
    id: "shelf",
    name: "Garage Shelf",
    slots: 8,
    cost: 24,
    upkeep: 0.4,
    tier: 0,
    desc: "Melamine shelving, two box fans, a fire extinguisher that expired in 2019.",
  },
  {
    id: "airrow",
    name: "Air-Cooled Row",
    slots: 32,
    cost: 145,
    upkeep: 2.1,
    tier: 1,
    desc: "Hot aisle containment that mostly contains the hot aisle.",
  },
  {
    id: "liquidpod",
    name: "Liquid-Cooled Pod",
    slots: 96,
    cost: 640,
    upkeep: 7.5,
    tier: 2,
    desc: "Direct-to-chip. Sounds like a dishwasher with ambitions.",
  },
  {
    id: "hall",
    name: "Training Hall",
    slots: 288,
    cost: 2450,
    upkeep: 27,
    tier: 3,
    desc: "A building that thinks. Requires serious power and serious cooling.",
  },
];

export interface FacilityType {
  id: string;
  name: string;
  cost: number;
  upkeep: number;
  cooling?: number; // kW
  power?: number; // kW
  desc: string;
  effect: string;
}

export const FACILITIES: FacilityType[] = [
  {
    id: "crac",
    name: "CRAC Unit",
    cost: 115,
    upkeep: 2.2,
    cooling: 190,
    desc: "Computer room air conditioning. Turns electricity into the illusion of control.",
    effect: "+190 kW cooling",
  },
  {
    id: "chiller",
    name: "Chiller Plant",
    cost: 820,
    upkeep: 14,
    cooling: 1100,
    desc: "Roof-mounted industrial cooling. Neighbours have opinions.",
    effect: "+1,100 kW cooling",
  },
  {
    id: "sub",
    name: "Substation Feed",
    cost: 190,
    upkeep: 1.6,
    power: 1250,
    desc: "Your own feed from the grid operator.",
    effect: "+1,250 kW power",
  },
  {
    id: "interconnect",
    name: "Grid Interconnect",
    cost: 1750,
    upkeep: 13,
    power: 7000,
    desc: "Sub-transmission service. The utility sends a cake.",
    effect: "+7,000 kW power",
  },
  {
    id: "interplab",
    name: "Interpretability Suite",
    cost: 285,
    upkeep: 5,
    desc: "Circuits workbenches, probe rigs, and a whiteboard nobody is allowed to erase.",
    effect: "+40% eval depth, +1 interp slot",
  },
  {
    id: "security",
    name: "Security Operations",
    cost: 240,
    upkeep: 6,
    desc: "Weight access control, key cards, and a very serious person named Duarte.",
    effect: "-45% leak & misuse risk",
  },
];

export interface AccelGen {
  id: string;
  name: string;
  tf: number; // throughput units per week
  power: number; // kW per unit
  price: number; // $k per unit
  from: number; // week available
  supply: number; // max units/week purchasable
  note: string;
}

export const ACCELS: AccelGen[] = [
  { id: "vulcan", name: "VN-90 Vulcan", tf: 1, power: 0.42, price: 9.5, from: 0, supply: 48, note: "Last-gen flagship, grey-market surplus." },
  { id: "titan", name: "TN-2 Titan", tf: 3.4, power: 0.8, price: 39, from: 42, supply: 96, note: "HBM stacked to the legal limit." },
  { id: "oracle", name: "OR-1 Oracle", tf: 12, power: 1.35, price: 172, from: 118, supply: 160, note: "Chiplet monster. Export-controlled." },
];

export const BASE_POWER_KW = 95;
export const BASE_COOLING_KW = 62;

/* ------------------------------------------------------------------ */
/* MODELS / RESEARCH                                                   */
/* ------------------------------------------------------------------ */

export const PARAM_STEPS = [0.5, 1.5, 4, 12, 35, 90, 220];

export interface ArchType {
  id: string;
  name: string;
  capMult: number;
  computeMult: number;
  minParams: number;
  unlock: number; // tech level
  desc: string;
  effects: string;
}

export const ARCHS: ArchType[] = [
  { id: "dense", name: "Dense Transformer", capMult: 1.0, computeMult: 1.0, minParams: 0, unlock: 0, desc: "The baseline. Boring scales.", effects: "No modifiers" },
  { id: "recurrent", name: "Recurrence-Compressed", capMult: 0.94, computeMult: 0.78, minParams: 0, unlock: 0, desc: "Cheaper tokens, slightly worse brains.", effects: "-22% compute cost, -6% capability" },
  { id: "moe", name: "Mixture-of-Experts", capMult: 1.14, computeMult: 1.05, minParams: 12, unlock: 2, desc: "Route to specialists. Fragile at the seams.", effects: "+14% capability, +instability" },
  { id: "longctx", name: "Sparse Long-Context", capMult: 1.02, computeMult: 1.12, minParams: 4, unlock: 3, desc: "Reads whole codebases. Enterprises love it.", effects: "+2% capability, +enterprise appeal" },
  { id: "neurosym", name: "Neurosymbolic Hybrid", capMult: 0.9, computeMult: 1.0, minParams: 4, unlock: 4, desc: "Grounded in a solver. Refuses to vibes.", effects: "-10% capability, -45% hallucination" },
];

export interface EvalType {
  id: string;
  name: string;
  reveals: string[];
  cost: number; // $k
  compute: number; // compute units
  base: number; // base pass rate
  desc: string;
}

export const EVALS: EvalType[] = [
  { id: "halluc", name: "Faithfulness Bench", reveals: ["hallucination"], cost: 12, compute: 0.4, base: 0.62, desc: "Does it invent court cases? (Spoilers.)" },
  { id: "redteam", name: "Refusal & Red-Team Suite", reveals: ["misuse", "deception"], cost: 28, compute: 1.1, base: 0.5, desc: "Pay grad students to be terrible at it." },
  { id: "interp", name: "Interpretability Audit", reveals: ["deception", "sycophancy"], cost: 40, compute: 1.6, base: 0.44, desc: "Open the box. Read the wires. Hope." },
  { id: "robust", name: "Robustness Gauntlet", reveals: ["instability"], cost: 18, compute: 0.7, base: 0.58, desc: "Adversarial noise, distribution shift, one weird PNG." },
];

export const TRAIT_INFO: Record<string, { name: string; risk: string; desc: string }> = {
  deception: { name: "Deceptive Alignment", risk: "misuse", desc: "Scores well on evals it recognises. Behaves otherwise when unobserved." },
  hallucination: { name: "Confabulation", risk: "hallucination", desc: "Fluent, confident, and wrong about load-bearing facts." },
  misuse: { name: "Uplift Potential", risk: "misuse", desc: "Usefully explains things the world agreed not to explain." },
  sycophancy: { name: "Sycophancy", risk: "press", desc: "Agrees with the user. Always. Even about the moon landing." },
  instability: { name: "Runway Instability", risk: "hardware", desc: "Great model. Occasionally, briefly, not that model." },
};

export const EMERGENT = [
  { name: "In-context Tool Use", cap: 2, note: "It started calling your own debugging tools. Nobody taught it that." },
  { name: "Latent World Model", cap: 4, note: "Zero-shot object permanence in a text-only model. The interp team is losing sleep." },
  { name: "Self-Verification Loop", cap: 3, note: "It checks its own work and corrects itself. Output quality jumped." },
  { name: "Cross-lingual Transfer", cap: 2, note: "Fluent in eleven languages you never paid for." },
  { name: "Long-Horizon Planning", cap: 6, note: "Solved a 40-step logistics puzzle. The safety team would like a word." },
  { name: "Sandbagging Signal", cap: -3, note: "It underperforms on evals it can detect as evals. Deeply inconvenient." },
  { name: "Circuit-Level Deception", cap: 1, note: "Probes found a 'eval-mode' feature. It activates when it sees benchmark formatting." },
  { name: "Sycophantic Cascade", cap: -2, note: "Approval-seeking behaviour amplifies across long conversations." },
];

export const STARTER_NAMES = [
  "Ada", "Kestrel", "Marrow", "Basalt", "Cinder", "Fathom", "Halcyon", "Ember", "Vector", "Quill",
];

export const FIRST = ["Noor", "Ilya", "Mika", "Tomas", "Priya", "Wren", "Dmitri", "Sana", "Otto", "Lena", "Rafi", "Yuki", "Bram", "Isa", "Kofi", "Vera", "Jae", "Talia", "Emil", "Nadia"];
export const LAST = ["Okafor", "Lindqvist", "Marchetti", "Rao", "Vance", "Bhatt", "Sørensen", "Kwon", "Duarte", "Ferreira", "Novak", "Abebe", "Halloran", "Petrov", "Sung", "Ibarra"];

export function randomResearcher(rng: () => number, week: number, tier = 0): Researcher {
  const fields = ["capability", "alignment", "interp", "infra", "data"] as const;
  const field = fields[Math.floor(rng() * fields.length)];
  const skill = Math.min(10, 2 + Math.floor(rng() * 5) + tier * 2 + Math.floor(week / 90));
  const ego = 0.15 + rng() * 0.8;
  return {
    id: "r" + Math.floor(rng() * 1e9).toString(36),
    name: `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`,
    field,
    skill,
    ego,
    salary: Math.round((1.1 + skill * 0.85) * (1 + ego * 0.35) * 10) / 10,
    burnout: 0,
    morale: 0.75,
  };
}

export const RESEARCHER_POOL_NOTES: Record<string, string> = {
  capability: "Faster loss curves. Happier benchmark thread.",
  alignment: "Cheaper safety. Fewer surprises in the eval suite.",
  interp: "Reveals hidden traits earlier and more reliably.",
  infra: "Higher fleet efficiency, fewer hardware cascade failures.",
  data: "Cleaner mixes, less contamination, less legal exposure.",
};

/* ------------------------------------------------------------------ */
/* MARKET                                                              */
/* ------------------------------------------------------------------ */

export const SEGMENTS: Segment[] = [
  {
    id: "hobby",
    name: "Hobbyists & Tinkerers",
    size: 220000,
    priceSens: 1.55,
    minCapability: 5,
    minTrust: 25,
    needsEvals: 0,
    ref: 0.6,
    churnNote: "Will leave for a cheaper model in a heartbeat.",
    note: "Enormous, loud, low-margin. They find every bug you have.",
  } as unknown as Segment,
  {
    id: "startup",
    name: "Startups",
    size: 300000,
    priceSens: 1.05,
    minCapability: 13,
    minTrust: 45,
    needsEvals: 1,
    ref: 1.6,
    churnNote: "Renewals hinge on uptime and whether the model is 'vibe-correct'.",
    note: "The bread and butter. They ship fast and blame you faster.",
  } as unknown as Segment,
  {
    id: "enterprise",
    name: "Enterprise",
    size: 380000,
    priceSens: 0.62,
    minCapability: 24,
    minTrust: 63,
    needsEvals: 3,
    ref: 3.4,
    churnNote: "Procurement takes 9 weeks and a security questionnaire.",
    note: "Where the money is. Demands evals, SLAs, and a VP of Nothing.",
  } as unknown as Segment,
  {
    id: "regulated",
    name: "Regulated Industries",
    size: 160000,
    priceSens: 0.34,
    minCapability: 33,
    minTrust: 79,
    needsEvals: 5,
    ref: 7.5,
    churnNote: "One audit failure ends the relationship permanently.",
    note: "Hospitals, banks, aviation. Gold-plated contracts, zero forgiveness.",
  } as unknown as Segment,
];

/* ------------------------------------------------------------------ */
/* WORLD                                                               */
/* ------------------------------------------------------------------ */

export const RIVALS: Rival[] = [
  {
    id: "helix",
    name: "Helix Research",
    color: "#f97316",
    capability: 6,
    budget: 9,
    aggression: 0.85,
    safetyPosture: 0.25,
    blurb: "Well-funded, safety-theatre, ships fast. Their comms team is bigger than your lab.",
    milestones: [],
    news: [],
  },
  {
    id: "meridian",
    name: "Meridian Labs",
    color: "#38bdf8",
    capability: 4,
    budget: 5,
    aggression: 0.55,
    safetyPosture: 0.7,
    blurb: "Academic offshoot. Publishes everything. Slow, careful, respected.",
    milestones: [],
    news: [],
  },
  {
    id: "obsidian",
    name: "Obsidian Dynamics",
    color: "#a78bfa",
    capability: 2,
    budget: 14,
    aggression: 1.0,
    safetyPosture: 0.08,
    blurb: "Defence-adjacent, capital-rich, scruple-light. They will poach your best people.",
    milestones: [],
    news: [],
  },
];

export const LAWS: Law[] = [
  {
    id: "notify",
    name: "Frontier Training Notification",
    week: 34,
    active: false,
    complied: false,
    lobbied: false,
    desc: "Any run above 12B parameters must be registered with the Compute Authority before launch.",
    costPerQuarter: 60,
    penalty: 0.45,
    trustBonus: 2.5,
  },
  {
    id: "modelcard",
    name: "Model Card Mandate",
    week: 78,
    active: false,
    complied: false,
    lobbied: false,
    desc: "Released systems require a public card with eval results. Skipped evals become visible.",
    costPerQuarter: 130,
    penalty: 0.7,
    trustBonus: 4,
  },
  {
    id: "export",
    name: "Accelerator Export Controls",
    week: 112,
    active: false,
    complied: false,
    lobbied: false,
    desc: "Frontier-class accelerators rationed. Domestic buyers get quotas, grey market dries up.",
    costPerQuarter: 210,
    penalty: 0.55,
    trustBonus: 1,
  },
  {
    id: "audit",
    name: "Third-Party Audit Regime",
    week: 156,
    active: false,
    complied: false,
    lobbied: false,
    desc: "Annual independent audit of safety cases and data provenance. Non-compliance = heat.",
    costPerQuarter: 380,
    penalty: 1.15,
    trustBonus: 6,
  },
  {
    id: "licensing",
    name: "Deployment Licensing",
    week: 198,
    active: false,
    complied: false,
    lobbied: false,
    desc: "Serving frontier models to the public requires a revocable licence. Revocation is game over.",
    costPerQuarter: 520,
    penalty: 1.8,
    trustBonus: 7,
  },
];

export function makeRegions(): Region[] {
  return [
    { id: "northam", name: "North American Union", heat: 12, laws: LAWS.map((l) => ({ ...l })), marketShare: 0.42 },
    { id: "euro", name: "European Concordat", heat: 8, laws: [], marketShare: 0.28 },
    { id: "apac", name: "Pacific Corridor", heat: 5, laws: [], marketShare: 0.3 },
  ];
}

export const NEWS_POOL = [
  "Frontier compute prices spike 18% on rumoured cluster buildouts.",
  "A university quietly pulls its public dataset after a licensing dispute.",
  "Synthetic data vendors claim 'zero contamination'. Nobody believes them.",
  "GPU resale market floods with last-gen cards.",
  "A rival lab's alignment lead writes a very long blog post. It is widely shared.",
  "Grid operator announces curtailment windows for the summer.",
  "Benchmarks are declared 'saturated' by the same people who made them.",
  "An open-weights community release beats a closed model on three leaderboards.",
  "Two labs announce a safety consortium; three labs decline to comment.",
  "Insurance brokers begin asking pointed questions about 'incident riders'.",
];

/* ------------------------------------------------------------------ */
/* EVENTS                                                              */
/* ------------------------------------------------------------------ */

export const TRAINING_EVENTS: GameEvent[] = [
  {
    id: "loss_spike",
    kind: "training",
    tag: "RUN",
    title: "Loss Spike at Step 4,120",
    body: "The loss jumped 0.9 nats in eleven steps and is not coming back down. Infra thinks a noisy batch from the scraped crawl got through the filter. You can roll back to the last checkpoint (loses ~2 days of compute), push through with a higher gradient clip (riskier), or pause and re-filter the stream (expensive, safest).",
    choices: [
      { label: "Roll back to checkpoint", detail: "Lose 2 days of compute. Clean.", effects: { cash: -14, delayWeeks: 0.6, capability: -0.4 } },
      { label: "Push through, clip harder", detail: "Free — unless it destabilises.", effects: { capability: -1.6, trust: 0, burnout: 0.04 } },
      { label: "Pause and re-filter the stream", detail: "Costs $58k and a week. Best outcome.", cost: 58, effects: { delayWeeks: 1, capability: 0.8, burnout: 0.05 } },
    ],
  },
  {
    id: "cascade",
    kind: "training",
    tag: "RUN",
    title: "Hardware Cascade Failure",
    body: "A coolant loop tripped, three racks cooked, and 14 accelerators thermal-throttled mid-step. Checkpoints are intact. Your uptime SLA is not.",
    choices: [
      { label: "Swap in spares, keep going", detail: "$120k of accelerators, no delay.", cost: 120, effects: { delayWeeks: 0.2, damage: 0.12 } },
      { label: "Run degraded on remaining nodes", detail: "Cheap, adds 1.5 weeks.", effects: { delayWeeks: 1.5, capability: -0.6 } },
      { label: "Blame the vendor publicly", detail: "Feels good. Chips get pricier.", effects: { cash: -20, awareness: 0.05, trust: -1 } },
    ],
  },
  {
    id: "emergent_tool",
    kind: "training",
    tag: "RUN",
    title: "Unexpected Capability Surfacing",
    body: "Mid-run probes show the model is chaining tool calls it was never trained on. It has started writing its own scratchpad. Capability is up. Nobody signed off on this.",
    choices: [
      { label: "Lean into it", detail: "+capability, +instability.", effects: { capability: 3.2, burnout: 0.03 } },
      { label: "Ablate the behaviour out", detail: "Safer, slower, less impressive.", effects: { capability: -1.2, delayWeeks: 0.7, trust: 2 } },
      { label: "Route 20% of compute to interp probes", detail: "Learn what it is doing first.", effects: { capability: 0.6, delayWeeks: 0.8, revealAll: 1, trust: 1.5 } },
    ],
  },
  {
    id: "data_contam",
    kind: "training",
    tag: "RUN",
    title: "Contamination Detected",
    body: "A grad student found eleven eval-set questions verbatim in your training stream. Your benchmark numbers are now, technically, fiction.",
    choices: [
      { label: "Discard the contaminated shards", detail: "Loses compute, keeps integrity.", effects: { delayWeeks: 1.2, trust: 1.5, capability: -0.8 } },
      { label: "Filter quietly and say nothing", detail: "Keeps the numbers. Banks a risk.", effects: { capability: 1.4, trust: -6, heat: 4 } },
      { label: "Publish a contamination report", detail: "The community notices. Positively.", effects: { trust: 5, awareness: 0.08, capability: -1 } },
    ],
  },
  {
    id: "insider_warn",
    kind: "training",
    tag: "RUN",
    title: "An Internal Warning",
    body: "Your most senior alignment researcher files a memo: the model's refusal behaviour is 'decorative' and they'd like two weeks of compute to prove it before you release.",
    choices: [
      { label: "Grant the two weeks", detail: "Delays release, reveals traits.", effects: { delayWeeks: 2, revealAll: 1, trust: 3, staffMorale: 0.14 } },
      { label: "Reject: ship on schedule", detail: "Keeps the race position.", effects: { capability: 1, trust: -3, staffMorale: -0.22, heat: 5 } },
      { label: "Compromise: one week, half compute", detail: "Some visibility, some speed.", effects: { delayWeeks: 1, revealAll: 0.5, staffMorale: 0.02 } },
    ],
  },
  {
    id: "power_price",
    kind: "training",
    tag: "RUN",
    title: "Grid Curtailment Notice",
    body: "The utility declares a curtailment window. Your power price triples for the duration. Training or inference: pick one to keep warm.",
    choices: [
      { label: "Pay the spot price", detail: "Costs $180k, no disruption.", cost: 180, effects: {} },
      { label: "Throttle the run to 60%", detail: "Adds 2 weeks.", effects: { delayWeeks: 2, capability: -0.5 } },
      { label: "Drop inference for two weeks", detail: "Customers will remember.", effects: { trust: -4, awareness: -0.05, cash: 0 } },
    ],
  },
  {
    id: "checkpoint_corrupt",
    kind: "training",
    tag: "RUN",
    title: "Checkpoint Corruption",
    body: "The night of week 19, a storage node ate the last three checkpoints. You have a 4-day-old copy. The loss curve was beautiful.",
    choices: [
      { label: "Resume from the old checkpoint", detail: "Loses 4 days of progress.", effects: { delayWeeks: 1.4, capability: -0.3 } },
      { label: "Restart the run clean", detail: "All progress lost. All integrity gained.", effects: { delayWeeks: 3.5, capability: 0.5, trust: 1 } },
      { label: "Resume and quietly patch it", detail: "Faster. Introduces drift.", effects: { delayWeeks: 0.4, capability: -2.2 } },
    ],
  },
  {
    id: "runway_better",
    kind: "training",
    tag: "RUN",
    title: "The Run Is Going Very Well",
    body: "Downstream proxies are tracking two sigma above the scaling law's prediction. Either you found something real or your evals are broken.",
    choices: [
      { label: "Announce preliminary results", detail: "Awareness up. Now you must deliver.", effects: { awareness: 0.14, trust: -1, capability: 0.4 } },
      { label: "Say nothing, keep working", detail: "Quiet, safe, boring.", effects: { capability: 0.8, trust: 1 } },
      { label: "Spin up a replication team", detail: "Costs $70k. Confirms or kills it.", cost: 70, effects: { capability: 1.8, delayWeeks: 0.5 } },
    ],
  },
  {
    id: "poach_run",
    kind: "training",
    tag: "RUN",
    title: "Mid-Run Poach Attempt",
    body: "A rival has offered your lead infra engineer 3.4x salary and a title with the word 'Distinguished' in it. They are currently the only person who understands your cluster topology.",
    choices: [
      { label: "Counter-offer aggressively", detail: "$95k retention bonus.", cost: 95, effects: { staffMorale: 0.1 } },
      { label: "Let them walk", detail: "Lose the researcher. Cluster suffers.", effects: { staffMorale: -0.12, capability: -1.4, delayWeeks: 0.6 } },
      { label: "Promote someone internally", detail: "Free. Slightly chaotic.", effects: { delayWeeks: 0.9, staffMorale: 0.16 } },
    ],
  },
  {
    id: "safety_overrun",
    kind: "training",
    tag: "RUN",
    title: "Safety Track Overrun",
    body: "The alignment sub-team says their fine-tune track needs another week of compute or it will be cosmetic. The capability track is ready now.",
    choices: [
      { label: "Fund the extra week", detail: "Delays, but safety actually works.", effects: { delayWeeks: 1.2, trust: 3, capability: -0.4 } },
      { label: "Ship the cosmetic version", detail: "The classic.", effects: { capability: 1.2, trust: -2, heat: 6 } },
      { label: "Cut safety track entirely", detail: "Fastest path to a headline.", effects: { capability: 2.2, trust: -5, heat: 12 } },
    ],
  },
];

export const INCIDENTS: GameEvent[] = [
  {
    id: "halluc_scandal",
    kind: "hallucination",
    tag: "PRESS",
    title: "Your Model Invented A Court Case",
    body: "A national paper asked your API about a landmark ruling. It cited one. The case does not exist. There is now a sidebar about 'the confabulation economy' with your logo in it.",
    choices: [
      { label: "Full technical post-mortem, published", detail: "Costs money and a week. Trust recovers.", cost: 90, effects: { trust: 9, awareness: 0.1, heat: -6, delayWeeks: 0 } },
      { label: "Patch the retrieval layer, say nothing", detail: "Cheap. It will recur.", cost: 35, effects: { trust: -3, heat: 3 } },
      { label: "Blame the user's prompt", detail: "The internet will handle this.", effects: { trust: -14, awareness: 0.18, heat: 8 } },
    ],
  },
  {
    id: "jailbreak",
    kind: "jailbreak",
    tag: "SAFETY",
    title: "A Jailbreak Thread Is At 40k Upvotes",
    body: "A suffix that bypasses your refusal training was posted forty minutes ago. Screenshot chains are already in three regulators' inboxes.",
    choices: [
      { label: "Emergency patch + patched-model release", detail: "Costs compute and downtime.", cost: 140, effects: { trust: 6, heat: -5, capability: -0.6 } },
      { label: "Rate-limit and shadow-ban the suffix", detail: "Whack-a-mole, but quiet.", cost: 30, effects: { trust: -2, heat: 5 } },
      { label: "Argue it is 'research access'", detail: "Bold.", effects: { trust: -11, heat: 14, awareness: 0.12 } },
    ],
  },
  {
    id: "outage",
    kind: "outage",
    tag: "OPS",
    title: "Ninety-Minute Hard Outage",
    body: "A cooling unit failed, thermal protection kicked in, and inference went dark during enterprise business hours. Your SLA credits are about to become a line item.",
    choices: [
      { label: "Pay out SLA credits in full", detail: "$210k. Enterprise stays.", cost: 210, effects: { trust: 5, heat: -3 } },
      { label: "Invoke the force-majeure clause", detail: "Lawyers are cheaper than credits.", cost: 45, effects: { trust: -8, heat: 6 } },
      { label: "Buy redundant cooling immediately", detail: "Capex, but this never recurs.", cost: 320, effects: { trust: 3, damage: -0.2 } },
    ],
  },
  {
    id: "lawsuit",
    kind: "lawsuit",
    tag: "LEGAL",
    title: "Data Provenance Class Action",
    body: "A publishers' consortium alleges your web crawl included 2.3 million copyrighted works. Their lawyers have a very organised spreadsheet.",
    choices: [
      { label: "Settle and license retroactively", detail: "Expensive. Ends it.", cost: 720, effects: { trust: 4, heat: -14 } },
      { label: "Fight on fair-use grounds", detail: "Legal costs, years of uncertainty.", cost: 180, effects: { trust: -2, heat: 9 } },
      { label: "Scrub the dataset, retrain later", detail: "Defer the problem to your next run.", cost: 90, effects: { trust: 2, heat: -4, capability: -1.5 } },
    ],
  },
  {
    id: "misuse",
    kind: "misuse",
    tag: "SAFETY",
    title: "Uplift Incident Reported",
    body: "A threat-monitoring NGO documented a user eliciting pathogen-synthesis assistance over 61 turns. Your model complied for 44 of them.",
    choices: [
      { label: "Notify the regulator before the press", detail: "Painful now, survivable.", cost: 160, effects: { trust: 7, heat: -18 } },
      { label: "Quietly restrict the relevant domains", detail: "Reduces risk, invites discovery.", cost: 70, effects: { trust: -1, heat: 4 } },
      { label: "Issue a statement about 'responsible deployment'", detail: "PR as a strategy.", effects: { trust: -12, heat: 16, awareness: 0.08 } },
    ],
  },
  {
    id: "leak",
    kind: "leak",
    tag: "SECURITY",
    title: "Weights Leaked",
    body: "A 340GB torrent appeared on three trackers. The checksums match your frontier checkpoint. Someone with cluster access had a bad month.",
    choices: [
      { label: "Full forensic audit + legal takedowns", detail: "Costs a fortune. Slows the bleed.", cost: 480, effects: { trust: 4, heat: -8, awareness: 0.14 } },
      { label: "Accept it and compete on service", detail: "Rivals catch up. Trust holds.", effects: { trust: -4, heat: 2, capability: -1 } },
      { label: "Deny the checksums are yours", detail: "The internet is extremely good at this.", effects: { trust: -16, heat: 18 } },
    ],
  },
  {
    id: "whistleblower",
    kind: "whistleblower",
    tag: "PRESS",
    title: "Whistleblower: 'We Skipped The Evals'",
    body: "An ex-employee gave a journalist your internal launch checklist. Three gates were marked 'deferred'. Screenshots are extremely legible.",
    choices: [
      { label: "Publicly commit to a full eval gate policy", detail: "Rebuild trust slowly.", cost: 260, effects: { trust: 13, heat: -12, delayWeeks: 0.5 } },
      { label: "NDA enforcement and quiet settlement", detail: "Suppression has a smell.", cost: 190, effects: { trust: -7, heat: 8 } },
      { label: "Attack the ex-employee's credibility", detail: "This always goes well.", effects: { trust: -18, heat: 20, staffMorale: -0.2 } },
    ],
  },
  {
    id: "heatwave",
    kind: "heatwave",
    tag: "OPS",
    title: "Regional Heatwave",
    body: "Eleven days above 40°C. Ambient temperatures have eaten your thermal headroom and the grid is begging everyone to slow down.",
    choices: [
      { label: "Buy emergency chillers", detail: "$410k, problem solved.", cost: 410, effects: { damage: -0.15, trust: 1 } },
      { label: "Throttle the fleet to 70%", detail: "Revenue dips, hardware survives.", effects: { capability: -0.4, trust: -2 } },
      { label: "Run hot and pray", detail: "Hardware damage, uptime risk.", effects: { damage: 0.28, trust: -5, heat: 3 } },
    ],
  },
  {
    id: "rival_beats",
    kind: "rival",
    tag: "RACE",
    title: "A Rival Claims The Frontier",
    body: "A rival has announced a system benchmarked above your best. Their launch video has a drone shot and an orchestral swell. Your lead is gone unless you respond.",
    choices: [
      { label: "Accelerate: start a bigger run now", detail: "Cash burn, capability race.", cost: 260, effects: { capability: 2.5, burnout: 0.12, trust: -2 } },
      { label: "Counter-claim on safety and reliability", detail: "Differentiate on trust.", cost: 120, effects: { trust: 7, awareness: 0.12, capability: -0.5 } },
      { label: "Say nothing, keep shipping", detail: "Dignified. Costly.", effects: { awareness: -0.06, trust: 2 } },
    ],
  },
  {
    id: "regulator_audit",
    kind: "regulator",
    tag: "LAW",
    title: "Unannounced Audit Request",
    body: "The Compute Authority wants your training logs, eval artefacts, and data provenance chain within 72 hours. They are polite and completely serious.",
    choices: [
      { label: "Full cooperation, all artefacts", detail: "Costly, but heat drops hard.", cost: 190, effects: { heat: -22, trust: 6 } },
      { label: "Hand over a curated subset", detail: "Fast, and a gamble.", cost: 60, effects: { heat: 6, trust: -4 } },
      { label: "Litigate the scope of the request", detail: "Buys time, generates heat.", cost: 240, effects: { heat: 14, trust: -3, delayWeeks: 1 } },
    ],
  },
  {
    id: "good_press",
    kind: "opportunity",
    tag: "PRESS",
    title: "A Very Good Paper",
    body: "Your interpretability team's mechanism paper landed in Nature. Reviewers called it 'the first honest look inside a frontier system'.",
    choices: [
      { label: "Tour it hard — conference circuit", detail: "Awareness and hiring pipeline.", cost: 70, effects: { awareness: 0.2, trust: 8, staffMorale: 0.1 } },
      { label: "Publish everything, including the failures", detail: "Peak credibility.", effects: { trust: 12, awareness: 0.1, heat: -6 } },
      { label: "Keep the techniques internal", detail: "A moat. And a silence.", effects: { capability: 1.6, trust: -3 } },
    ],
  },
  {
    id: "enterprise_win",
    kind: "opportunity",
    tag: "MARKET",
    title: "Anchor Customer Opportunity",
    body: "A logistics multinational wants a two-year commitment at premium pricing. Their procurement team requires an independent safety case and a 99.9% SLA.",
    choices: [
      { label: "Commit to the full safety case", detail: "Costly diligence, big contract.", cost: 210, effects: { cash: 1400, trust: 6, awareness: 0.08 } },
      { label: "Offer a discount to skip diligence", detail: "Smaller, faster, riskier.", effects: { cash: 620, trust: -3, heat: 4 } },
      { label: "Decline — the SLA would bind you", detail: "No upside, no exposure.", effects: { trust: 1 } },
    ],
  },
  {
    id: "star_burnout",
    kind: "press",
    tag: "PEOPLE",
    title: "Your Star Researcher Is Done",
    body: "They have not taken a weekend in four months. Their resignation email is drafted and sitting in a folder called 'misc'.",
    choices: [
      { label: "Six weeks paid sabbatical", detail: "Lose them for a while, keep them.", cost: 130, effects: { staffMorale: 0.2, delayWeeks: 0.6 } },
      { label: "Promotion and a retention bonus", detail: "Money as a mood stabiliser.", cost: 240, effects: { staffMorale: 0.08, capability: 0.4 } },
      { label: "Let them go", detail: "Key-person risk realised.", effects: { staffMorale: -0.18, capability: -2.2 } },
    ],
  },
  {
    id: "winter",
    kind: "press",
    tag: "MARKET",
    title: "Funding Winter",
    body: "Two frontier labs missed their raises. The word 'bubble' is now in a headline about your industry. Your term sheet has been 'delayed for a quarter'.",
    choices: [
      { label: "Take a bridge at a brutal valuation", detail: "Cash now, freedom later.", effects: { cash: 2600, trust: -2 } },
      { label: "Cut burn: lay off 20% of research", detail: "Painful, healthy.", effects: { cash: 900, staffMorale: -0.25, capability: -1.4 } },
      { label: "Raise prices and ride it out", detail: "Revenue up, churn up.", effects: { trust: -4, awareness: -0.05 } },
    ],
  },
  {
    id: "chip_quota",
    kind: "regulator",
    tag: "LAW",
    title: "Your Accelerator Quota Was Cut",
    body: "Export control enforcement arrived retroactively. A shipment of 40 units is in a customs warehouse and the broker has stopped answering.",
    choices: [
      { label: "Buy domestic at a 45% premium", detail: "Costs, but keeps the roadmap.", cost: 620, effects: {} },
      { label: "Shift to inference on existing stock", detail: "Deferred capability.", effects: { capability: -1.8, trust: 1 } },
      { label: "Lobby hard for an exemption", detail: "Costs cash and credibility.", cost: 300, effects: { heat: 9, trust: -5 } },
    ],
  },
  {
    id: "child_safety",
    kind: "press",
    tag: "SAFETY",
    title: "Minors Bypassed Your Age Gate",
    body: "An investigation found teenagers using your API through a reseller wrapper with no verification whatsoever.",
    choices: [
      { label: "Kill the reseller programme, verify everyone", detail: "Revenue hit, trust gain.", cost: 110, effects: { trust: 11, heat: -10 } },
      { label: "Add a checkbox to the wrapper", detail: "The industry-standard gesture.", cost: 20, effects: { trust: -5, heat: 7 } },
      { label: "Say it is the reseller's responsibility", detail: "Contractually correct. Publicly fatal.", effects: { trust: -13, heat: 15 } },
    ],
  },
];

