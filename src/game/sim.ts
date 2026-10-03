import type {
  GameState, Model, ModelTraits, Researcher, ActiveEvent, Choice, TrainingRun, DataMix, LogEntry,
} from "./types";
import {
  ACCELS, ARCHS, EMERGENT, EVALS, FACILITIES, GAME_LENGTH, INCIDENTS, NEWS_POOL,
  RACKS, RIVALS, SEGMENTS, STARTER_NAMES, TRAINING_EVENTS, WEEKS_PER_QUARTER, makeRegions, randomResearcher,
} from "./content";
import { derive, segmentFit, OBJECTIVES } from "./engine";

/* ---------------- rng ---------------- */
export function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pick = <T,>(arr: T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

function log(s: GameState, text: string, tone: LogEntry["tone"]) {
  s.log.unshift({ week: s.week, text, tone });
  if (s.log.length > 220) s.log.pop();
}

/* ---------------- helpers ---------------- */

export function computeNeeded(params: number, arch: string) {
  const a = ARCHS.find((x) => x.id === arch)!;
  return 20 * Math.pow(params, 1.1) * a.computeMult;
}

export function dataQualityOf(mix: { licensed: number; scraped: number; synthetic: number }, dataStaff: number) {
  const tot = mix.licensed + mix.scraped + mix.synthetic || 1;
  const l = mix.licensed / tot, sc = mix.scraped / tot, sy = mix.synthetic / tot;
  const q = 0.74 + l * 0.28 + sc * 0.04 + sy * 0.015 + dataStaff * 0.012;
  return {
    quality: clamp(q, 0.62, 1.08),
    contamination: clamp(sy * 0.65 + sc * 0.08, 0, 1),
    legal: clamp(Math.pow(sc, 2.1) * 1.05, 0, 1),
    licensed: l, scraped: sc, synthetic: sy,
  };
}

export function preview(
  s: GameState, d: ReturnType<typeof derive>, params: number, arch: string,
  mix: { licensed: number; scraped: number; synthetic: number }, safetyShare: number, units: number
) {
  const a = ARCHS.find((x) => x.id === arch)!;
  const dq = dataQualityOf(mix, d.dataStaff);
  const cn = computeNeeded(params, arch) * (1 + safetyShare * 0.55);
  const tf = d.tf * (d.units > 0 ? Math.min(units, d.units) / d.units : 0) * d.efficiency;
  const weeks = tf > 0.001 ? cn / tf : 999;
  const cap =
    baseCap(params) * (1 + 0.09 * (s.techLevel - 1)) * (1 + 0.008 * d.capabilityStaff) * dq.quality *
    a.capMult * (1 - 0.3 * safetyShare);
  const safetyFactor = clamp(0.2 + safetyShare * 2.6 + d.alignmentStaff * 0.035 + d.interpStaff * 0.025 + (dq.quality - 0.9) * 0.5, 0, 1.6);
  const scaleRisk = clamp(0.22 + Math.log10(1 + params) / 3.1, 0.2, 0.92);
  const risk = clamp((0.4 + 0.55 * scaleRisk) * clamp(1 - 0.72 * safetyFactor, 0.06, 1.4) * 0.85, 0.02, 0.95);
  const legal = dq.legal;
  const lost = (d.units - Math.min(units, d.units)) / Math.max(1, d.units) * d.inferCapK;
  return { cap, weeks, cost: dataCostOf(params, mix), risk, legal, quality: dq.quality, contamination: dq.contamination, lostInference: lost, compute: cn, tf };
}

export function dataCostOf(params: number, mix: { licensed: number; scraped: number; synthetic: number }) {
  const tot = mix.licensed + mix.scraped + mix.synthetic || 1;
  return Math.round(Math.pow(params, 0.92) * ((mix.licensed / tot) * 7.5 + (mix.scraped / tot) * 0.5 + (mix.synthetic / tot) * 1.3) * 10) / 10;
}

function baseCap(params: number) {
  return 6.2 * Math.log(1 + params);
}

/* ---------------- model creation ---------------- */

function finishRun(s: GameState, rng: () => number) {
  const run = s.run!;
  const d = derive(s);
  const dq = dataQualityOf(run.dataMix, d.dataStaff);
  const arch = ARCHS.find((a) => a.id === run.arch)!;
  const safetyFactor = clamp(
    0.2 + run.safetyShare * 2.6 + d.alignmentStaff * 0.035 + d.interpStaff * 0.025 + (dq.quality - 0.9) * 0.5,
    0, 1.6
  );
  const scaleRisk = clamp(0.22 + Math.log10(1 + run.params) / 3.1, 0.2, 0.92);
  const tm = clamp(1 - 0.72 * safetyFactor, 0.06, 1.4);
  const weights = { deception: 0.55, hallucination: 1.0, misuse: 0.82, sycophancy: 0.86, instability: 0.7 };
  const traits = {} as ModelTraits;
  (Object.keys(weights) as (keyof ModelTraits)[]).forEach((k) => {
    let v = (0.4 + 0.55 * scaleRisk) * tm * weights[k] + (rng() - 0.5) * 0.14;
    if (k === "instability") v += run.dataMix.synthetic / 200 + (arch.id === "moe" ? 0.1 : 0);
    if (k === "hallucination" && arch.id === "neurosym") v *= 0.55;
    if (k === "misuse") v *= 1 - (d.security ? 0.25 : 0);
    traits[k] = clamp(v, 0.02, 0.96);
  });

  let cap =
    baseCap(run.params) *
    (1 + 0.09 * (s.techLevel - 1)) *
    (1 + 0.008 * d.capabilityStaff) *
    dq.quality *
    arch.capMult *
    (1 - 0.3 * run.safetyShare) *
    (0.9 + rng() * 0.22);
  for (const e of run.emergent) cap += EMERGENT.find((x) => x.name === e)?.cap ?? 0;
  cap = Math.max(1.2, Math.round(cap * 10) / 10);

  const usedNames = s.models.map((m) => m.name);
  const pool = STARTER_NAMES.filter((n) => !usedNames.includes(n));
  const name = pool.length ? pool[0] : "GA-" + (s.models.length + 1);

  const model: Model = {
    id: "m" + s.models.length + "-" + Math.floor(rng() * 1e6),
    name,
    params: run.params,
    arch: run.arch,
    bornWeek: s.week,
    status: "evaluating",
    capability: cap,
    quality: dq.quality,
    traits,
    revealed: { deception: false, hallucination: false, misuse: false, sycophancy: false, instability: false },
    safetyShare: run.safetyShare,
    dataMix: dq as DataMix,
    trainingCost: Math.round(run.spend),
    evals: [],
    evalsPassed: 0,
    weeksTrained: s.week - run.startedWeek,
    hiddenGem: run.emergent[run.emergent.length - 1],
    inferenceShare: 1,
    price: 1.2,
    generation: s.models.length + 1,
    revenue: 0,
  };
  s.models.unshift(model);
  s.bestCap = Math.max(s.bestCap, cap);
  s.runHistory.unshift({ name, week: s.week, cap, params: run.params, status: "trained" });
  log(s, `${name}-${model.generation}.0 (${run.params}B, ${arch.name}) finished training. Capability ${cap.toFixed(1)}. Now in evaluation.`, "good");
  if (run.emergent.length) log(s, `Emergent behaviours logged: ${run.emergent.join(", ")}.`, "neutral");
  s.run = null;
}

/* ---------------- events ---------------- */

function queueEvent(s: GameState, ev: Omit<ActiveEvent, "instId" | "week">, rng: () => number) {
  s.queue.push({ ...ev, instId: ev.id + "-" + Math.floor(rng() * 1e9).toString(36), week: s.week });
  if (!s.paused) s.autoPause = true;
  s.paused = true;
}

function applyEffects(s: GameState, c: Choice) {
  const e = c.effects;
  const d = derive(s);
  if (c.cost) s.cash -= c.cost;
  if (e.cash) s.cash += e.cash;
  if (e.trust) s.trust = clamp(s.trust + e.trust, 0, 100);
  if (e.heat) s.heatHome = clamp(s.heatHome + e.heat, 0, 100);
  if (e.awareness) s.awareness = clamp(s.awareness + e.awareness, 0.02, 1);
  if (e.capability) {
    const m = s.models.find((x) => x.status === "released") ?? s.models[0];
    if (m) m.capability = Math.max(1, m.capability + e.capability);
    s.bestCap = Math.max(s.bestCap, ...s.models.map((m) => m.capability));
  }
  if (e.staffMorale || e.burnout) {
    for (const r of s.researchers) {
      if (e.staffMorale) r.morale = clamp(r.morale + e.staffMorale, 0.05, 1);
      if (e.burnout) r.burnout = clamp(r.burnout + e.burnout, 0, 1);
    }
  }
  if (e.damage) {
    for (const t of s.grid) if (t.b) t.b.condition = clamp((t.b.condition ?? 1) + e.damage * 0.6, 0.1, 1);
  }
  if (e.delayWeeks && s.run) s.run.computeDone = Math.max(0, s.run.computeDone - e.delayWeeks * d.trainTf);
  if (e.revealAll) {
    for (const m of s.models) {
      if (m.status === "released" || m.status === "evaluating") {
        (Object.keys(m.revealed) as (keyof ModelTraits)[]).forEach((k) => {
          if (rngv() < e.revealAll!) m.revealed[k] = true;
        });
      }
    }
  }
}
let _rng: () => number = Math.random;
function rngv() { return _rng(); }

function triggerIncident(s: GameState, rng: () => number) {
  const d = derive(s);
  const kinds: string[] = [];
  for (const m of s.models) {
    if (m.status !== "released") continue;
    const t = m.traits;
    if (!m.revealed.hallucination || t.hallucination > 0.35) kinds.push("hallucination");
    if (!m.revealed.misuse || t.misuse > 0.4) kinds.push("jailbreak");
    if (t.misuse > 0.5 && !m.revealed.misuse) kinds.push("misuse");
    if (!m.revealed.deception && t.deception > 0.45) kinds.push("whistleblower");
    if (!m.revealed.sycophancy && t.sycophancy > 0.5) kinds.push("hallucination");
  }
  if (d.thermal > 1.0) kinds.push("outage", "heatwave");
  if (d.thermal > 0.95 && rng() < 0.4) kinds.push("outage");
  if (s.grid.some((t) => t.b?.unitGen) && d.thermal > 0.9 && rng() < 0.3) kinds.push("leak");
  for (const m of s.models) if (m.dataMix.legal > 0.45) kinds.push("lawsuit");
  if (s.week > 60 && rng() < 0.35) kinds.push("regulator");
  if (s.models.some((m) => m.status === "released" && m.evalsPassed < 2) && rng() < 0.3) kinds.push("whistleblower");
  if (rng() < 0.22) kinds.push("opportunity");
  if (rng() < 0.14) kinds.push("press");
  if (rng() < 0.18) kinds.push("rival");

  let kind = pick(kinds.length ? kinds : ["press"], rng);
  let cand = INCIDENTS.filter((i) => i.kind === kind);
  if (!cand.length) cand = INCIDENTS;
  const recent = s.flags["lastIncident"];
  if (recent && cand.length > 1) cand = cand.filter((c) => c.id !== recent);
  const ev = pick(cand, rng);
  s.flags["lastIncident"] = ev.id;
  s.incidentCount++;
  s.incidentStreak++;
  s.flags["incidentWeek" + (s.incidentCount - 1)] = s.week;
  queueEvent(s, ev, rng);
  log(s, `INCIDENT — ${ev.title}`, "bad");
}

/* ---------------- weekly tick ---------------- */

export function tick(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const rng = makeRng(s.seed);
  _rng = rng;
  s.week += 1;
  s.year = 1 + Math.floor((s.week - 1) / 52);
  const d = derive(s);

  /* laws */
  for (const r of s.regions) {
    for (const l of r.laws) {
      if (!l.active && s.week >= l.week) {
        l.active = true;
        log(s, `LAW — ${l.name} is now in force in ${r.name}. ${l.desc}`, "major");
      }
      if (l.active) {
        if (l.complied) s.trust = clamp(s.trust + l.trustBonus / 26, 0, 100);
        else s.heatHome = clamp(s.heatHome + l.penalty, 0, 100);
      }
    }
  }

  /* environment */
  s.powerPrice = Math.round(clamp(s.powerPrice + (rng() - 0.45) * 4 + (s.week > 150 ? 0.5 : 0), 52, 210));
  s.priceIndex = s.priceIndex * 1.002;
  s.techLevel = Math.min(6, Math.floor((s.week - 1) / 48) + Math.floor(s.models.length / 4));

  /* rivals */
  for (const rv of s.rivals) {
    const push = rv.aggression * (0.05 + s.week * 0.0006) * (0.6 + rng() * 0.9);
    rv.capability += push;
    if (rng() < 0.025) {
      rv.capability += 1.2 + rng() * 1.8;
      const lines = [
        `${rv.name} announces a frontier system. Benchmarks are, they say, "decisive".`,
        `${rv.name} publishes a scaling result. The curve is unsettlingly clean.`,
        `${rv.name} raises at a valuation that makes your CFO laugh nervously.`,
        `${rv.name} quietly signs an exclusive compute deal. Chips get scarcer.`,
        `${rv.name} releases their safety case. It is nine pages long.`,
      ];
      s.newsfeed.unshift({ week: s.week, text: pick(lines, rng), who: rv.name });
      rv.milestones.push(`W${s.week} — capability ${rv.capability.toFixed(0)}`);
    }
    if (rng() < 0.02) {
      s.newsfeed.unshift({ week: s.week, text: `${rv.name} poaches a senior researcher from a mid-tier lab. The market is thin.`, who: rv.name });
    }
  }
  if (rng() < 0.16) s.newsfeed.unshift({ week: s.week, text: pick(NEWS_POOL, rng), who: "Wire" });
  if (s.newsfeed.length > 60) s.newsfeed.length = 60;

  /* training run */
  if (s.run && s.run.status === "running") {
    const tf = d.trainTf;
    s.run.computeDone += tf;
    s.run.spend += tf * (d.salaries / Math.max(1, d.tf)) * 0.9 + tf * 0.35;
    const frac = clamp(s.run.computeDone / s.run.computeNeeded, 0, 1);
    const noise = (rng() - 0.5) * 0.05 * (1 - frac);
    s.run.lossLog.push(Math.max(0.55, 3.4 - 2.95 * Math.pow(frac, 0.55) + noise + (s.run.computeNeeded > 0 ? 0 : 0)));
    if (s.run.lossLog.length > 260) s.run.lossLog.shift();

    // emergent capability thresholds
    const thresholds = [0.28, 0.55, 0.82];
    const discovered = s.run.emergent.length;
    if (discovered < thresholds.length && frac >= thresholds[discovered] && rng() < 0.55) {
      const e = pick(EMERGENT, rng);
      if (!s.run.emergent.includes(e.name)) {
        s.run.emergent.push(e.name);
        s.run.notes.push(e.note);
        log(s, `EMERGENT — ${e.name}. ${e.note}`, e.cap > 0 ? "good" : "bad");
      }
    }
    // mid-run event
    const lastEv = s.flags["lastTrainEvent"] ?? 0;
    if (s.week - lastEv > 2 && rng() < 0.3 && s.queue.length === 0) {
      const cand = TRAINING_EVENTS.filter((e) => e.id !== s.flags["lastTrainEventId"]); // eslint-disable-line
      const ev = pick(cand.length ? cand : TRAINING_EVENTS, rng);
      s.flags["lastTrainEvent"] = s.week;
      s.flags["lastTrainEventId"] = ev.id;
      queueEvent(s, ev, rng);
      log(s, `RUN EVENT — ${ev.title}`, "neutral");
    }
    if (s.run.computeDone >= s.run.computeNeeded) finishRun(s, rng);
  }

  /* revenue */
  const live = s.models.filter((m) => m.status === "released");
  let capacity = d.inferCapK;
  let revenue = 0;
  if (live.length && capacity > 0.5) {
    const rows = s.segments.map((seg) => {
      const best = live.reduce((acc, m) => (segmentFit(m, seg, s, d) > segmentFit(acc, seg, s, d) ? m : acc), live[0]);
      return { seg, m: best, demand: segmentFit(best, seg, s, d) };
    });
    rows.sort((a, b) => b.m.price * b.demand - a.m.price * a.demand);
    for (const r of rows) {
      const alloc = Math.min(r.demand, capacity);
      capacity -= alloc;
      const gross = (alloc * r.m.price) / 1000;
      revenue += gross;
      r.m.revenue += gross;
    }
  }
  s.uptime = clamp(1 - 0.4 * Math.pow(Math.max(0, d.thermal - 0.96), 1.15) - d.hardwareRisk * 0.18 - rng() * 0.012, 0.5, 0.999);
  revenue *= s.uptime;
  s.revenue = Math.round(revenue * 10) / 10;
  s.cash += s.revenue - d.expenses;

  /* hardware wear */
  for (const t of s.grid) {
    if (!t.b) continue;
    const wear = 0.0018 + Math.max(0, d.thermal - 1) * 0.02;
    t.b.condition = clamp((t.b.condition ?? 1) - wear, 0.05, 1);
  }

  /* trust & awareness dynamics */
  s.trust = clamp(s.trust + (52 - s.trust) * 0.014 + (s.uptime > 0.995 ? 0.08 : 0) + (s.models.some((m) => m.status === "released" && m.evalsPassed >= 3) ? 0.06 : 0), 0, 100);
  s.awareness = clamp(s.awareness * 0.988 + 0.005, 0.02, 1);
  s.heatHome = clamp(s.heatHome - (s.trust > 65 ? 0.22 : 0.05), 0, 100);

  /* researcher drift */
  for (const r of s.researchers) {
    const load = (s.run ? 0.055 : 0.015) + (r.ego > 0.7 ? 0.012 : 0);
    r.burnout = clamp(r.burnout + load - 0.02, 0, 1);
    r.morale = clamp(r.morale + (r.burnout > 0.65 ? -0.03 : 0.012) + (s.trust > 70 ? 0.004 : 0), 0.05, 1);
  }
  // quits
  for (const r of [...s.researchers]) {
    if (r.burnout > 0.9 && rng() < 0.09) {
      s.researchers = s.researchers.filter((x) => x.id !== r.id);
      log(s, `${r.name} resigned. Burnout. "Nothing personal." Key-person risk realised.`, "bad");
    } else if (r.morale < 0.2 && rng() < 0.05) {
      s.researchers = s.researchers.filter((x) => x.id !== r.id);
      log(s, `${r.name} left for a rival. Morale was the problem.`, "bad");
    }
  }
  // poach offers
  if (s.researchers.length > 2 && rng() < 0.035) {
    const r = pick(s.researchers, rng);
    s.flags.poachId = r.id;
    queueEvent(s, {
      id: "poach_offer", kind: "poach", tag: "PEOPLE",
      title: `${r.name} Has An Offer`,
      body: `${r.name} (${r.field}, skill ${r.skill}/10) has been approached by ${pick(s.rivals, rng).name} at $${(r.salary * 52 * 2.6).toFixed(0)}k/yr — roughly ${(r.salary * 2.6).toFixed(1)}× what you pay. They would rather stay, if staying is a real option.`,
      choices: [
        { label: `Match at $${(r.salary * 52 * 2.4).toFixed(0)}k/yr`, detail: "Retention costs money, permanently.", effects: { cash: 0 } },
        { label: "Offer a title instead of money", detail: "Sometimes works. Usually doesn't.", effects: { staffMorale: 0.04 } },
        { label: "Let them go", detail: "Lose the researcher and their tacit knowledge.", effects: {} },
      ],
    }, rng);
  }

  /* hiring market refresh */
  if (s.week % 4 === 1) {
    const tier = Math.floor(s.week / 80);
    s.candidates = Array.from({ length: 5 }, () => randomResearcher(rng, s.week, tier));
  }

  /* incidents */
  const pInc = clamp(0.045 + d.hazard * 0.1 + d.hardwareRisk * 0.3 + Math.max(0, s.heatHome - 45) / 320, 0.04, 0.62);
  const lastInc = s.flags["lastIncidentWeek"] ?? -99;
  if (s.week - lastInc > 3 && rng() < pInc && s.queue.length === 0 && s.week > 6) {
    s.flags["lastIncidentWeek"] = s.week;
    triggerIncident(s, rng);
  }

  /* records */
  s.revenueHistory.push(s.revenue);
  s.expenseHistory.push(Math.round(d.expenses * 10) / 10);
  s.history.push({ week: s.week, cash: s.cash, rev: s.revenue, exp: d.expenses, trust: s.trust, cap: s.bestCap });
  if (s.history.length > GAME_LENGTH + 4) s.history.shift();
  s.fleetUtil = d.utilisation;
  s.coolingStress = d.thermal;

  /* quarter close */
  if (s.week % WEEKS_PER_QUARTER === 0) {
    const q = Math.floor(s.week / WEEKS_PER_QUARTER);
    const rev = s.revenueHistory.slice(-WEEKS_PER_QUARTER).reduce((a, b) => a + b, 0);
    const exp = s.expenseHistory.slice(-WEEKS_PER_QUARTER).reduce((a, b) => a + b, 0);
    const profit = rev - exp;
    if (profit > 0) s.quartersProfitable++;
    const runRate = rev * 4;
    const multiple = clamp(9 + s.trust / 6 + s.bestCap / 4 + (profit > 0 ? 6 : -4), 3, 34);
    s.valuation = Math.max(0.02, runRate * multiple * 1e-6 + s.bestCap * 0.006 + d.hwValue * 2e-6);
    s.lastQuarter = q;
    log(
      s,
      `Q${q} close — revenue ${Math.round(rev)}k, expenses ${Math.round(exp)}k, ${profit >= 0 ? "profit" : "loss"} ${Math.round(Math.abs(profit))}k. Valuation estimate $${s.valuation.toFixed(1)}B.`,
      profit >= 0 ? "good" : "bad"
    );
  }

  /* objectives */
  for (const o of OBJECTIVES) {
    if (!s.objectivesDone.includes(o.id) && o.done(s)) {
      s.objectivesDone.push(o.id);
      s.awareness = clamp(s.awareness + 0.02, 0, 1);
      log(s, `MILESTONE — ${o.label}.`, "major");
    }
  }

  /* endings */
  checkEndings(s);
  s.seed = Math.floor(rng() * 1e9);
  return s;
}

export function checkEndings(s: GameState) {
  if (s.ending) return;
  if (s.trust > 11) s.flags.trustEstablished = true;
  const rivalBest = Math.max(...s.rivals.map((r) => r.capability), 0);
  const released = s.models.filter((m) => m.status === "released");
  const win = (kind: string, title: string, body: string) => {
    s.ending = { kind, title, body };
    s.paused = true;
  };
  if (s.cash < -1400) return win("lose", "Bankruptcy", "The bridge round did not close. The racks were sold at eleven cents on the dollar and the domain is now a parking page. Gradient Ascent ran for " + s.week + " weeks.");
  if (s.heatHome >= 100) return win("lose", "Licence Revoked", "The Compute Authority pulled your deployment licence. Servers go dark at midnight. Your models still exist — you just aren't allowed to let anyone talk to them.");
  if (s.flags.trustEstablished && s.trust <= 11) return win("lose", "Catastrophic Incident Cascade", "Trust " + s.trust.toFixed(0) + ". Every headline now begins with your name and ends with a question mark. Enterprise churns out. The board asks you to 'pursue other opportunities'.");
    if (s.bestCap >= rivalBest + 4 && s.bestCap >= 40 && s.trust >= 52 && released.length >= 3)
    return win("win", "Capability Breakthrough", "You got there first — capability " + s.bestCap.toFixed(0) + " against a best rival of " + rivalBest.toFixed(0) + ", with a Trust Score of " + s.trust.toFixed(0) + ". The scaling plot everyone teaches in 2035 has your lab's name in the corner. You defined an era, and mostly survived it.");
  if (s.trust >= 80 && s.cash >= 6000 && s.quartersProfitable >= 5)
    return win("win", "Trusted Steward", "Five profitable quarters, $" + (s.cash / 1000).toFixed(1) + "M in the bank, and a Trust Score of " + s.trust.toFixed(0) + ". You were never the flashiest lab. You are the one regulators call when they want an honest answer.");
  if (s.valuation >= 4 && s.trust >= 45 && s.revenue >= 350)
    return win("ipo", "IPO", "The bell rings. Opening valuation $" + s.valuation.toFixed(1) + "B on a $" + ((s.revenue * 52) / 1000).toFixed(0) + "M annual run rate. Somewhere a garage lease is being framed.");
  if (s.week >= GAME_LENGTH) {
    if (s.bestCap >= 34 && s.trust >= 50) win("draw", "The Long Grind", "Five years, capability " + s.bestCap.toFixed(0) + ", Trust " + s.trust.toFixed(0) + ", $" + (s.cash / 1000).toFixed(1) + "M cash. Not the era-defining lab. A good one, still standing, still shipping.");
    else win("draw", "The Long Grind", "Five years and you are still here, which is more than most can say. Capability " + s.bestCap.toFixed(0) + ", Trust " + s.trust.toFixed(0) + ". The frontier moved on without you, but it knows your name.");
  }
}

/* ---------------- actions ---------------- */

export type Action =
  | { t: "tick" }
  | { t: "speed"; v: number }
  | { t: "pause"; v: boolean }
  | { t: "buyFloor"; x: number; y: number }
  | { t: "build"; x: number; y: number; variant: string; kind: string }
  | { t: "demolish"; x: number; y: number }
  | { t: "buyUnits"; x: number; y: number; gen: string; count: number }
  | { t: "sellUnits"; x: number; y: number; count: number }
  | { t: "inferenceShare"; v: number }
  | { t: "startRun"; params: number; arch: string; safetyShare: number; mix: { licensed: number; scraped: number; synthetic: number }; units: number; name: string }
  | { t: "cancelRun" }
  | { t: "runEval"; modelId: string; evalId: string }
  | { t: "release"; modelId: string; price: number }
  | { t: "shelve"; modelId: string }
  | { t: "setPrice"; modelId: string; price: number }
  | { t: "hire"; r: Researcher }
  | { t: "fire"; id: string }
  | { t: "rest"; id: string }
  | { t: "comply"; lawId: string }
  | { t: "lobby"; lawId: string }
  | { t: "resolve"; instId: string; choice: number }
  | { t: "dismissEvent"; instId: string }
  | { t: "restart" }
  | { t: "raiseCapital" }
  | { t: "init" };

export function apply(state: GameState, a: Action): GameState {
  if (a.t === "tick") return tick(state);
  if (a.t === "restart") return init(newGameRaw());
  const s: GameState = JSON.parse(JSON.stringify(state));
  const rng = makeRng(s.seed + 7);
  _rng = rng;
  const d = derive(s);

  switch (a.t) {
    case "init":
      return init(state);
    case "raiseCapital":
      if (s.flags.awaitingStart) {
        s.cash = 3400;
        s.flags.awaitingStart = false;
        log(s, "Pre-seed round closed. $3.4M is now available to build the lab.", "major");
      }
      break;
    case "speed":
      s.speed = a.v; s.paused = false; break;
    case "pause":
      s.paused = a.v; break;

    case "buyFloor": {
      const t = s.grid.find((g) => g.x === a.x && g.y === a.y);
      if (t && !t.unlocked) {
        const cost = 45 + Math.round(Math.max(a.x, a.y) * 16);
        if (s.cash >= cost) { s.cash -= cost; t.unlocked = true; log(s, `Floor prepared at (${a.x},${a.y}) for ${cost}k.`, "neutral"); }
      }
      break;
    }
    case "build": {
      const t = s.grid.find((g) => g.x === a.x && g.y === a.y);
      if (!t || !t.unlocked || t.b) break;
      const cost = a.kind === "rack" ? RACKS.find((r) => r.id === a.variant)!.cost : FACILITIES.find((f) => f.id === a.variant)!.cost;
      if (s.cash < cost) break;
      if (a.kind === "rack" && d.itPower + RACKS.find((r) => r.id === a.variant)!.slots * 0.5 > d.powerCap) {
        log(s, `Rejected: insufficient power capacity. Build a Substation Feed first.`, "bad"); break;
      }
      s.cash -= cost;
      t.b = { id: "b" + Math.floor(rng() * 1e9).toString(36), kind: a.kind as never, variant: a.variant, built: s.week, condition: 1, units: 0, unitGen: ACCELS[0].id };
      log(s, `Built ${a.kind === "rack" ? RACKS.find((r) => r.id === a.variant)!.name : FACILITIES.find((f) => f.id === a.variant)!.name}.`, "neutral");
      break;
    }
    case "demolish": {
      const t = s.grid.find((g) => g.x === a.x && g.y === a.y);
      if (!t?.b) break;
      const rec = RACKS.find((r) => r.id === t.b!.variant)?.cost ?? FACILITIES.find((f) => f.id === t.b!.variant)?.cost ?? 0;
      s.cash += rec * 0.3;
      t.b = undefined;
      break;
    }
    case "buyUnits": {
      const t = s.grid.find((g) => g.x === a.x && g.y === a.y);
      if (!t?.b || t.b.kind !== "rack") break;
      const gen = ACCELS.find((g) => g.id === a.gen)!;
      const rack = RACKS.find((r) => r.id === t.b!.variant)!;
      const room = rack.slots - (t.b.units ?? 0);
      const n = Math.min(a.count, room, Math.floor(s.cash / gen.price));
      if (n <= 0) break;
      if (d.itPower + n * gen.power > d.powerCap) { log(s, `Rejected: that purchase would exceed your power feed.`, "bad"); break; }
      s.cash -= n * gen.price;
      if ((t.b.units ?? 0) === 0) t.b.unitGen = gen.id;
      t.b.units = (t.b.units ?? 0) + n;
      log(s, `Installed ${n}× ${gen.name} for ${(n * gen.price).toFixed(0)}k.`, "neutral");
      break;
    }
    case "sellUnits": {
      const t = s.grid.find((g) => g.x === a.x && g.y === a.y);
      if (!t?.b || t.b.kind !== "rack") break;
      const gen = ACCELS.find((g) => g.id === t.b!.unitGen)!;
      const n = Math.min(a.count, t.b.units ?? 0);
      s.cash += n * gen.price * 0.45;
      t.b.units = (t.b.units ?? 0) - n;
      if (t.b.units === 0) t.b.unitGen = undefined;
      break;
    }
    case "inferenceShare":
      s.inferenceShare = a.v; break;

    case "startRun": {
      if (s.run) break;
      const cost = dataCostOf(a.params, a.mix);
      if (s.cash < cost + 20) { log(s, `Not enough cash for this run (data: ${cost.toFixed(0)}k).`, "bad"); break; }
      const run: TrainingRun = {
        id: "run" + s.week,
        name: a.name,
        params: a.params,
        arch: a.arch,
        safetyShare: a.safetyShare,
        dataMix: a.mix,
        computeNeeded: computeNeeded(a.params, a.arch) * (1 + a.safetyShare * 0.55),
        computeDone: 0,
        allocatedUnits: Math.min(a.units, d.units),
        allocatedTf: 0,
        startedWeek: s.week,
        lossLog: [3.4],
        status: "running",
        spend: cost,
        notes: [],
        emergent: [],
        seed: s.seed,
      };
      s.run = run;
      s.cash -= cost;
      s.runHistory.unshift({ name: a.name, week: s.week, cap: 0, params: a.params, status: "started" });
      log(s, `Training run "${a.name}" launched — ${a.params}B params, ${a.arch}, safety share ${Math.round(a.safetyShare * 100)}%.`, "major");
      break;
    }
    case "cancelRun": {
      if (!s.run) break;
      log(s, `Run "${s.run.name}" aborted. Checkpoints deleted. ${Math.round((s.run.computeDone / s.run.computeNeeded) * 100)}% complete.`, "bad");
      s.runHistory.unshift({ ...s.runHistory[0], status: "aborted" });
      s.run = null;
      break;
    }
    case "runEval": {
      const m = s.models.find((x) => x.id === a.modelId);
      const ev = EVALS.find((e) => e.id === a.evalId);
      if (!m || !ev) break;
      const already = m.evals.filter((e) => e.id === ev.id).length;
      const cost = Math.round(ev.cost * (1 + already * 0.9) * (1 + m.params / 90));
      if (s.cash < cost) { log(s, `Not enough cash for ${ev.name}.`, "bad"); break; }
      s.cash -= cost;
      const dNow = derive(s);
      const safetyFactor = clamp(0.2 + m.safetyShare * 2.6 + dNow.alignmentStaff * 0.035 + dNow.interpStaff * 0.025, 0, 1.6);
      let pass = ev.base + safetyFactor * 0.34 + (dNow.interpLab ? 0.09 : 0) + already * 0.3 - m.traits.instability * 0.2;
      if (ev.id === "halluc") pass -= m.traits.hallucination * 0.45;
      if (ev.id === "redteam") pass -= m.traits.misuse * 0.4 + m.traits.deception * 0.3;
      if (ev.id === "interp") pass -= m.traits.deception * 0.35 + (dNow.interpLab ? 0 : 0.25);
      if (ev.id === "robust") pass -= m.traits.instability * 0.4;
      const ok = rng() < clamp(pass, 0.05, 0.95);
      const rev = m.revealed as unknown as Record<string, boolean>;
      for (const k of ev.reveals) rev[k] = true;
      m.evals.push({ id: ev.id, passed: ok, week: s.week, score: Math.round(clamp(pass, 0.05, 0.95) * 100) });
      if (ok) { m.evalsPassed++; s.trust = clamp(s.trust + 1.4, 0, 100); log(s, `${m.name} PASSED ${ev.name} (score ${Math.round(clamp(pass, .05, .95) * 100)}). Gate ${m.evalsPassed} unlocked.`, "good"); }
      else { s.trust = clamp(s.trust - 0.6, 0, 100); log(s, `${m.name} FAILED ${ev.name}. The trait is now visible — and unfixed.`, "bad"); }
      break;
    }
    case "release": {
      const m = s.models.find((x) => x.id === a.modelId);
      if (!m) break;
      m.status = "released";
      m.price = a.price;
      m.releaseWeek = s.week;
      const hidden = (Object.keys(m.revealed) as (keyof ModelTraits)[]).filter((k) => !m.revealed[k]).length;
      s.awareness = clamp(s.awareness + 0.12, 0, 1);
      if (hidden >= 3) {
        s.heatHome = clamp(s.heatHome + 6, 0, 100);
        log(s, `${m.name} released with ${hidden} unmeasured traits. Nobody knows yet. That is the problem.`, "bad");
      } else {
        s.trust = clamp(s.trust + 2, 0, 100);
        log(s, `${m.name} released at $${m.price.toFixed(2)}/1k calls, fully evaluated. The safety case is public.`, "good");
      }
      break;
    }
    case "shelve": {
      const m = s.models.find((x) => x.id === a.modelId);
      if (m) { m.status = "shelved"; log(s, `${m.name} shelved. It will not be served.`, "neutral"); }
      break;
    }
    case "setPrice": {
      const m = s.models.find((x) => x.id === a.modelId);
      if (m) m.price = a.price;
      break;
    }
    case "hire": {
      if (!s.researchers.some((r) => r.id === a.r.id)) {
        s.researchers.push({ ...a.r });
        log(s, `Hired ${a.r.name} (${a.r.field}, ${a.r.skill}/10) at ${a.r.salary.toFixed(1)}M/yr.`, "good");
      }
      break;
    }
    case "fire": {
      const r = s.researchers.find((x) => x.id === a.id);
      s.researchers = s.researchers.filter((x) => x.id !== a.id);
      if (r) { s.trust = clamp(s.trust - 1, 0, 100); for (const o of s.researchers) o.morale = clamp(o.morale - 0.09, 0.05, 1); log(s, `${r.name} was let go. The team noticed.`, "bad"); }
      break;
    }
    case "rest": {
      const r = s.researchers.find((x) => x.id === a.id);
      if (r) { r.burnout = clamp(r.burnout - 0.45, 0, 1); r.morale = clamp(r.morale + 0.16, 0, 1); s.cash -= 18; }
      break;
    }
    case "comply": {
      const l = s.regions[0].laws.find((x) => x.id === a.lawId);
      if (l) { l.complied = true; l.lobbied = false; s.trust = clamp(s.trust + l.trustBonus, 0, 100); log(s, `Compliance programme adopted for ${l.name}.`, "good"); }
      break;
    }
    case "lobby": {
      const l = s.regions[0].laws.find((x) => x.id === a.lawId);
      if (l && s.cash >= 260) {
        l.lobbied = !l.lobbied;
        s.cash -= 260;
        log(s, l.lobbied ? `Lobbyists engaged on ${l.name}. Heat accrual reduced; trust takes a mark.` : `Lobbying withdrawn on ${l.name}.`, l.lobbied ? "neutral" : "neutral");
        if (l.lobbied) { s.trust = clamp(s.trust - 3, 0, 100); l.penalty = l.penalty * 0.35; }
      }
      break;
    }
    case "resolve":
    case "dismissEvent": {
      const ev = s.queue.find((e) => e.instId === a.instId);
      if (!ev) break;
      s.queue = s.queue.filter((e) => e.instId !== a.instId);
      if (a.t === "resolve") {
        const c = ev.choices[a.choice];
        if (c) {
          if (ev.kind === "poach") {
            const target = s.researchers.find((x) => x.id === s.flags.poachId) ?? s.researchers.slice().sort((p, q) => q.skill - p.skill)[0];
            if (a.choice === 0 && target) {
              target.salary = Math.round(target.salary * 2.4 * 10) / 10;
              target.morale = clamp(target.morale + 0.1, 0, 1);
              s.cash -= target.salary * 20;
              log(s, `${target.name} stayed — at $${(target.salary * 52).toFixed(0)}k/yr, plus a retention bonus.`, "good");
            }
            if (a.choice === 1 && target && rng() < 0.55) {
              s.researchers = s.researchers.filter((x) => x.id !== target.id);
              log(s, `${target.name} left anyway. Titles are not money.`, "bad");
            }
            if (a.choice === 2 && target) {
              s.researchers = s.researchers.filter((x) => x.id !== target.id);
              log(s, `${target.name} left. Their knowledge walked out with them.`, "bad");
            }
          } else applyEffects(s, c);
          if (c.cost) s.cash -= c.cost;
          log(s, `Decision: ${c.label}.`, "neutral");
        }
      }
      if (s.queue.length) {
        s.paused = true;
      } else if (s.autoPause) {
        s.autoPause = false;
        s.paused = false;
      }
      break;
    }
  }
  checkEndings(s);
  s.seed = Math.floor(rng() * 1e9);
  return s;
}

import { newGame as newGameRaw } from "./engine";
export function newGameFull(): GameState { return init(newGameRaw()); }
function init(base: GameState): GameState {
  base.rivals = JSON.parse(JSON.stringify(RIVALS));
  base.regions = makeRegions();
  base.segments = JSON.parse(JSON.stringify(SEGMENTS));
  base.flags = { awaitingStart: true };
  base.ending = null;
  const rng = makeRng(20260101);
  const tier = Math.floor(base.week / 80);
  base.candidates = Array.from({ length: 5 }, () => randomResearcher(rng, base.week, tier));
  return base;
}
