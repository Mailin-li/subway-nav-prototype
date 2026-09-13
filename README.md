# Accessible Subway Navigation Prototype — Beiyangjing Road Station

Code appendix for *Graph-Based Routing and Multi-Criteria Exit Selection for
Visually Impaired Subway Passengers* (Li, P.).

This is a single-file React prototype (`App.jsx`) implementing the two
navigation scenarios described in the paper:

- **Entering the station** — a shortest-path search (BFS reachability, then
  Dijkstra for distance) from a chosen gate to whichever customer service
  center the rider's accessibility profile can reach.
- **Exiting the station** — the two-stage multi-criteria decision analysis
  (MCDA) exit-selection model: a mandatory elevator-accessibility filter,
  followed by a seven-criterion weighted score (distance, obstacles, tactile
  paving, corridor width, turns, weather exposure, pedestrian density) using
  the Literature-Informed Composite Weighting / Participant-Informed Weight
  Calibration weights reported in the paper.

## Running it

This is a complete Vite + React + Tailwind project.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`).
To produce a static, deployable build:

```bash
npm run build
npm run preview   # serve the production build locally to double check it
```

## Project structure

```
subway-nav-prototype/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx      # React entry point
    ├── App.jsx       # all app logic and UI — the file described below
    └── index.css     # Tailwind directives
```

## Architecture overview

| In the code | What it does |
|---|---|
| `NODES`, `EDGES` | The station graph model — nodes, plus edges with their travel mode, length, and turn flag |
| `buildAdjacency`, `shortestPath`, `bestReachable` | Reachability and shortest-path routing (BFS reachability, then Dijkstra for distance) |
| `runExitMCDA`, `specificEdgesFor` | Two-stage exit selection: a hard accessibility filter, then weighted scoring |
| `WEIGHTS` | Final, participant-calibrated criterion weights |
| `normalizeCost` / `normalizeBenefit` | Min-max normalization for cost vs. benefit criteria |
| weather branch inside `runExitMCDA` | The R(t) conditional weather criterion (gated by the rain toggle) |
| edge-level `obstacle` values | Reconciled two-rater obstacle scores from the photographic survey |

Running the model for the paper's worked example (start at SC1, dry
weather) reproduces the paper's reported composite scores to three decimal
places (Exit 1 ≈ 0.626, Exit 2 ≈ 0.144, Exit 3 ≈ 0.693).

## Known limitations of this prototype

These are implementation gaps in the demo, not claims about the underlying
model — each is discussed as a direction for future work in the paper,
but isn't built into this code yet.

- **No RFID/BLE checkpoint positioning.** The paper proposes a
  checkpoint-based architecture where BLE beacons or RFID tags at each graph
  node (junctions, elevator landings, service centers, exits) generate
  "near node X" events automatically, so the app always knows where the
  rider is without asking. This prototype has no such sensing layer, so it
  substitutes two manual stand-ins: the rider is asked which gate or service
  center they're starting from, and progress through turn-by-turn directions
  advances by a manual "Next" tap rather than an automatic checkpoint
  detection. A production version would remove both prompts once node-level
  positioning is implemented.
- **Weather is asked, not sensed.** The MCDA weather criterion is gated
  behind a live precipitation flag, which in production would be read from
  a weather API. This prototype instead asks the rider "Is it raining right
  now?" as a manual yes/no screen. Given internet access, this could be
  automated.
- **Pedestrian density is a static baseline, not time-aware.** The paper
  notes that density ideally reflects real-time crowding, and that time of
  day is a reasonable proxy where a live feed isn't available. This
  prototype uses one fixed baseline density value per exit regardless of
  when the rider is traveling. A production version could use the device
  clock to bias the baseline toward rush-hour vs. off-peak levels, or pull
  from a live station monitoring feed if one exists.
- **Only one station is modeled.** The graph, obstacle ratings, tactile
  paving data, and all other exit attributes cover Beiyangjing Road Station
  only, matching the paper's single-station case study scope. The paper also
  proposes a crowdsourced Exit Documentation App to collect this same data
  at other stations; none of that collection or storage pipeline is
  implemented here. Extending this prototype to a second station currently
  means hand-authoring a new `NODES`/`EDGES` block in the same shape.

## Citation

If referencing this code, cite the paper and link to this repository, e.g.:

> Li, P. (2026). *Graph-Based Routing and Multi-Criteria Exit Selection for
> Visually Impaired Subway Passengers.* Code available at the GitHub
> repository accompanying this manuscript.
