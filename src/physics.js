// ─────────────────────────────────────────────────────────────────────────────
// Cricket ball flight physics.
//
// Aerodynamic model parameterised from published wind-tunnel and CFD data:
//   • R.D. Mehta, "Aerodynamics of Sports Balls", Annu. Rev. Fluid Mech. 17 (1985)
//   • R.D. Mehta, "An overview of cricket ball swing", Sports Engineering 8 (2005)
//   • J.E. Scobie et al. (Univ. of Bath), swing / reverse-swing wind-tunnel studies
//   • Sayers & Hill, "Aerodynamics of a cricket ball", J. Wind Eng. (1999)
//
// Coordinate frame:  x = down the pitch (bowler → batter), y = up,
//                    z = bowler's right (= LEG side for a right-hand batter).
// Units: SI throughout. Angles in the API are degrees.
// ─────────────────────────────────────────────────────────────────────────────

export const BALL = { mass: 0.156, radius: 0.036 };
BALL.area = Math.PI * BALL.radius * BALL.radius;
BALL.I = 0.4 * BALL.mass * BALL.radius * BALL.radius;

export const PITCH = {
  length: 20.12,          // stumps to stumps (22 yd)
  crease: 1.22,           // popping crease in front of the stumps
  stumpHeight: 0.711,
  stumpHalfWidth: 0.1143, // half of the 22.86 cm wicket width
  stripWidth: 3.05,
};

const G = 9.81;
const sig = (x) => 1 / (1 + Math.exp(-x));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const deg = Math.PI / 180;

// ── vector helpers (plain arrays [x,y,z]) ────────────────────────────────────
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => { const l = len(a) || 1; return scale(a, 1 / l); };

// ── atmosphere ───────────────────────────────────────────────────────────────
// Humid-air density (humid air is *less* dense — water vapour is lighter than
// dry air). Magnus-formula saturation pressure.
export function airDensity({ tempC, humidity, pressureHPa }) {
  const T = tempC + 273.15;
  const p = pressureHPa * 100;
  const es = 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
  const pv = (humidity / 100) * es;
  return (p - pv) / (287.058 * T) + pv / (461.495 * T);
}

// ── ball construction (brand) ────────────────────────────────────────────────
// Dukes: 6 hand-stitched rows, proudest and most durable seam — swings long.
// SG: hand-stitched, broad ridged seam — grips and reverses on dry tracks.
// Kookaburra: only 2 rows stitched through; seam flattens after ~20 overs.
export function brandFactors(p) {
  return {
    dukes:      { seam: 1.12, wearRate: 0.80, seamFlatten: 0.15 },
    sg:         { seam: 1.05, wearRate: 0.85, seamFlatten: 0.20 },
    kookaburra: { seam: 0.92, wearRate: 1.20, seamFlatten: 0.45 },
  }[p.brand] ?? { seam: 1, wearRate: 1, seamFlatten: 0.2 };
}

// ── ball surface state ───────────────────────────────────────────────────────
// wear grows with overs; the polished side keeps a much lower effective
// roughness when the fielding side maintains the shine.
export function ballSurface(p) {
  const typeWear = { red: 1.0, white: 1.18, pink: 0.85 }[p.ballType] ?? 1;
  const wear = clamp((p.ageOvers * typeWear * brandFactors(p).wearRate) / 50, 0, 1);
  const roughShiny = wear * (1 - 0.82 * p.shine);
  const roughRough = clamp(wear * 1.15, 0, 1);
  return { wear, roughShiny, roughRough };
}

// Free-stream speed (m/s) at which a given surface finish trips its own
// boundary layer turbulent (no seam needed). Pristine ball ≈ 40 m/s; a badly
// scuffed surface drops this to ~26 m/s — this is what enables reverse swing
// at realistic bowling speeds with an old ball.
const transitionSpeed = (rough) => 40 - 14 * rough;

// Side-force efficiency vs seam angle. Wind-tunnel data peaks around 20°,
// stays broad to ~35°, and dies off as the seam swings past the separation
// point. (Mehta 2005, fig. data.)
function seamAngleFactor(thetaDeg) {
  const t = Math.abs(thetaDeg);
  if (t <= 20) return Math.sin((t / 20) * Math.PI * 0.5);
  if (t <= 35) return 1;
  if (t >= 75) return 0;
  return Math.cos(((t - 35) / 40) * Math.PI * 0.5);
}

// ── swing model ──────────────────────────────────────────────────────────────
// Returns a function Cs(speed) giving the signed lateral force coefficient
// (positive = toward +z, the bowler's right).
//
// Three mechanisms, all functions of which side's boundary layer is laminar
// vs turbulent at separation:
//   conventional — seam trips the seam side turbulent; ball swings TOWARD
//                  the seam while the non-seam side stays laminar.
//   reverse      — above the non-seam side's own transition speed both sides
//                  are turbulent; the seam now thickens/weakens its side's
//                  layer so it separates EARLIER → swing AWAY from the seam.
//   contrast     — with no effective seam angle, a rough-vs-shiny asymmetry
//                  alone produces swing (toward the rough side at moderate
//                  speed, toward the shiny side once both sides are tripped).
export function makeSwingModel(p, rng) {
  const surf = ballSurface(p);
  const seamSign = p.seamAngleDeg === 0 ? 1 : Math.sign(p.seamAngleDeg);
  const shinyZ = p.shinySideLeg ? 1 : -1; // z-sign of the polished half

  const roughSeamSide = shinyZ === seamSign ? surf.roughShiny : surf.roughRough;
  const roughNonSeam = shinyZ === seamSign ? surf.roughRough : surf.roughShiny;

  // Wobble destabilises the presented seam: weaker, less repeatable swing.
  const brand = brandFactors(p);
  const jitter = 1 - p.wobble * (0.35 + 0.45 * rng());
  // a seam ring spinning at wrist-spin rates is a weaker, intermittent
  // boundary-layer trip than the gyroscopically-held seam of a pace bowler
  const spinnerSeam = p.spinPreset !== 'seam (backspin)' && p.spinRpm > 1200 ? 0.55 : 1;
  const f = seamAngleFactor(p.seamAngleDeg) * (1 - 0.55 * p.wobble) * jitter *
    brand.seam * (1 - brand.seamFlatten * surf.wear) * spinnerSeam;

  // New-ball conventional swing dies above ~36 m/s (≈130 kph); wear on the
  // non-seam side kills it sooner. Reverse arrives at ~43 m/s (155 kph) for a
  // pristine ball but ~34 m/s (122 kph) once the ball is properly rough.
  const vConv = 36 - 9 * roughNonSeam;
  const vRev = 43 - 8.5 * (roughSeamSide + roughNonSeam) * 0.5;

  // Cloud-cover "assist". Direct humidity effects measure as negligible in
  // the tunnel (Mehta 2005); the knob is provided because conditions matter
  // empirically on the field — set cloudAssist to 0 for strict tunnel physics.
  const assist = 1 + p.cloud * p.cloudAssist;

  const newBoost = { red: 1.0, white: 1.07, pink: 1.03 }[p.ballType] ?? 1;
  const vTshiny = transitionSpeed(surf.roughShiny);
  const vTrough = transitionSpeed(surf.roughRough);
  const dRough = surf.roughRough - surf.roughShiny;
  const towardRough = -shinyZ;

  return (s) => {
    const trip = sig((s - 12) / 2);                       // seam needs pace to trip the layer
    const conv = 0.32 * newBoost * f * trip * sig((vConv - s) / 2.5);
    const rev = -(0.20 + 0.12 * surf.roughRough) * f * sig((s - vRev) / 2.5);
    const contrast =
      dRough * towardRough *
      (0.13 * sig((s - vTrough) / 2.5) * sig((vTshiny - s) / 2.5) -
        0.09 * sig((s - vTshiny) / 2.5));
    return assist * (seamSign * (conv + rev) + contrast * (1 - 0.5 * Math.abs(f)));
  };
}

// ── drag ─────────────────────────────────────────────────────────────────────
// Sub-critical Cd ≈ 0.5 collapsing to ≈ 0.29 through the drag crisis; the
// seam and surface wear pull the critical speed down. (Sayers & Hill 1999.)
function makeDragModel(p) {
  const surf = ballSurface(p);
  const seamPresented = seamAngleFactor(p.seamAngleDeg);
  const vCrit = 38 - 9 * surf.wear - 3 * seamPresented;
  return (s) => 0.5 - 0.21 * sig((s - vCrit) / 3.5) + 0.035 * seamPresented;
}

// Magnus lift coefficient vs spin parameter S = rω/v, saturating like
// measured sphere data.
const magnusCl = (S) => 0.45 * S / (S + 0.18);

// ── pitch interaction ────────────────────────────────────────────────────────
// Impulse-based bounce of a spinning sphere: normal restitution from pitch
// hardness, tangential friction impulse with stick/slip switching (the 2/7
// rule for a uniform sphere), plus stochastic seam/crack deviation.
export function bounceBall(v, om, p, rng) {
  const e0 = 0.32 + 0.42 * p.hardness;
  const grip = clamp(0.25 + 0.62 * p.dryness - 0.38 * p.grass, 0.05, 0.95);
  const mu = 0.12 + 0.55 * grip;
  const r = BALL.radius;

  // variable bounce: green seamers and day-5 dustbowls both misbehave
  const eJit = 1 + (rng() - 0.5) * (0.10 * p.grass + 0.16 * p.dryness);
  const vn = v[1]; // negative on the way in
  // restitution falls with impact speed (plastic deformation of ball & soil);
  // drop-test COR overstates match-speed bounce (Carré & Haake).
  const eVel = 1 - 0.012 * Math.max(0, -vn - 4);
  const e = clamp(e0 * eJit * eVel, 0.1, 0.85);
  const Jn = (1 + e) * Math.abs(vn);

  // slip of the contact point (translation + spin)
  const sx = v[0] + r * om[2];
  const sz = v[2] - r * om[0];
  const slip = Math.hypot(sx, sz) || 1e-9;

  let jx, jz;
  if (mu * Jn >= (2 / 7) * slip) {        // grips: slip fully arrested
    jx = -(2 / 7) * sx;
    jz = -(2 / 7) * sz;
  } else {                                // slides throughout contact
    jx = (-mu * Jn * sx) / slip;
    jz = (-mu * Jn * sz) / slip;
  }

  // seam-on-pitch kick: landing on the proud seam deviates the ball, most of
  // all on a grassy, hard surface; cracks on a worn pitch do the same.
  let kick = 0;
  const seamUp = 1 - clamp(Math.abs(p.seamAngleDeg) / 45, 0, 1) * 0.4;
  if (rng() < 0.55) {
    const seamProud = brandFactors(p).seam;
    const mag = (0.55 * p.grass * (0.4 + 0.6 * p.hardness) * seamUp + 0.45 * p.dryness) * seamProud;
    kick = (rng() * 2 - 1) * mag;
  }

  const vOut = [v[0] + jx, -e * vn, v[2] + jz + kick];
  const omOut = [
    (om[0] - (5 / (2 * r)) * jz) * 0.78,
    om[1] * 0.78,
    (om[2] + (5 / (2 * r)) * jx) * 0.78,
  ];
  return { vOut, omOut, kick, e, mu, gripped: mu * Jn >= (2 / 7) * slip };
}

// ── spin presets ─────────────────────────────────────────────────────────────
// Axis conventions give physically-correct drift, dip and turn for a
// right-arm bowler to a right-hand batter:
//   leg-break: drifts INTO the batter in the air, turns away (leg → off)
//   off-break: turns into the batter; topspinner dips and bounces.
export function spinAxis(p) {
  const rad = (p.spinRpm * 2 * Math.PI) / 60;
  switch (p.spinPreset) {
    case 'seam (backspin)': {
      // backspin about the seam-plane normal keeps the seam rock-steady
      const th = p.seamAngleDeg * deg;
      return scale([-Math.sin(th), 0, Math.cos(th)], rad);
    }
    case 'leg-break':  return scale(norm([-0.92, 0.05, -0.39]), rad);
    case 'off-break':  return scale(norm([0.92, 0.05, -0.39]), rad);
    case 'top-spinner': return scale([0, 0, -1], rad);
    case 'googly':     return scale(norm([0.5, 0.05, -0.87]), rad);
    case 'flipper / back-spin': return scale([0, 0, 1], rad);
    case 'arm ball / drifter': return scale(norm([-0.2, 0.1, 0.97]), rad);
    default: { // custom
      const az = p.spinAzimuthDeg * deg, el = p.spinElevationDeg * deg;
      return scale(
        [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)],
        rad,
      );
    }
  }
}

// ── the simulation ───────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function derive(pos, vel, om, ctx) {
  const vr = sub(vel, ctx.wind);
  const s = len(vr);
  const q = 0.5 * ctx.rho * BALL.area * s * s;
  const vhat = scale(vr, 1 / s);

  let F = scale(vhat, -q * ctx.Cd(s));                  // drag

  const w = len(om);
  if (w > 1) {                                          // Magnus (drift + dip)
    const Cl = magnusCl((BALL.radius * w) / s);
    F = add(F, scale(norm(cross(om, vr)), q * Cl));
  }

  const lat = norm(cross(vhat, [0, 1, 0]));             // horizontal, +z-ward
  F = add(F, scale(lat, q * ctx.Cs(s)));                // swing

  return [F[0] / BALL.mass, F[1] / BALL.mass - G, F[2] / BALL.mass];
}

function integrate(p0, v0, om0, ctx, opts = {}) {
  const dt = 0.002;
  const r = BALL.radius;
  let pos = [...p0], vel = [...v0], om = [...om0], t = 0;
  const samples = [{ t, p: [...pos] }];
  const segments = [{ t0: 0, omega: [...om] }];
  const out = { samples, segments, bounces: [], stumpHit: null, passStumps: null, atBatsman: null };

  for (let i = 0; i < 2500; i++) {
    // RK4
    const k1v = derive(pos, vel, om, ctx);
    const k1p = vel;
    const v2 = add(vel, scale(k1v, dt / 2));
    const k2v = derive(add(pos, scale(k1p, dt / 2)), v2, om, ctx);
    const k2p = v2;
    const v3 = add(vel, scale(k2v, dt / 2));
    const k3v = derive(add(pos, scale(k2p, dt / 2)), v3, om, ctx);
    const k3p = v3;
    const v4 = add(vel, scale(k3v, dt));
    const k4v = derive(add(pos, scale(k3p, dt)), v4, om, ctx);
    const k4p = v4;

    const npos = add(pos, scale(add(add(k1p, scale(add(k2p, k3p), 2)), k4p), dt / 6));
    const nvel = add(vel, scale(add(add(k1v, scale(add(k2v, k3v), 2)), k4v), dt / 6));

    // stump plane crossing
    if (!opts.noStumps && pos[0] < PITCH.length && npos[0] >= PITCH.length) {
      const f = (PITCH.length - pos[0]) / (npos[0] - pos[0]);
      const hit = [
        PITCH.length,
        pos[1] + f * (npos[1] - pos[1]),
        pos[2] + f * (npos[2] - pos[2]),
      ];
      out.passStumps = { y: hit[1], z: hit[2], speed: len(nvel), t: t + f * dt };
      if (hit[1] < PITCH.stumpHeight + r && Math.abs(hit[2]) < PITCH.stumpHalfWidth + r) {
        out.stumpHit = { p: hit, t: t + f * dt, speed: len(nvel) };
        samples.push({ t: t + f * dt, p: hit });
        break;
      }
    }
    // batter reference plane (popping crease)
    if (!out.atBatsman && pos[0] < PITCH.length - PITCH.crease && npos[0] >= PITCH.length - PITCH.crease) {
      out.atBatsman = { y: npos[1], z: npos[2], speed: len(nvel), t };
    }

    // bounce
    if (npos[1] <= r && nvel[1] < 0) {
      const f = (pos[1] - r) / (pos[1] - npos[1]);
      const cp = add(pos, scale(sub(npos, pos), clamp(f, 0, 1)));
      cp[1] = r;
      t += dt * clamp(f, 0, 1);
      samples.push({ t, p: [...cp] });
      const b = bounceBall(nvel, om, ctx.pitchParams, ctx.rng);
      out.bounces.push({ t, x: cp[0], z: cp[2], vIn: [...nvel], vOut: [...b.vOut], kick: b.kick, gripped: b.gripped });
      pos = cp;
      vel = b.vOut;
      om = b.omOut;
      segments.push({ t0: t, omega: [...om] });
      if (out.bounces.length > 4) break;
      continue;
    }

    pos = npos; vel = nvel; t += dt;
    samples.push({ t, p: [...pos] });
    if (pos[0] > PITCH.length + 2 || t > 3.5 || pos[1] > 12) break;
  }
  return out;
}

// shooting solve: find release elevation & azimuth that land the ball on the
// requested length/line, with the full aero model in the loop.
function solveAim(ctx, p0, speed, targetX, targetZ, om) {
  const launch = (a, ps) => {
    const v0 = [
      speed * Math.cos(a) * Math.cos(ps),
      speed * Math.sin(a),
      speed * Math.cos(a) * Math.sin(ps),
    ];
    const r = integrate(p0, v0, om, { ...ctx, rng: makeRng(7) }, { noStumps: true });
    const b = r.bounces[0];
    if (b) return [b.x, b.z];
    const last = r.samples[r.samples.length - 1].p;
    return [last[0] + 6, last[2]]; // never pitched: report long
  };

  const tof = (targetX - p0[0]) / speed;
  let a = Math.asin(clamp((BALL.radius - p0[1] + 4.9 * tof * tof) / (speed * tof), -0.5, 0.3));
  let ps = Math.atan2(targetZ - p0[2], targetX - p0[0]);
  const h = 0.0025;

  for (let it = 0; it < 9; it++) {
    const [bx, bz] = launch(a, ps);
    const ex = bx - targetX, ez = bz - targetZ;
    if (Math.abs(ex) < 0.03 && Math.abs(ez) < 0.015) break;
    const [bxa, bza] = launch(a + h, ps);
    const [bxp, bzp] = launch(a, ps + h);
    const j11 = (bxa - bx) / h, j12 = (bxp - bx) / h;
    const j21 = (bza - bz) / h, j22 = (bzp - bz) / h;
    const det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-9) break;
    a -= (j22 * ex - j12 * ez) / det;
    ps -= (-j21 * ex + j11 * ez) / det;
    a = clamp(a, -0.45, 0.35);
  }
  return { elevation: a, azimuth: ps };
}

const lengthClass = (m) =>
  m < 0.4 ? 'in the blockhole' :
  m < 2 ? 'yorker' :
  m < 5 ? 'full' :
  m < 7 ? 'good length' :
  m < 9 ? 'back of a length' : 'short';

// ── public entry point ───────────────────────────────────────────────────────
export function runDelivery(p) {
  const rng = makeRng((p.seed = (p.seed ?? 0) + 1) * 2654435761);
  const rho = airDensity(p);
  const windS = p.windKph / 3.6;
  const wd = p.windDirDeg * deg;

  const ctx = {
    rho,
    wind: [windS * Math.cos(wd), 0, windS * Math.sin(wd)],
    Cs: makeSwingModel(p, rng),
    Cd: makeDragModel(p),
    pitchParams: p,
    rng,
  };

  const releaseH = 1.22 * p.bowlerHeight + p.releaseExtra;
  const p0 = [PITCH.crease + 0.1, releaseH, p.releaseZ];
  const speed = p.speedKph / 3.6;
  const om = p.spinRpm > 0 ? spinAxis(p) : [0, 0, 0];

  let elevation, azimuth;
  if (p.aimMode === 'target (length & line)') {
    const tx = PITCH.length - p.lengthM;
    ({ elevation, azimuth } = solveAim(ctx, p0, speed, tx, p.lineM, om));
  } else {
    elevation = p.elevationDeg * deg;
    azimuth = p.azimuthDeg * deg;
  }

  const v0 = [
    speed * Math.cos(elevation) * Math.cos(azimuth),
    speed * Math.sin(elevation),
    speed * Math.cos(elevation) * Math.sin(azimuth),
  ];

  const res = integrate(p0, v0, om, ctx);

  // ── metrics ──
  const m = {};
  m.releaseKph = p.speedKph;
  m.releaseH = releaseH;
  const b = res.bounces[0];
  if (b) {
    // lateral movement in the air vs the launch line
    m.swingCm = (b.z - (p0[2] + (v0[2] / v0[0]) * (b.x - p0[0]))) * 100;
    m.bounceLenM = PITCH.length - b.x;
    m.lengthLabel = lengthClass(m.bounceLenM);
    m.kphAtBounce = len(b.vIn) * 3.6;
    // deviation off the pitch (horizontal direction change through the bounce)
    const aIn = Math.atan2(b.vIn[2], b.vIn[0]);
    const aOut = Math.atan2(b.vOut[2], b.vOut[0]);
    m.turnDeg = (aOut - aIn) / deg;
    m.kickCm = b.kick * 100;
    m.gripped = b.gripped;
    m.paceOffPitch = (Math.hypot(b.vOut[0], b.vOut[2]) / Math.hypot(b.vIn[0], b.vIn[2])) * 100;
  } else {
    m.lengthLabel = 'FULL TOSS';
  }
  if (res.atBatsman) {
    m.kphAtBatsman = res.atBatsman.speed * 3.6;
    m.heightAtBatsman = res.atBatsman.y;
  }
  if (res.passStumps) {
    m.heightAtStumps = res.passStumps.y;
    m.lineAtStumps = res.passStumps.z;
  }
  m.hitStumps = !!res.stumpHit;
  m.rho = rho;
  m.movementDir = (v) => (v > 0 ? (p.batterRH ? 'into RH bat (leg)' : 'away from LH bat') : (p.batterRH ? 'away from RH bat (off)' : 'into LH bat'));

  return { ...res, metrics: m, release: { p0, v0, elevation, azimuth }, omega0: om };
}
