import * as THREE from 'three';
import { runDelivery, spinAxis, PITCH } from './physics.js';
import { createScene } from './scene.js';
import { defaultParams, setupUI, renderResults } from './ui.js';

const params = { ...defaultParams };
const view = createScene(document.getElementById('app'));

let result = null;
let playT = 0;
let playing = false;
let segIdx = 0;

// initial seam orientation: local +Y (the seam-plane normal in the texture)
// is rotated onto the spin axis — for a seam bowler that is the seam-plane
// normal, so the presented seam angle is physically correct; for spinners the
// seam spins about the wrist-spin axis exactly as released.
function ballOrientation() {
  const ax = spinAxis({ ...params, spinRpm: Math.max(params.spinRpm, 1) });
  const n = new THREE.Vector3(...ax);
  if (n.lengthSq() < 1e-9) n.set(0, 0, 1);
  n.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  // wobble: tip the seam off its stable axis so it precesses visibly
  if (params.wobble > 0) {
    const tilt = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0), params.wobble * 0.5,
    );
    q.multiply(tilt);
  }
  return q;
}

function refreshStatics() {
  view.setConditions(params);
  view.setBallAppearance(params, ballOrientation());
  const targetMode = params.aimMode === 'target (length & line)';
  view.setAimMarker(PITCH.length - params.lengthM, params.lineM, targetMode);
}

function sampleAt(t) {
  const s = result.samples;
  if (t <= s[0].t) return s[0].p;
  if (t >= s[s.length - 1].t) return s[s.length - 1].p;
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = s[lo], b = s[hi];
  const f = (t - a.t) / (b.t - a.t || 1e-9);
  return [
    a.p[0] + f * (b.p[0] - a.p[0]),
    a.p[1] + f * (b.p[1] - a.p[1]),
    a.p[2] + f * (b.p[2] - a.p[2]),
  ];
}

function bowl() {
  refreshStatics();
  result = runDelivery(params);
  view.setBallAppearance(params, ballOrientation());
  view.showTrajectory(result, params.keepTrails);
  view.resetBails();
  playT = 0;
  segIdx = 0;
  playing = true;
  document.getElementById('results').style.display = 'none';
  document.getElementById('speedo').style.display = 'block';
}

function replay() {
  if (!result) return;
  view.resetBails();
  playT = 0;
  segIdx = 0;
  playing = true;
}

setupUI(params, {
  onBowl: bowl,
  onReplay: replay,
  onParamsChanged: refreshStatics,
  onCamera: (name) => view.setCameraPreset(name),
});

refreshStatics();
view.placeBall([PITCH.crease + 0.1, 1.22 * params.bowlerHeight, params.releaseZ]);

const clock = new THREE.Clock();
const speedo = document.getElementById('speedo');
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (result && playing) {
    const simDt = dt * params.slowMo;
    playT += simDt;
    const tEnd = result.samples[result.samples.length - 1].t;

    const pos = sampleAt(playT);
    view.placeBall(pos);
    view.revealTrail(playT);

    // spin the ball about the current segment's angular velocity
    while (segIdx + 1 < result.segments.length && result.segments[segIdx + 1].t0 <= playT) segIdx++;
    const om = result.segments[segIdx].omega;
    const w = Math.hypot(om[0], om[1], om[2]);
    if (w > 1e-6) {
      tmpV.set(om[0] / w, om[1] / w, om[2] / w);
      tmpQ.setFromAxisAngle(tmpV, w * simDt);
      view.spinBall(tmpQ);
    }

    // live speed gun
    const v2 = sampleAt(Math.min(playT + 0.01, tEnd));
    const spd = Math.hypot(v2[0] - pos[0], v2[1] - pos[1], v2[2] - pos[2]) / 0.01;
    speedo.textContent = `${(spd * 3.6).toFixed(1)} kph`;

    if (params.followBall) {
      tmpV.set(v2[0] - pos[0], v2[1] - pos[1], v2[2] - pos[2]);
      view.followBall(pos, tmpV);
    }

    if (result.stumpHit && playT >= result.stumpHit.t) view.hitStumps();

    if (playT >= tEnd) {
      playing = false;
      view.revealTrail(Infinity);
      renderResults(result, params);
      speedo.style.display = 'none';
    }
  }

  view.tick(dt);
}
animate();

// bowl one on load so the screen isn't empty
bowl();
