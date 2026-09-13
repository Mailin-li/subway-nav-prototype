import React, { useState, useEffect, useRef, useCallback } from "react";
const Volume2 = () => null;
const VolumeX = () => null;
const Settings = () => null;
const ChevronRight = () => null;
const ChevronLeft = () => null;
const MapPin = () => null;
const CheckCircle2 = () => null;
const AlertTriangle = () => null;
const LogIn = () => null;
const LogOut = () => null;
const Navigation = () => null;

// ---------------------------------------------------------------------------
// DESIGN TOKENS
// ---------------------------------------------------------------------------
const COLOR = {
  bg: "#0B0E11",
  surface: "#15191F",
  surfaceRaised: "#1D232B",
  accent: "#FFC145", // tactile-paving yellow — deliberate, not decorative
  accentDim: "#8A6A2B",
  text: "#F5F3EE",
  textDim: "#9AA0A6",
  danger: "#FF6B6B",
  success: "#4ADE80",
};

// ---------------------------------------------------------------------------
// STATION GRAPH (Beiyangjing Road Station — simplified to entry/exit scope only;
// boarding assistance at the platform is staff-handled and out of routing scope)
// ---------------------------------------------------------------------------
// NOTE: stairs/escalator edges are an assumed parallel alternative to each
// marked accessible-elevator edge (the source floor plan only marks elevators,
// not stair locations) — verify on-site before relying on this for real users.
const NODES = {
  exit_1: { label: "Exit 1", detail: "Zhangyang Road / Beiyangjing Road" },
  exit_2: { label: "Exit 2", detail: "Zhangyang Road / Nanyangjing Road" },
  exit_3: { label: "Exit 3", detail: "Zhangyang Road / Miaopu Road" },
  sc1: { label: "Service Center A", detail: "near Exit 1" },
  sc2: { label: "Service Center B", detail: "near Exit 2" },
  junction_top: { label: "the main corridor junction", detail: "" },
  junction_mid: { label: "the mid-station junction", detail: "" },
};

// Non-graph criteria (obstacle, tactile, width, weather, density) are attached
// per edge, but only the edges that are UNIQUE to a given exit's route are
// used to score that exit (see specificEdgesFor below) — edges shared by two
// or more exits' paths (e.g. the sc1->junction_top trunk, or the shared
// elevator leg into junction_mid) are excluded from every exit's score, so a
// well-kept interior corridor doesn't dilute a poorly-kept exit threshold or
// vice versa. Obstacle sums reproduce the photographic-survey worked example:
// O(exit_1) = 2 (bicycles near the walkway), O(exit_2) = 3 (a trash bin,
// severity 1, plus a support pole close to the through-path, severity 2),
// O(exit_3) = 0 (no obstruction near the elevator landing). Tactile, width,
// weather, and density reproduce the study's published normalized scores.
const EDGES = [

{
a:"exit_1",
b:"junction_top",
mode:"walk",
length:10,
turn:true,        // this is the only turn on the elevator-only route into Exit 1

obstacle:2,       // bicycles near the walkway, severity 2
tactile:0.8125,   // coverage-and-continuity rating for this segment
width:1.8,        // narrowest clear pinch point, meters
weather:2,        // Exposure/Drainage rating: fully open, chronic pooling
density:0.25      // baseline pedestrian density, people/m^2
},

{
a:"junction_top",
b:"sc1",
mode:"walk",
length:4,
turn:false,

// interior corridor, not exit-specific to any single exit — excluded from scoring
obstacle:0,
tactile:0.95,
width:3.0,
weather:0,
density:0.15
},

{
a:"junction_top",
b:"junction_mid",
mode:"elevator",
length:21,
turn:false,

// shared by both Exit 2 and Exit 3's routes — excluded from scoring
obstacle:0,
tactile:0.9,
width:2.4,
weather:1,
density:0.2
},

{
a:"junction_top",
b:"junction_mid",
mode:"stairs",
length:18,
turn:false,

obstacle:0,
tactile:0.75,
width:2.0,
weather:1,
density:0.2
},

{
a:"junction_mid",
b:"exit_3",
mode:"elevator",
length:11,
turn:false,       // no turn on the elevator-only route into Exit 3

obstacle:0,       // no obstruction found near the elevator landing
tactile:0.95,
width:2.2,
weather:1,
density:0.10
},

{
a:"junction_mid",
b:"exit_3",
mode:"stairs",
length:9,
turn:false,

obstacle:0,
tactile:0.8,
width:1.9,
weather:1,
density:0.10
},

{
a:"junction_mid",
b:"sc2",
mode:"walk",
length:5,
turn:false,

obstacle:1,       // trash bin against the wall, severity 1
tactile:0.5,
width:2.6,
weather:0,
density:0.2
},

{
a:"sc2",
b:"exit_2",
mode:"walk",
length:6,
turn:false,

obstacle:2,       // support pole close to the through-path, severity 2
tactile:0.32,     // worn/discontinuous near the street threshold
width:1.2,        // narrowest pinch point across all three exits
weather:0,
density:0.40      // major-arterial frontage
}

];

function buildAdjacency(allowStairs) {
  const adj = {};
  Object.keys(NODES).forEach((n) => (adj[n] = []));
  EDGES.forEach((e) => {
    if (e.mode === "stairs" && !allowStairs) return;
    adj[e.a].push({ to: e.b, edge: e });
    adj[e.b].push({ to: e.a, edge: e });
  });
  return adj;
}

// Dijkstra (small graph) — picks the shortest *allowed* route by physical
// distance, since parallel elevator/stairs edges differ in length and plain
// hop-count BFS can't distinguish them once both are legal options.
function shortestPath(adj, start, goal) {
  const dist = {};
  const prevEdge = {};
  const visited = new Set();
  Object.keys(adj).forEach((n) => (dist[n] = Infinity));
  dist[start] = 0;
  const queue = new Set(Object.keys(adj));
  while (queue.size) {
    let u = null;
    queue.forEach((n) => {
      if (u === null || dist[n] < dist[u]) u = n;
    });
    queue.delete(u);
    if (u === goal || dist[u] === Infinity) break;
    visited.add(u);
    adj[u].forEach(({ to, edge }) => {
      const alt = dist[u] + edge.length;
      if (alt < dist[to]) {
        dist[to] = alt;
        prevEdge[to] = { from: u, edge };
      }
    });
  }
  if (dist[goal] === Infinity) return null;
  const path = [];
  let cur = goal;
  while (cur !== start) {
    const step = prevEdge[cur];
    path.unshift(step.edge);
    cur = step.from;
  }
  return { edges: path, total: dist[goal] };
}

function bestReachable(adj, start, goals) {
  let best = null;
  goals.forEach((g) => {
    const r = shortestPath(adj, start, g);
    if (r && (!best || r.total < best.total)) best = { ...r, goal: g };
  });
  return best;
}

// ---------------------------------------------------------------------------
// EXIT-SELECTION MCDA
// ---------------------------------------------------------------------------
const EXIT_IDS = ["exit_1", "exit_2", "exit_3"];

// Final PIWC-adjusted, renormalized criterion weights
const WEIGHTS = {
  obstacle: 0.315,
  tactile: 0.13,
  distance: 0.222,
  turns: 0.133,
  width: 0.12,
  density: 0.069,
  weather: 0.011,
};

// An edge counts toward an exit's score only if it belongs to that exit's
// route and no other feasible exit's route — see comment above EDGES.
function specificEdgesFor(exitId, pathsByExit) {
  const others = Object.keys(pathsByExit).filter((id) => id !== exitId);
  return pathsByExit[exitId].filter(
    (edge) => !others.some((oid) => pathsByExit[oid].includes(edge))
  );
}

function normalizeCost(values) {
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (max - v) / (max - min));
}
function normalizeBenefit(values) {
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

// Stage 1: elevator accessibility is a mandatory constraint, applied
// to every rider regardless of their stairs/elevator preference — that
// preference only governs the entry-navigation routing above.
// Stage 2: min-max normalize each of the seven criteria across the
// feasible exits and combine with the final criterion weights.
function runExitMCDA(fromSC, isRaining) {
  const elevatorOnlyAdj = buildAdjacency(false);
  const pathsByExit = {};
  const feasible = [];
  EXIT_IDS.forEach((id) => {
    const r = shortestPath(elevatorOnlyAdj, fromSC, id);
    if (r) {
      pathsByExit[id] = r.edges;
      feasible.push(id);
    }
  });
  if (feasible.length === 0) {
    return { feasible: [], infeasible: EXIT_IDS, recommended: null, rows: [] };
  }

  const specific = {};
  feasible.forEach((id) => (specific[id] = specificEdgesFor(id, pathsByExit)));

  const distanceRaw = feasible.map((id) => pathsByExit[id].reduce((s, e) => s + e.length, 0));
  const turnsRaw = feasible.map((id) => pathsByExit[id].filter((e) => e.turn).length);
  const obstacleRaw = feasible.map((id) => specific[id].reduce((s, e) => s + e.obstacle, 0));
  const tactileRaw = feasible.map((id) => {
    const edges = specific[id];
    const totalLen = edges.reduce((s, e) => s + e.length, 0);
    return totalLen ? edges.reduce((s, e) => s + e.tactile * e.length, 0) / totalLen : 1;
  });
  const widthRaw = feasible.map((id) => Math.min(...specific[id].map((e) => e.width)));
  const densityRaw = feasible.map((id) => {
    const edges = specific[id];
    const atExit = edges.find((e) => e.a === id || e.b === id);
    return (atExit || edges[edges.length - 1]).density;
  });

  const sDistance = normalizeCost(distanceRaw);
  const sTurns = normalizeCost(turnsRaw);
  const sObstacle = normalizeCost(obstacleRaw);
  const sTactile = normalizeBenefit(tactileRaw);
  const sWidth = normalizeBenefit(widthRaw);
  const sDensity = normalizeCost(densityRaw);

  // Weather is gated behind the live R(t) precipitation
  // flag. Dry: every exit gets S_weather = 1 by definition (non-discriminating).
  // Raining: W_raw(x) = 0.4*Exposure + 0.4*Drainage + 0.2*CrowdAmp(x), where
  // CrowdAmp(x) = density(x) / width(x). Each edge here carries a single
  // surveyed weather rating, used as both Exposure and Drainage.
  let sWeather;
  if (!isRaining) {
    sWeather = feasible.map(() => 1);
  } else {
    const wRaw = feasible.map((id, i) => {
      const edges = specific[id];
      const totalLen = edges.reduce((s, e) => s + e.length, 0);
      const avgWeather = totalLen ? edges.reduce((s, e) => s + e.weather * e.length, 0) / totalLen : 0;
      const crowdAmp = densityRaw[i] / widthRaw[i];
      return 0.8 * avgWeather + 0.2 * crowdAmp;
    });
    sWeather = normalizeCost(wRaw);
  }

  const rows = feasible.map((id, i) => {
    const s = {
      distance: sDistance[i], turns: sTurns[i], obstacle: sObstacle[i],
      tactile: sTactile[i], width: sWidth[i], density: sDensity[i], weather: sWeather[i],
    };
    const score =
      WEIGHTS.distance * s.distance + WEIGHTS.turns * s.turns +
      WEIGHTS.obstacle * s.obstacle + WEIGHTS.tactile * s.tactile +
      WEIGHTS.width * s.width + WEIGHTS.density * s.density +
      WEIGHTS.weather * s.weather;
    return { id, s, score, edges: pathsByExit[id] };
  });
  rows.sort((a, b) => b.score - a.score);

  return {
    feasible, infeasible: EXIT_IDS.filter((e) => !feasible.includes(e)),
    recommended: rows[0], rows,
  };
}

function edgesToSteps(edges, start) {
  const steps = [];
  let cur = start;
  edges.forEach((e) => {
    const next = e.a === cur ? e.b : e.a;
    const nextLabel = NODES[next].label;
    let text;
    if (e.mode === "elevator") {
      text = `Take the accessible elevator${e.turn ? ", turning" : ""} to ${nextLabel}.`;
    } else if (e.mode === "stairs") {
      text = `Continue via the stairs or escalator${e.turn ? ", turning" : ""} to ${nextLabel}.`;
    } else {
      text = `Walk forward about ${e.length} meters${e.turn ? ", turning at the junction," : ""} to ${nextLabel}.`;
    }
    steps.push({ text, node: next });
    cur = next;
  });
  return steps;
}

// ---------------------------------------------------------------------------
// SPEECH
// ---------------------------------------------------------------------------
function useSpeech(enabled, rate) {
  const [speaking, setSpeaking] = useState(false);
  const speak = useCallback(
    (text) => {
      if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = rate;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [enabled, rate]
  );
  return { speak, speaking };
}

// ---------------------------------------------------------------------------
// SHARED UI PIECES
// ---------------------------------------------------------------------------
function BigButton({ children, onClick, variant = "primary", disabled, icon: Icon }) {
  const styles =
    variant === "primary"
      ? { background: COLOR.accent, color: "#1A1300" }
      : variant === "ghost"
      ? { background: "transparent", color: COLOR.text, border: `2px solid ${COLOR.surfaceRaised}` }
      : { background: COLOR.surfaceRaised, color: COLOR.text };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl px-6 py-5 text-xl font-bold flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-40"
      style={styles}
    >
      {Icon && <Icon size={26} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

function TopBar({ title, onSettings, speaking }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full"
          style={{
            width: 14,
            height: 14,
            background: speaking ? COLOR.accent : COLOR.surfaceRaised,
            transition: "background 300ms ease",
            boxShadow: speaking ? `0 0 0 6px ${COLOR.accentDim}55` : "none",
          }}
        />
        <h1 className="text-lg font-bold tracking-wide" style={{ color: COLOR.text }}>
          {title}
        </h1>
      </div>
      {onSettings && (
        <button onClick={onSettings} aria-label="Settings" style={{ color: COLOR.textDim }}>
          <Settings size={24} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SCREENS
// ---------------------------------------------------------------------------
function Onboarding({ profile, setProfile, onDone, speak }) {
  useEffect(() => {
    speak(
      "Welcome. Before we start, I need to know: can you use stairs or escalators, or do you need step-free elevator routes only?"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-col gap-6 px-6 pt-10 pb-8">
      <h2 className="text-3xl font-black leading-tight" style={{ color: COLOR.text }}>
        Let's set up your route preferences
      </h2>
      <p className="text-base" style={{ color: COLOR.textDim }}>
        This only takes a moment and helps pick routes that actually work for you.
      </p>

      <div className="flex flex-col gap-3 mt-2">
        <p className="text-lg font-bold" style={{ color: COLOR.text }}>
          Can you use stairs or escalators?
        </p>
        <BigButton
          variant={profile.stepFreeOnly === false ? "primary" : "secondary"}
          onClick={() => {
            speak("Yes, stairs are fine");
            setProfile((p) => ({ ...p, stepFreeOnly: false }));
          }}
        >
          Yes, stairs are fine
        </BigButton>
        <BigButton
          variant={profile.stepFreeOnly === true ? "primary" : "secondary"}
          onClick={() => {
            speak("No, elevator only");
            setProfile((p) => ({ ...p, stepFreeOnly: true }));
          }}
        >
          No, elevator only
        </BigButton>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <p className="text-lg font-bold" style={{ color: COLOR.text }}>
          Spoken directions
        </p>
        <BigButton
          icon={profile.voice ? Volume2 : VolumeX}
          variant={profile.voice ? "primary" : "secondary"}
          onClick={() =>
            setProfile((p) => {
              const nv = !p.voice;
              speak(nv ? "Voice guidance on" : "Voice guidance off");
              return { ...p, voice: nv };
            })
          }
        >
          {profile.voice ? "Voice guidance on" : "Voice guidance off"}
        </BigButton>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <p className="text-lg font-bold" style={{ color: COLOR.text }}>
          Speech speed
        </p>
        <div className="flex gap-3">
          {[
            { label: "Slow", val: 0.8 },
            { label: "Normal", val: 1 },
            { label: "Fast", val: 1.25 },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => {
                speak(`Speed set to ${r.label}`);
                setProfile((p) => ({ ...p, rate: r.val }));
              }}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{
                background: profile.rate === r.val ? COLOR.accent : COLOR.surfaceRaised,
                color: profile.rate === r.val ? "#1A1300" : COLOR.text,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <BigButton
          onClick={() => {
            speak("Continue");
            onDone();
          }}
          disabled={profile.stepFreeOnly === null}
        >
          Continue
        </BigButton>
      </div>
    </div>
  );
}

function Home({ onEnter, onExit, onSettings, speaking, arrivedSC, speak }) {
  return (
    <div>
      <TopBar title="Station Navigator" onSettings={onSettings} speaking={speaking} />
      <div className="px-6 pt-8 pb-10 flex flex-col gap-5">
        <p className="text-base" style={{ color: COLOR.textDim }}>
          Where are you headed?
        </p>
        <BigButton
          icon={LogIn}
          onClick={() => {
            speak("Entering the station");
            onEnter();
          }}
        >
          Entering the station
        </BigButton>
        <BigButton
          icon={LogOut}
          onClick={() => {
            speak("Exiting the station");
            onExit();
          }}
        >
          Exiting the station
        </BigButton>
        {arrivedSC && (
          <p className="text-sm mt-2" style={{ color: COLOR.textDim }}>
            Last stop: {NODES[arrivedSC].label}
          </p>
        )}
      </div>
    </div>
  );
}

function PickNode({ title, options, onPick, speak }) {
  useEffect(() => {
    speak(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="px-6 pt-8 pb-10 flex flex-col gap-4">
      <h2 className="text-2xl font-black" style={{ color: COLOR.text }}>
        {title}
      </h2>
      {options.map((id) => (
        <BigButton
          key={id}
          icon={MapPin}
          onClick={() => {
            speak(NODES[id].label);
            onPick(id);
          }}
        >
          <span className="flex flex-col items-start text-left">
            <span>{NODES[id].label}</span>
            {NODES[id].detail && (
              <span className="text-sm font-normal" style={{ color: "#1A130099" }}>
                {NODES[id].detail}
              </span>
            )}
          </span>
        </BigButton>
      ))}
    </div>
  );
}

function RainCheck({ onPick, speak }) {
  useEffect(() => {
    speak("Is it currently raining outside the station?");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="px-6 pt-8 pb-10 flex flex-col gap-4">
      <h2 className="text-2xl font-black" style={{ color: COLOR.text }}>
        Is it raining right now?
      </h2>
      <p className="text-sm" style={{ color: COLOR.textDim }}>
        This changes how much weather exposure counts toward your recommended exit.
      </p>
      <BigButton
        onClick={() => {
          speak("Yes, it's raining");
          onPick(true);
        }}
      >
        Yes, it's raining
      </BigButton>
      <BigButton
        variant="secondary"
        onClick={() => {
          speak("No, it's dry");
          onPick(false);
        }}
      >
        No, it's dry
      </BigButton>
    </div>
  );
}

function RouteScreen({ session, onNext, onPrev, onRepeat, onFinish, speaking, speak }) {
  const total = session.steps.length;
  const idx = session.stepIndex;
  const atEnd = idx >= total;

  return (
    <div>
      <TopBar title="Directions" speaking={speaking} />
      <div className="px-6 pb-6">

        {!atEnd ? (
          <>
            <p className="text-sm font-mono tracking-widest mb-2" style={{ color: COLOR.textDim }}>
              STEP {idx + 1} / {total}
            </p>
            <p className="text-3xl font-black leading-snug mb-8" style={{ color: COLOR.text }}>
              {session.steps[idx].text}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <CheckCircle2 size={56} color={COLOR.success} />
            <p className="text-3xl font-black" style={{ color: COLOR.text }}>
              You have arrived.
            </p>
          </div>
        )}

        {!atEnd ? (
          <div className="flex flex-col gap-3">
            <BigButton icon={Volume2} variant="secondary" onClick={onRepeat}>
              Repeat
            </BigButton>
            <div className="flex gap-3">
              <button
                onClick={onPrev}
                disabled={idx === 0}
                className="flex-1 rounded-2xl py-5 flex items-center justify-center disabled:opacity-30"
                style={{ background: COLOR.surfaceRaised, color: COLOR.text }}
                aria-label="Previous step"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={onNext}
                className="flex-1 rounded-2xl py-5 flex items-center justify-center gap-2 font-bold"
                style={{ background: COLOR.accent, color: "#1A1300" }}
              >
                Next <ChevronRight size={24} />
              </button>
            </div>
          </div>
        ) : (
          <BigButton
            onClick={() => {
              speak("Done");
              onFinish();
            }}
          >
            Done
          </BigButton>
        )}
      </div>
    </div>
  );
}

function NoRoute({ onBack, speak }) {
  useEffect(() => {
    speak("No step-free route was found. Please ask station staff for assistance.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="px-6 pt-10 pb-10 flex flex-col items-center text-center gap-5">
      <AlertTriangle size={48} color={COLOR.danger} />
      <p className="text-2xl font-black" style={{ color: COLOR.text }}>
        No step-free route found
      </p>
      <p style={{ color: COLOR.textDim }}>
        Please ask station staff for assistance getting between these points.
      </p>
      <BigButton
        onClick={() => {
          speak("Back to home");
          onBack();
        }}
      >
        Back to home
      </BigButton>
    </div>
  );
}

function SettingsScreen({ profile, setProfile, onBack, speak }) {
  return (
    <div className="px-6 pt-8 pb-10 flex flex-col gap-6">
      <h2 className="text-2xl font-black" style={{ color: COLOR.text }}>
        Settings
      </h2>
      <div className="flex flex-col gap-3">
        <p className="font-bold" style={{ color: COLOR.text }}>
          Stairs / escalators
        </p>
        <BigButton
          variant={profile.stepFreeOnly === false ? "primary" : "secondary"}
          onClick={() => {
            speak("Yes, stairs are fine");
            setProfile((p) => ({ ...p, stepFreeOnly: false }));
          }}
        >
          Yes, stairs are fine
        </BigButton>
        <BigButton
          variant={profile.stepFreeOnly === true ? "primary" : "secondary"}
          onClick={() => {
            speak("No, elevator only");
            setProfile((p) => ({ ...p, stepFreeOnly: true }));
          }}
        >
          No, elevator only
        </BigButton>
      </div>
      <div className="flex flex-col gap-3">
        <p className="font-bold" style={{ color: COLOR.text }}>
          Voice guidance
        </p>
        <BigButton
          icon={profile.voice ? Volume2 : VolumeX}
          variant={profile.voice ? "primary" : "secondary"}
          onClick={() =>
            setProfile((p) => {
              const nv = !p.voice;
              speak(nv ? "Voice guidance on" : "Voice guidance off");
              return { ...p, voice: nv };
            })
          }
        >
          {profile.voice ? "On" : "Off"}
        </BigButton>
      </div>
      <BigButton
        variant="ghost"
        onClick={() => {
          speak("Back");
          onBack();
        }}
      >
        Back
      </BigButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [profile, setProfile] = useState({ stepFreeOnly: null, voice: true, rate: 1 });
  const [arrivedSC, setArrivedSC] = useState(null);
  const [pendingSC, setPendingSC] = useState(null);
  const [session, setSession] = useState({ mode: null, steps: [], stepIndex: 0 });

  const { speak, speaking } = useSpeech(profile.voice, profile.rate);

  function startEntering(exitId) {
    const adj = buildAdjacency(!profile.stepFreeOnly);
    const result = bestReachable(adj, exitId, ["sc1", "sc2"]);
    if (!result) {
      setScreen("noroute");
      return;
    }
    const steps = edgesToSteps(result.edges, exitId);
    setArrivedSC(result.goal);
    setSession({ mode: "entering", steps, stepIndex: 0 });
    setScreen("route");
    speak(steps[0].text);
  }

  function startExiting(fromSC, isRaining) {
    const mcda = runExitMCDA(fromSC, isRaining);
    if (!mcda.recommended) {
      setScreen("noroute");
      return;
    }
    const rec = mcda.recommended;
    const steps = edgesToSteps(rec.edges, fromSC);
    setSession({
      mode: "exiting",
      steps,
      stepIndex: 0,
    });
    setScreen("route");
    speak(steps[0].text);
  }

  function next() {
    setSession((s) => {
      const ns = Math.min(s.stepIndex + 1, s.steps.length);
      if (ns < s.steps.length) speak(s.steps[ns].text);
      else speak("You have arrived.");
      return { ...s, stepIndex: ns };
    });
  }
  function prev() {
    setSession((s) => {
      const ns = Math.max(s.stepIndex - 1, 0);
      speak(s.steps[ns].text);
      return { ...s, stepIndex: ns };
    });
  }
  function repeat() {
    if (session.stepIndex < session.steps.length) speak(session.steps[session.stepIndex].text);
    else speak("You have arrived.");
  }
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <div
        className="w-full rounded-3xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 420, minHeight: 720, background: COLOR.bg }}
      >
        {screen === "onboarding" && (
          <Onboarding
            profile={profile}
            setProfile={setProfile}
            onDone={() => setScreen("home")}
            speak={speak}
          />
        )}

        {screen === "home" && (
          <Home
            onEnter={() => setScreen("pickEntrance")}
            onExit={() => {
              if (arrivedSC) {
                setPendingSC(arrivedSC);
                setScreen("rainCheck");
              } else {
                setScreen("pickSC");
              }
            }}
            onSettings={() => setScreen("settings")}
            speaking={speaking}
            arrivedSC={arrivedSC}
            speak={speak}
          />
        )}

        {screen === "pickEntrance" && (
          <PickNode
            title="Which exit are you entering from?"
            options={["exit_1", "exit_2", "exit_3"]}
            onPick={startEntering}
            speak={speak}
          />
        )}

        {screen === "pickSC" && (
          <PickNode
            title="Which service center are you at?"
            options={["sc1", "sc2"]}
            onPick={(id) => {
              setPendingSC(id);
              setScreen("rainCheck");
            }}
            speak={speak}
          />
        )}

        {screen === "rainCheck" && (
          <RainCheck
            onPick={(isRaining) => startExiting(pendingSC, isRaining)}
            speak={speak}
          />
        )}

        {screen === "route" && (
          <RouteScreen
            session={session}
            onNext={next}
            onPrev={prev}
            onRepeat={repeat}
            onFinish={() => setScreen("home")}
            speaking={speaking}
            speak={speak}
          />
        )}

        {screen === "noroute" && <NoRoute onBack={() => setScreen("home")} speak={speak} />}

        {screen === "settings" && (
          <SettingsScreen
            profile={profile}
            setProfile={setProfile}
            onBack={() => setScreen("home")}
            speak={speak}
          />
        )}
      </div>
    </div>
  );
}
