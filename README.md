# 🏏 Swing Lab — a physics-true cricket bowling simulator

A hyperrealistic, fully-configurable simulation of a cricket delivery: conventional
swing, reverse swing, contrast swing, Magnus drift & dip, the drag crisis, wind,
weather, ball wear, seam presentation, and a stick/slip spinning-ball bounce model —
rendered in 3D with hawk-eye style ball tracking and statically posed, hyper-real
batsman, wicketkeeper, bowler and umpires.

**▶ Live demo: https://swing-lab-ruby.vercel.app**

## Run it

```bash
npm start          # or: python3 -m http.server 8077
# open http://localhost:8077
```

No build step. Three.js and lil-gui load from CDN (needs internet on first load).
**Space** = bowl · **R** = replay · drag to orbit, scroll to zoom.

## The physics

Everything below acts on the ball every integration step (RK4, dt = 2 ms),
all forces computed from air-relative velocity so wind affects swing, not just drift.

### Conventional swing
The angled seam trips the boundary layer turbulent on the seam side; the layer on
the polished side stays laminar and separates earlier → pressure asymmetry pushes
the ball **toward the seam**. Modelled with a side-force coefficient peaking at
Cs ≈ 0.32 around a 20° seam angle (broad plateau to 35°), active once the ball is
quick enough to trip the layer (~45 kph) and collapsing above the non-seam side's
transition speed (~130 kph for a pristine ball — this is why express pace doesn't
conventionally swing a new ball).

### Reverse swing
Above the transition speed both sides are turbulent before separation; the seam now
*thickens* its side's layer so it separates **earlier** — the force flips away from
the seam. Surface roughness (ball age, unpolished side) pulls the transition speed
down from ~155 kph (new ball — only the genuinely fast reverse it) to ~120 kph for
a 45-over-old ball. Try the same outswinger at 135 and 155 kph and watch it flip.

### Contrast swing
With the seam scrambled or at 0°, a rough-side/shiny-side asymmetry alone produces
swing: toward the rough side at moderate pace, toward the shiny side once both
layers are tripped.

### Drift and dip (Magnus)
Spin produces a force along ω × v with lift coefficient Cl = 0.45·S/(S+0.18) for
spin parameter S = rω/v (matches measured sphere data: Cl ≈ 0.27 at S = 0.3).
A leg-break therefore drifts *into* a right-hander late in flight (the Magnus
component grows as the ball descends) and the topspin component dips it — the
full Warne-to-Gatting geometry emerges from the model rather than being scripted.

### Drag
Cd ≈ 0.50 sub-critical, collapsing to ≈ 0.29 through the drag crisis, with the
critical speed pulled down by wear and seam presentation. Air density comes from
temperature, pressure and humidity (humid air is *less* dense — the model is honest
about the humidity myth; see below).

### The bounce
Impulse-based bounce of a spinning sphere: velocity-dependent normal restitution
(hardness-driven, derated at match impact speeds per Carré & Haake), tangential
friction with the 2/7 stick-slip rule for a uniform sphere — so a big-revs
leg-break on a dry pitch *grips* and rips, while the same ball on a green top
*skids*. Spin is consumed/transferred by the bounce. Stochastic seam-kick models
landing on the proud seam (worst on a hard green top) and crack variability on a
worn day-5 surface.

### The atmosphere knob, honestly
Wind-tunnel studies (Bentley et al. 1982; Sherwin & Sproston 1982) find **no direct
humidity effect** on side force, and humid air is marginally *less* dense. The real
atmospheric lever is density: temperature, pressure, altitude (set 835 hPa for
Johannesburg and watch swing drop ~20%). Because cloudy-day swing is nonetheless an
empirical regularity, a `cloud swing assist` factor exists — default modest (0.15),
set it to 0 for strict tunnel physics.

## Every parameter

| Group | Parameters |
|---|---|
| Delivery | speed, aim by length & line (a shooting solver finds release angles through the full aero model) or manual release angles |
| Bowler | height (release ≈ 1.22×height), jump, crease position (over/around the wicket), batter handedness |
| Ball | red/white/pink · Dukes/Kookaburra/SG (seam prominence, wear rate, seam-flattening) · age in overs · shine maintained · shiny side · seam angle · wobble |
| Spin | grip presets (seam backspin, leg-break, off-break, top-spinner, googly, flipper, arm-ball) or a fully custom axis + rpm up to 3200 |
| Conditions | temperature, humidity, pressure, cloud cover, cloud assist, wind speed & direction |
| Pitch | grass cover, hardness, wear/dryness |
| Playback | slow-mo, 7 cameras incl. follow-ball, overlay of previous deliveries for hawk-eye comparison |

## Calibration targets (literature)

| Quantity | Literature | Simulation |
|---|---|---|
| Peak side force | ~30–40% of ball weight, Cs ≈ 0.3 (Mehta) | Cs,max = 0.32 |
| Optimal seam angle | ~20° (Bentley et al. 1982) | 20° (plateau to 35°) |
| Max lateral swing | 0.3–0.5 m match, 0.8 m ceiling (Mehta 2005) | ~0.2–0.45 m typical |
| Magnus Cl at S=0.3 | ≈ 0.27 (Nathan 2008; Sawicki et al. 2003) | 0.28 |
| Wrist-spin turn | 4–9° on turners (Hawk-Eye/CricViz) | ~8° on a dustbowl |
| Seam movement | 0.4–0.7° average, >1° big | 0–1.5° stochastic |
| Pace off pitch | 55–85% horizontal retention | ~75–85% |

## References

- R.D. Mehta, *Aerodynamics of Sports Balls*, Annu. Rev. Fluid Mech. 17:151–189 (1985)
- R.D. Mehta, *An overview of cricket ball swing*, Sports Engineering 8:181–192 (2005)
- Bentley, Varty, Proudlove & Mehta, Imperial College aero report (1982) — seam angle & backspin stabilisation
- Sayers & Hill, *Aerodynamics of a cricket ball*, J. Wind Eng. Ind. Aerodyn. (1999) — drag
- J.E. Scobie et al. (Univ. of Bath) — reverse swing wind-tunnel studies
- Sawicki, Hubbard & Stronge, Am. J. Phys. 71:1152 (2003); A. Nathan, Am. J. Phys. 76:119 (2008) — Magnus lift curves
- Carré, Baker, Newell & Haake, *The dynamic behaviour of cricket balls during impact*, Sports Engineering 2:145–160 (1999) — pitch restitution & friction
- Sherwin & Sproston (1982); Bown & Mehta (1993) — the humidity null result
- MCC Laws of Cricket, Law 4 — ball mass 155.9–163 g, circumference 22.4–22.9 cm

*Coefficient values are parameterised from these sources as compiled from domain
knowledge (web verification was unavailable at build time); the cross-checks in the
calibration table are the ground truth the model was tuned against.*

## License

[MIT](LICENSE) — free to use, modify and distribute. Built with
[Three.js](https://threejs.org) and [lil-gui](https://lil-gui.georgealways.com).
