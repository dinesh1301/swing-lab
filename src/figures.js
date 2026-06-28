// Procedural, statically-posed cricket figures built entirely from Three.js
// primitives — no external model assets, in keeping with the project's
// no-build / CDN-only ethos. Each builder returns a Group standing on y = 0,
// centred on the origin in x/z, FACING +x (looking "down the pitch"). The
// caller positions the group and sets rotation.y to aim it.
//
// Anatomy is proportioned to a ~1.8 m human (≈7.5 head-heights). Limbs are
// nested joint groups so bends at the knee/elbow read naturally. Everything
// casts shadows; nothing animates.

import * as THREE from 'three';

// ── shared material palette (built once, shared across every figure) ─────────
export function figurePalette() {
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, ...o });
  return {
    skin:      M(0xb07a52, { roughness: 0.72 }),
    skinDark:  M(0x6f4a30, { roughness: 0.72 }),
    hair:      M(0x1c140d, { roughness: 0.85 }),
    whites:    M(0xf1efe6, { roughness: 0.82 }),
    whitesSh:  M(0xdedacb, { roughness: 0.85 }),       // shaded fabric / shadowed folds
    pad:       M(0xf6f5ee, { roughness: 0.5 }),         // PU batting pad face
    padRoll:   M(0xeceadf, { roughness: 0.45 }),
    strap:     M(0x2b2b2b, { roughness: 0.6 }),
    glove:     M(0xf3f2ea, { roughness: 0.55 }),
    gloveTrim: M(0x1f7a4d, { roughness: 0.6 }),
    boot:      M(0xf4f4f2, { roughness: 0.5 }),
    bootSole:  M(0x222428, { roughness: 0.7 }),
    willow:    M(0xe7d6a6, { roughness: 0.66 }),
    willowEdge:M(0xcdb87f, { roughness: 0.66 }),
    rubber:    M(0x141414, { roughness: 0.8 }),
    leatherR:  M(0x9c241b, { roughness: 0.35, metalness: 0.04 }), // red ball
    grille:    M(0x9aa1a8, { metalness: 0.85, roughness: 0.35 }),
    coat:      M(0xeae5d6, { roughness: 0.7 }),          // umpire coat (cream)
    trouser:   M(0x2c2f36, { roughness: 0.7 }),          // umpire trousers
    hat:       M(0xf3f1e8, { roughness: 0.7 }),          // umpire wide-brim
    shade:     M(0x14181f, { roughness: 0.4, metalness: 0.1 }), // sunglasses
  };
}

// teamable jersey/cap materials so each role can carry a colour identity
const fabric = (color, rough = 0.82) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough });

// ── low-level builders ───────────────────────────────────────────────────────

// A tapered limb segment whose pivot is its TOP (hangs down -y), so a joint
// group can rotate it about the shoulder/hip/elbow/knee.
function bone(len, rTop, rBot, mat, seg = 12) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function ball(r, mat, wd = 12, ht = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, wd, ht), mat);
  m.castShadow = true;
  return m;
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

// Two-segment limb (thigh+shin or upperarm+forearm). Returns the root group
// (place at hip/shoulder) and the lower group (attach foot/hand at its tip).
function limb({ upperLen, lowerLen, rTop, rMid, rBot, mat, jointR, rootEuler, jointEuler }) {
  const root = new THREE.Group();
  root.rotation.set(...(rootEuler || [0, 0, 0]));
  root.add(bone(upperLen, rTop, rMid, mat));

  const knuckle = ball(jointR ?? rMid * 1.02, mat, 10, 10);
  knuckle.position.y = -upperLen;
  root.add(knuckle);

  const lower = new THREE.Group();
  lower.position.y = -upperLen;
  lower.rotation.set(...(jointEuler || [0, 0, 0]));
  lower.add(bone(lowerLen, rMid, rBot, mat));
  root.add(lower);

  return { root, lower, tipY: -lowerLen };
}

// A shoe/boot: rounded toe + body + sole, pointing +x.
function bootMesh(p, sole = p.bootSole) {
  const g = new THREE.Group();
  const body = box(0.135, 0.062, 0.10, p.boot);
  body.position.set(0.012, 0.031, 0);
  const toe = ball(0.05, p.boot, 12, 10);
  toe.scale.set(1.1, 0.62, 0.95);
  toe.position.set(0.085, 0.03, 0);
  const heel = ball(0.045, p.boot, 10, 8);
  heel.position.set(-0.05, 0.035, 0);
  const soleM = box(0.16, 0.018, 0.105, sole);
  soleM.position.set(0.012, 0.009, 0);
  g.add(body, toe, heel, soleM);
  return g;
}

// A human head facing +x: cranium, jaw, nose, ears, brow, with optional hair.
function head(p, { skin = p.skin, withHair = true } = {}) {
  const g = new THREE.Group();
  const cran = ball(0.105, skin, 20, 18);
  cran.scale.set(1.02, 1.16, 0.94);     // taller & a touch deep
  g.add(cran);
  const jaw = ball(0.082, skin, 16, 14);
  jaw.scale.set(0.96, 0.8, 0.9);
  jaw.position.set(0.012, -0.06, 0);
  g.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 8), skin);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.1, -0.018, 0);
  nose.castShadow = true;
  g.add(nose);
  const brow = box(0.12, 0.022, 0.13, skin);
  brow.position.set(0.066, 0.03, 0);
  g.add(brow);
  for (const dz of [-1, 1]) {
    const ear = ball(0.028, skin, 8, 8);
    ear.scale.set(0.5, 1, 0.7);
    ear.position.set(-0.01, -0.01, dz * 0.1);
    g.add(ear);
  }
  if (withHair) {
    const hair = ball(0.112, p.hair, 18, 16);
    hair.scale.set(1.04, 1.08, 1.0);
    hair.position.set(-0.022, 0.026, 0);
    // clip the front so the face shows: a thin box "cut" isn't possible, so
    // just offset back & up — reads as a hairline.
    g.add(hair);
  }
  return g;
}

// ── the body core ────────────────────────────────────────────────────────────
// Builds torso + pelvis + neck + head + two arms + two legs from a pose spec.
// Returns { group, refs } where refs exposes joints/segments for attaching kit.
//
// pose fields (all optional, sensible defaults):
//   hipY          pelvis centre height (lower it to crouch)
//   spineLean     forward lean of the whole upper body (rad; + = forward)
//   torsoTwist    twist of shoulders about y (side-on stance)
//   stanceZ       half-distance between feet (left/right)
//   stanceX       fore/aft stagger of feet (side-on)
//   splay         knees splayed outward (rad; for the keeper squat)
//   headTurn      head yaw about y
//   headTilt      head pitch about z
//   armL,armR     { shoulder:[abductX,_,flexZ], elbow:[...] } euler per arm
//   jersey        torso material (defaults to whites)
//   trousers      leg material (defaults to whites)
//   skin          skin material
//   withHair      draw hair on the head (default true)
//   coatSkirt     { len, mat } → adds an umpire coat from waist to mid-thigh
function buildBody(p, pose = {}) {
  const {
    hipY = 0.92,
    spineLean = 0.0,            // + = lean forward
    torsoTwist = 0.0,
    stanceZ = 0.11,
    stanceX = 0.0,             // per-side fore/aft stagger (side-on stance)
    splay = 0.0,               // knees splayed outward (keeper squat)
    headTurn = 0.0,
    headTilt = 0.0,
    jersey = p.whites,
    trousers = p.whites,
    skin = p.skin,
    withHair = true,
    coatSkirt = null,        // {len, mat} → umpire coat
    armL,
    armR,
  } = pose;

  const group = new THREE.Group();
  const refs = {};

  // ── lower body: pelvis + two legs, hung from the hips ──
  const lower = new THREE.Group();
  lower.position.y = hipY;
  group.add(lower);

  const pelvis = ball(0.155, trousers, 18, 14);
  pelvis.scale.set(0.82, 0.74, 1.04);
  pelvis.position.y = -0.02;
  lower.add(pelvis);

  // 2-link IK so the foot always plants at ground (y≈0), whatever the hip
  // height — this is what makes the keeper crouch (and any stance) read right.
  // Total reach (0.97) clears the tallest standing hip (~0.94) so the legs
  // plant with a natural slight bend instead of saturating dead-straight.
  const L1 = 0.5, L2 = 0.47;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function solveLeg(dropY, fwd) {
    const d = Math.min(Math.hypot(dropY, fwd), L1 + L2 - 0.02);
    const base = Math.atan2(fwd, dropY);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const K = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    return { thighZ: base + A, kneeZ: -(Math.PI - K) };
  }
  refs.feet = [];
  for (const side of [-1, 1]) { // -1 = right (−z), +1 = left (+z)
    const footX = side === 1 ? stanceX : -stanceX;
    const sol = solveLeg(hipY, footX);
    const leg = limb({
      upperLen: L1, lowerLen: L2,
      rTop: 0.092, rMid: 0.062, rBot: 0.05,
      mat: trousers, jointR: 0.07,
      rootEuler: [-side * splay, 0, sol.thighZ],
      jointEuler: [0, 0, sol.kneeZ],
    });
    leg.root.position.set(0, 0, side * stanceZ);
    const boot = bootMesh(p);
    boot.position.y = leg.tipY;
    boot.rotation.z = -(sol.thighZ + sol.kneeZ); // keep the sole flat on the turf
    leg.lower.add(boot);
    lower.add(leg.root);
    refs.feet.push(leg.root);
  }

  // ── upper body: torso, hung from waist, leans/twists as a unit ──
  const upper = new THREE.Group();
  upper.position.y = hipY + 0.08;
  upper.rotation.z = -spineLean;     // + spineLean → lean forward (−z tips +x)
  upper.rotation.y = torsoTwist;
  group.add(upper);
  refs.upper = upper;

  // torso via a lathe profile (radius vs y), flattened front-to-back
  const prof = [
    [0.135, -0.06], [0.150, 0.02], [0.132, 0.12], [0.150, 0.24],
    [0.166, 0.36], [0.168, 0.46], [0.150, 0.52], [0.066, 0.57],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torsoGeo = new THREE.LatheGeometry(prof, 22);
  const torso = new THREE.Mesh(torsoGeo, jersey);
  torso.scale.x = 0.56;          // depth < width → flatter, masculine chest
  torso.castShadow = true;
  upper.add(torso);

  // deltoids / shoulder caps
  for (const dz of [-0.2, 0.2]) {
    const delt = ball(0.075, jersey, 12, 12);
    delt.position.set(0, 0.49, dz);
    upper.add(delt);
  }

  // optional umpire coat: a solid tapered drum from waist to mid-thigh that
  // drapes around the trousers (legs emerge below the hem).
  if (coatSkirt) {
    const len = coatSkirt.len ?? 0.56;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.158, 0.212, len, 24), coatSkirt.mat);
    skirt.scale.x = 0.72;
    skirt.position.y = 0.08 - len / 2;
    skirt.castShadow = true;
    upper.add(skirt);
    // a centre vent / button placket hint down the front
    const placket = box(0.012, len * 0.9, 0.03, p.whitesSh);
    placket.position.set(0.155, 0.1 - len / 2, 0);
    upper.add(placket);
  }

  // neck + head
  const neck = bone(0.1, 0.05, 0.058, skin);
  neck.position.y = 0.6;
  upper.add(neck);
  const hd = head(p, { skin, withHair });
  hd.position.y = 0.74;
  hd.rotation.y = headTurn;
  hd.rotation.z = headTilt;
  upper.add(hd);
  refs.head = hd;

  // ── arms, hung from the shoulders (children of upper so they lean/twist) ──
  refs.hands = {};
  const mkArm = (side, spec) => {
    const arm = limb({
      upperLen: 0.30, lowerLen: 0.28,
      rTop: 0.055, rMid: 0.043, rBot: 0.038,
      mat: skin, jointR: 0.05,
      // rootEuler [abductX, _, flexZ]: x swings the arm out to the side,
      // +z swings it forward. Default: hang at the side with a slight gap.
      rootEuler: spec?.shoulder ?? [side * 0.12, 0, 0.05],
      jointEuler: spec?.elbow ?? [0, 0, 0.12],
    });
    arm.root.position.set(0, 0.49, side * 0.205);
    upper.add(arm.root);
    return arm;
  };
  const rArm = mkArm(-1, armR); // right arm on −z
  const lArm = mkArm(1, armL);  // left arm on +z
  refs.hands.right = rArm.lower;
  refs.hands.left = lArm.lower;
  refs.armTipY = rArm.tipY;

  // bare hands by default (roles may replace with gloves)
  for (const [k, arm] of [['right', rArm], ['left', lArm]]) {
    const h = bareHand(p, skin);
    h.position.y = arm.tipY;
    arm.lower.add(h);
    refs.hands[k + 'Mesh'] = h;
  }

  // sleeves: a short jersey cuff over the upper arm if jersey != skin
  if (jersey !== skin) {
    for (const arm of [rArm, lArm]) {
      const sleeve = bone(0.2, 0.062, 0.05, jersey);
      arm.root.add(sleeve);
    }
  }

  return { group, refs };
}

function bareHand(p, skin) {
  const g = new THREE.Group();
  const palm = ball(0.038, skin, 10, 8);
  palm.scale.set(0.62, 1.05, 1.15);
  palm.position.y = -0.035;
  g.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.05, 3, 6), skin);
    f.position.set(0.004, -0.078, (i - 1.5) * 0.017);
    f.castShadow = true;
    g.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 6), skin);
  thumb.rotation.z = 0.85;
  thumb.position.set(0.018, -0.04, 0.03);
  thumb.castShadow = true;
  g.add(thumb);
  return g;
}

// ── equipment ────────────────────────────────────────────────────────────────

// Batting pad strapped over a shin/knee. Built facing +x (front of the leg);
// caller adds it to a shin group and orients it.
function battingPad(p) {
  const g = new THREE.Group();
  // main face: three vertical rolls
  for (let i = 0; i < 3; i++) {
    const roll = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.028, 0.34, 4, 8), p.pad);
    roll.position.set(0.075, -0.12, (i - 1) * 0.05);
    roll.castShadow = true;
    g.add(roll);
  }
  // knee roll (horizontal bolster at the top)
  const knee = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 8), p.padRoll);
  knee.rotation.x = Math.PI / 2;
  knee.position.set(0.07, 0.04, 0);
  knee.castShadow = true;
  g.add(knee);
  // wing flap on the outer side
  const wing = box(0.02, 0.34, 0.06, p.pad);
  wing.position.set(0.05, -0.12, -0.1);
  g.add(wing);
  // straps
  for (const y of [-0.02, -0.18, -0.3]) {
    const strap = box(0.03, 0.022, 0.2, p.strap);
    strap.position.set(0.045, y, 0);
    g.add(strap);
  }
  return g;
}

// Chunky batting glove (replaces a bare hand). Faces +x.
function battingGlove(p) {
  const g = new THREE.Group();
  const back = box(0.07, 0.11, 0.09, p.glove);
  back.position.y = -0.05;
  g.add(back);
  // sausage fingers
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.055, 4, 6), p.glove);
    f.position.set(0.02, -0.11, (i - 1.5) * 0.022);
    f.castShadow = true;
    g.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.045, 4, 6), p.glove);
  thumb.rotation.z = 0.9;
  thumb.position.set(0.03, -0.05, 0.05);
  thumb.castShadow = true;
  g.add(thumb);
  const cuff = bone(0.07, 0.05, 0.046, p.gloveTrim);
  cuff.position.y = 0.0;
  g.add(cuff);
  return g;
}

// Wicketkeeping gauntlet: big cupped mitt + long cuff. Faces +x.
function keeperGlove(p) {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12,
    0, Math.PI * 2, 0, Math.PI * 0.62), p.glove);
  cup.rotation.z = -Math.PI / 2;
  cup.scale.set(1.0, 1.15, 1.1);
  cup.position.set(0.04, -0.06, 0);
  cup.castShadow = true;
  g.add(cup);
  const palm = box(0.05, 0.12, 0.12, p.glove);
  palm.position.set(-0.01, -0.06, 0);
  g.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.05, 4, 8), p.glove);
  thumb.rotation.z = 0.8;
  thumb.position.set(0.03, -0.04, 0.07);
  thumb.castShadow = true;
  g.add(thumb);
  const cuff = bone(0.13, 0.058, 0.05, p.gloveTrim);
  g.add(cuff);
  return g;
}

// A cricket helmet with peak and steel grille. Sits on the head, opening +x.
function helmet(p, shellMat) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    shellMat);
  shell.scale.set(1.04, 1.05, 1.02);
  shell.position.y = 0.02;
  shell.castShadow = true;
  g.add(shell);
  // peak
  const peak = box(0.10, 0.018, 0.2, shellMat);
  peak.position.set(0.12, 0.02, 0);
  peak.rotation.z = 0.12;
  g.add(peak);
  // grille: 3 horizontal bars + 2 verticals across the face gap
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.21, 8), p.grille);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.118, -0.02 - i * 0.045, 0);
    bar.castShadow = true;
    g.add(bar);
  }
  for (const dz of [-0.05, 0.05]) {
    const v = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), p.grille);
    v.rotation.z = -0.1;
    v.position.set(0.122, -0.06, dz);
    v.castShadow = true;
    g.add(v);
  }
  return g;
}

// A cap (bowler / keeper) — crown + peak. Faces +x.
function cap(mat) {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
  crown.scale.set(1.02, 0.9, 1.0);
  crown.position.y = 0.03;
  crown.castShadow = true;
  g.add(crown);
  const peak = box(0.12, 0.014, 0.16, mat);
  peak.position.set(0.115, 0.018, 0);
  peak.rotation.z = 0.08;
  g.add(peak);
  return g;
}

// Wide-brim umpire hat. Faces +x.
function umpireHat(p) {
  const g = new THREE.Group();
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28), p.hat);
  brim.position.y = 0.0;
  brim.castShadow = true;
  g.add(brim);
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.125, 0.085, 22), p.hat);
  crown.position.y = 0.045;
  crown.castShadow = true;
  g.add(crown);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), p.hat);
  top.position.y = 0.086;
  top.castShadow = true;
  g.add(top);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.113, 0.127, 0.022, 22), p.trouser);
  band.position.y = 0.012;
  g.add(band);
  return g;
}

// A cricket bat. Built upright (handle up, toe down), faces blade toward +x.
function cricketBat(p) {
  const g = new THREE.Group();
  const blade = box(0.06, 0.58, 0.11, p.willow);
  blade.position.y = -0.29;
  g.add(blade);
  // spine ridge on the back
  const spine = box(0.03, 0.5, 0.04, p.willowEdge);
  spine.position.set(-0.03, -0.27, 0);
  g.add(spine);
  // toe
  const toe = box(0.06, 0.03, 0.115, p.willow);
  toe.position.y = -0.585;
  g.add(toe);
  // shoulders + splice
  const splice = box(0.05, 0.1, 0.05, p.willow);
  splice.position.y = 0.03;
  g.add(splice);
  // handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.017, 0.018, 0.2, 12), p.rubber);
  handle.position.y = 0.16;
  handle.castShadow = true;
  g.add(handle);
  return g;
}

// ── ROLE BUILDERS ────────────────────────────────────────────────────────────

// Right/left-handed batsman in a side-on waiting stance, bat grounded.
export function buildBatsman(p, { handed = 'R', jersey = p.whites,
  helmetColor = 0x16243f, skin = p.skin } = {}) {
  const s = handed === 'R' ? 1 : -1;     // mirror the stance for lefties
  const { group, refs } = buildBody(p, {
    hipY: 0.88,
    spineLean: 0.16,                      // lean forward over the ball
    torsoTwist: s * 0.45,                 // side-on
    stanceZ: 0.18,
    stanceX: s * 0.1,                     // front foot forward (mirrors for LH)
    headTurn: -s * 0.55,                  // look back down the pitch
    jersey, skin,
    // both arms forward & down so the gloves meet on the handle in front
    armR: { shoulder: [-0.12, 0, 0.55], elbow: [0, 0, 1.05] },
    armL: { shoulder: [0.12, 0, 0.62], elbow: [0, 0, 1.15] },
    withHair: false,
  });

  // helmet (its shell material is unique per build, not from the shared
  // palette — record it so the scene can dispose it when rebuilding)
  const shellMat = new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.4 });
  refs.head.add(helmet(p, shellMat));
  group.userData.ownMaterials = [shellMat];

  // gloves replace bare hands
  for (const k of ['right', 'left']) {
    refs.hands[k].remove(refs.hands[k + 'Mesh']);
    const glove = battingGlove(p);
    glove.position.y = refs.armTipY;
    refs.hands[k].add(glove);
  }

  // pads on both shins (children of each shin group → follow the leg pose)
  refs.feet.forEach((legRoot) => {
    const shin = legRoot.children.find((c) => c.type === 'Group');
    if (shin) { const pad = battingPad(p); shin.add(pad); }
  });

  // bat: stand it vertically in front of the hands, toe tapping the ground
  // just outside off — attached to the body so its pose is clean & stable.
  const bat = cricketBat(p);
  bat.position.set(0.33, 0.64, s * 0.13);
  bat.rotation.z = 0.1;
  bat.rotation.x = -s * 0.05;
  group.add(bat);

  group.userData.role = 'batsman';
  return group;
}

// Wicketkeeper in a low crouch, gauntlets forward between the feet.
export function buildWicketkeeper(p, { jersey = fabric(0x1d6b3a), capColor = 0x14351f, skin = p.skinDark } = {}) {
  const { group, refs } = buildBody(p, {
    hipY: 0.66,                 // low catcher's squat, feet planted by IK
    spineLean: 0.5,             // chest forward over the thighs
    stanceZ: 0.24,              // feet wide
    splay: 0.38,                // knees splayed outward
    headTurn: 0,
    headTilt: -0.28,            // chin up, eyes on the ball
    jersey, skin,
    // arms forward so the gloves sit low and in front, ready to take it
    armR: { shoulder: [-0.08, 0, 0.42], elbow: [0, 0, 0.5] },
    armL: { shoulder: [0.08, 0, 0.42], elbow: [0, 0, 0.5] },
    withHair: false,
  });
  // cap
  refs.head.add(cap(fabric(capColor)));
  // big gauntlets cupped upward, low and forward between the feet
  for (const k of ['right', 'left']) {
    refs.hands[k].remove(refs.hands[k + 'Mesh']);
    const gl = keeperGlove(p);
    gl.position.y = refs.armTipY;
    gl.rotation.z = -1.5;          // cup turned up to receive
    refs.hands[k].add(gl);
  }
  // light pads on shins
  refs.feet.forEach((legRoot) => {
    const shin = legRoot.children.find((c) => c.type === 'Group');
    if (shin) { const pad = battingPad(p); pad.scale.set(0.8, 0.8, 0.8); shin.add(pad); }
  });
  group.userData.role = 'keeper';
  return group;
}

// Fast bowler poised at the crease, ball cradled in both hands at the chest.
export function buildBowler(p, { jersey = p.whites, capColor = 0x2a3550, skin = p.skin,
  withCap = true, ballMat = p.leatherR } = {}) {
  const { group, refs } = buildBody(p, {
    hipY: 0.94,
    spineLean: 0.05,
    torsoTwist: 0.16,
    stanceZ: 0.14,
    stanceX: 0.06,
    headTurn: -0.12,
    jersey, skin,
    // upper arms tucked in, forearms bent ~90° forward so the hands meet in
    // front of the chest, cradling the ball.
    armR: { shoulder: [-0.32, 0, 0.5], elbow: [0, 0, 1.55] },
    armL: { shoulder: [0.32, 0, 0.5], elbow: [0, 0, 1.55] },
    withHair: !withCap,
  });
  if (withCap) refs.head.add(cap(fabric(capColor)));
  // the ball, cupped between both hands in front of the chest
  const theBall = ball(BALL_R, ballMat, 16, 16);
  theBall.position.set(0.35, 1.33, 0);
  group.add(theBall);
  group.userData.role = 'bowler';
  return group;
}

// Umpire: wide-brim hat, cream coat over dark trousers, hands clasped front.
export function buildUmpire(p, { skin = p.skin, shades = true } = {}) {
  const { group, refs } = buildBody(p, {
    hipY: 0.92,
    spineLean: 0.03,
    stanceZ: 0.14,
    jersey: p.coat,
    trousers: p.trouser,
    skin,
    coatSkirt: { len: 0.56, mat: p.coat },
    // forearms raised to clasp hands in front at the waist
    armR: { shoulder: [-0.12, 0, 0.42], elbow: [0, 0, 1.35] },
    armL: { shoulder: [0.12, 0, 0.42], elbow: [0, 0, 1.35] },
    withHair: true,
  });
  refs.head.add(umpireHat(p));
  if (shades) {
    const gl = box(0.03, 0.03, 0.13, p.shade);
    gl.position.set(0.11, 0.0, 0);
    refs.head.add(gl);
  }
  // a small counter (clicker) in one hand
  const counter = box(0.04, 0.05, 0.03, p.strap);
  counter.position.y = refs.armTipY - 0.02;
  refs.hands.right.add(counter);
  group.userData.role = 'umpire';
  return group;
}

// ball radius is injected by the scene via setBallRadius() so figures.js stays
// decoupled from physics.js
let BALL_R = 0.0365;
export function setBallRadius(r) { BALL_R = r; }
