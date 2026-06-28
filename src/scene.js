// Three.js stadium scene: pitch strip, stumps + bails, outfield, sky and
// lighting driven by the weather, the ball with a physically-oriented seam,
// hawk-eye style trajectory tubes and bounce markers.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PITCH, BALL } from './physics.js';
import { makeBallTextures, makePitchTexture } from './textures.js';
import {
  figurePalette, buildBatsman, buildWicketkeeper, buildBowler, buildUmpire,
  setBallRadius,
} from './figures.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(10, 0.8, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.maxDistance = 160;

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ── lights & sky ──
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5e35, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
  sun.position.set(-18, 42, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 140;
  scene.add(sun);

  // cloud sprites
  const cloudGroup = new THREE.Group();
  const cloudTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const x = 64 + Math.random() * 128, y = 90 + Math.random() * 76, r = 30 + Math.random() * 42;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(cv);
  })();
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false }));
    m.position.set(-120 + Math.random() * 280, 55 + Math.random() * 45, -160 + Math.random() * 320);
    const s = 50 + Math.random() * 70;
    m.scale.set(s, s * 0.5, 1);
    cloudGroup.add(m);
  }
  scene.add(cloudGroup);

  // ── ground & pitch ──
  const outfield = new THREE.Mesh(
    new THREE.CircleGeometry(85, 64),
    new THREE.MeshStandardMaterial({ color: 0x3f7a36, roughness: 1 }),
  );
  outfield.rotation.x = -Math.PI / 2;
  outfield.position.set(PITCH.length / 2, -0.01, 0);
  outfield.receiveShadow = true;
  scene.add(outfield);

  // boundary rope
  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(74, 0.12, 8, 128),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee }),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.set(PITCH.length / 2, 0.1, 0);
  scene.add(rope);

  const pitchMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const pitchMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.stripWidth, PITCH.length + 2 * PITCH.crease),
    pitchMat,
  );
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.rotation.z = Math.PI / 2;
  pitchMesh.position.set(PITCH.length / 2, 0.001, 0);
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  // creases
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
  const addLine = (x, z, w, l) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.004, z);
    scene.add(m);
  };
  for (const end of [0, PITCH.length]) {
    const dir = end === 0 ? 1 : -1;
    addLine(end + dir * PITCH.crease, 0, 0.05, 3.66);            // popping crease
    addLine(end, 0, 0.05, 2.64);                                  // bowling crease
    addLine(end + dir * 0.66, 1.32, 1.32, 0.05);                  // return creases
    addLine(end + dir * 0.66, -1.32, 1.32, 0.05);
  }

  // ── stumps ──
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd8b46a, roughness: 0.6 });
  const bailMat = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.6 });
  const wickets = { batter: null, bowler: null };
  const bails = [];

  function buildWicket(x) {
    const grp = new THREE.Group();
    for (const dz of [-0.0953, 0, 0.0953]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, PITCH.stumpHeight, 12), stumpMat);
      st.position.set(0, PITCH.stumpHeight / 2, dz);
      st.castShadow = true;
      grp.add(st);
    }
    for (const dz of [-0.0476, 0.0476]) {
      const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 8), bailMat);
      bl.rotation.x = Math.PI / 2;
      bl.position.set(0, PITCH.stumpHeight + 0.013, dz);
      bl.castShadow = true;
      grp.add(bl);
      if (x > 1) bails.push(bl);
    }
    grp.position.x = x;
    scene.add(grp);
    return grp;
  }
  wickets.bowler = buildWicket(0);
  wickets.batter = buildWicket(PITCH.length);

  // sight screen
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 6),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide }),
  );
  screen.position.set(-40, 3, 0);
  screen.rotation.y = Math.PI / 2;
  scene.add(screen);

  // ── hyper-real (static) figures: batsman, keeper, bowler, two umpires ──
  setBallRadius(BALL.radius);
  const palette = figurePalette();

  // free a discarded figure's GPU resources: every geometry is built fresh
  // per figure, but materials come from the shared palette — only dispose the
  // ones the builder flagged as its own (e.g. a batsman's unique helmet shell).
  function disposeFigure(fig) {
    fig.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    (fig.userData.ownMaterials || []).forEach((m) => m.dispose());
  }

  // batsman at the striker's end, side-on, facing the bowler (−x).
  // Rebuilt only when handedness flips (a static figure, so cheap).
  let batter = null;
  let batterHanded = null;
  function placeBatter(rh) {
    const handed = rh ? 'R' : 'L';
    if (handed === batterHanded) return;
    if (batter) { scene.remove(batter); disposeFigure(batter); }
    batter = buildBatsman(palette, { handed });
    batter.rotation.y = Math.PI;
    batterHanded = handed;
    scene.add(batter);
    batter.position.set(PITCH.length - PITCH.crease + 0.15, 0, rh ? 0.34 : -0.34);
  }
  placeBatter(true);

  // wicketkeeper crouched behind the striker's stumps
  const keeper = buildWicketkeeper(palette);
  keeper.position.set(PITCH.length + 1.7, 0, 0.0);
  keeper.rotation.y = Math.PI;
  scene.add(keeper);

  // bowler poised at the bowling crease, facing down the pitch (+x)
  const bowlerFig = buildBowler(palette);
  scene.add(bowlerFig);

  // standing umpire at the bowler's end (faces +x down the pitch) and the
  // square-leg umpire — both sit on handedness-dependent sides of the pitch,
  // so they follow the batter when it flips (+z = leg side for a RH striker).
  const umpire = buildUmpire(palette);
  umpire.rotation.y = 0;
  scene.add(umpire);
  const legUmpire = buildUmpire(palette, { shades: false });
  scene.add(legUmpire);
  function placeOfficials(rh) {
    umpire.position.set(-0.85, 0, rh ? -0.62 : 0.62);            // off side
    legUmpire.position.set(PITCH.length - PITCH.crease, 0, rh ? 13 : -13);
    legUmpire.rotation.y = rh ? Math.PI / 2 : -Math.PI / 2;       // face the pitch
  }
  placeOfficials(true);

  // ── the ball ──
  const ballMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.02 });
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 48, 48), ballMat);
  ballMesh.castShadow = true;
  const seamHolder = new THREE.Group(); // orientation applied to holder, spin to mesh
  seamHolder.add(ballMesh);
  scene.add(seamHolder);

  // aim marker
  const aimMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.10, 24),
    new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  aimMarker.rotation.x = -Math.PI / 2;
  aimMarker.position.y = 0.006;
  scene.add(aimMarker);

  // ── trajectory visuals ──
  const trailGroup = new THREE.Group();
  scene.add(trailGroup);
  let liveTrail = null;
  const oldTrails = [];

  function buildTrail(result) {
    const grp = new THREE.Group();
    const segs = [];
    const bounceT = result.bounces.length ? result.bounces[0].t : Infinity;
    const pre = result.samples.filter((s) => s.t <= bounceT);
    const post = result.samples.filter((s) => s.t >= bounceT);
    for (const [pts, color] of [[pre, 0x35c8ff], [post, 0xff7340]]) {
      if (pts.length < 3) continue;
      const curve = new THREE.CatmullRomCurve3(pts.map((s) => new THREE.Vector3(...s.p)));
      const geo = new THREE.TubeGeometry(curve, Math.max(16, pts.length), 0.024, 8, false);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      const idxCount = geo.index.count;
      segs.push({ mesh, t0: pts[0].t, t1: pts[pts.length - 1].t, idxCount });
      grp.add(mesh);
    }
    // bounce markers
    for (const b of result.bounces) {
      const ring = new THREE.Mesh(
        new THREE.CircleGeometry(0.07, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.x, 0.005, b.z);
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.12, 20),
        new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide }),
      );
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.set(b.x, 0.0055, b.z);
      grp.add(ring, ring2);
    }
    return { grp, segs };
  }

  // ── flying bails on a stump hit ──
  let bailFly = null;

  const api = {
    renderer, scene, camera, controls,

    setConditions(p) {
      const cloud = p.cloud;
      const sky = new THREE.Color().lerpColors(new THREE.Color(0x7fb2e8), new THREE.Color(0x97a1ab), cloud);
      scene.background = sky;
      scene.fog = new THREE.Fog(sky, 90, 320);
      sun.intensity = 2.3 - 1.7 * cloud;
      hemi.intensity = 0.9 + 0.5 * cloud;
      cloudGroup.children.forEach((c) => (c.material.opacity = 0.15 + 0.8 * cloud));
      pitchMat.map = makePitchTexture(p);
      pitchMat.needsUpdate = true;
      outfield.material.color.setHSL(0.32, 0.42, 0.16 + 0.1 * (1 - cloud * 0.4));
      bowlerFig.position.set(PITCH.crease - 0.3, 0, p.releaseZ);
      placeBatter(p.batterRH);
      placeOfficials(p.batterRH);
    },

    setBallAppearance(p, orientationQuat) {
      // figure out which local hemisphere faces the polished (+z or −z) side
      const yWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(orientationQuat);
      const wantZ = p.shinySideLeg ? 1 : -1;
      const shinyNorth = Math.sign(yWorld.z || 1) === wantZ;
      const { map, roughnessMap } = makeBallTextures({ ...p, shinyNorth });
      ballMat.map = map;
      ballMat.roughnessMap = roughnessMap;
      ballMat.roughness = 1;
      ballMat.needsUpdate = true;
      seamHolder.quaternion.copy(orientationQuat);
      ballMesh.quaternion.identity();
    },

    setAimMarker(x, z, visible) {
      aimMarker.visible = visible;
      aimMarker.position.set(x, 0.006, z);
    },

    placeBall(pos) { seamHolder.position.set(...pos); },
    spinBall(dq) { ballMesh.quaternion.premultiply(dq); },

    showTrajectory(result, keepOld) {
      if (liveTrail) {
        if (keepOld) {
          liveTrail.segs.forEach((s) => { s.mesh.material.opacity = 0.18; });
          oldTrails.push(liveTrail);
          while (oldTrails.length > 6) {
            const t = oldTrails.shift();
            trailGroup.remove(t.grp);
          }
        } else {
          trailGroup.remove(liveTrail.grp);
        }
      }
      if (!keepOld) {
        oldTrails.forEach((t) => trailGroup.remove(t.grp));
        oldTrails.length = 0;
      }
      liveTrail = buildTrail(result);
      trailGroup.add(liveTrail.grp);
      api.revealTrail(0);
    },

    revealTrail(t) {
      if (!liveTrail) return;
      for (const s of liveTrail.segs) {
        const f = (t - s.t0) / Math.max(1e-6, s.t1 - s.t0);
        s.mesh.geometry.setDrawRange(0, Math.floor(Math.max(0, Math.min(1, f)) * s.idxCount));
      }
    },

    hitStumps() {
      bailFly = bails.map((b) => ({
        m: b,
        v: new THREE.Vector3(1.5 + Math.random() * 2, 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 3),
        w: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
      }));
    },

    resetBails() {
      bailFly = null;
      bails.forEach((b, i) => {
        b.position.set(0, PITCH.stumpHeight + 0.013, i % 2 ? 0.0476 : -0.0476);
        b.rotation.set(Math.PI / 2, 0, 0);
      });
    },

    tick(dt) {
      if (bailFly) {
        for (const b of bailFly) {
          b.v.y -= 9.81 * dt;
          b.m.position.addScaledVector(b.v, dt);
          b.m.rotation.x += b.w.x * dt;
          b.m.rotation.z += b.w.z * dt;
          if (b.m.position.y < 0.02) { b.m.position.y = 0.02; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
        }
      }
      controls.update();
      renderer.render(scene, camera);
    },

    setCameraPreset(name, ballPos) {
      const presets = {
        'Bowler run-up':  { p: [-6, 2.6, 0.4], t: [16, 0.8, 0] },
        'Broadcast':      { p: [-13, 7.5, 0.5], t: [16, 0.5, 0] },
        'Batter eye':     { p: [PITCH.length - 0.5, 1.65, 0.3], t: [2, 1.6, 0] },
        'Keeper':         { p: [PITCH.length + 3.2, 1.5, 0], t: [4, 1.2, 0] },
        'Side-on':        { p: [10, 2.6, 14], t: [10, 0.8, 0] },
        'Umpire':         { p: [-1.2, 1.9, 0], t: [19, 0.7, 0] },
        'Overhead':       { p: [10, 30, 0.01], t: [10, 0, 0] },
      };
      const pr = presets[name];
      if (!pr) return;
      camera.position.set(...pr.p);
      controls.target.set(...pr.t);
      void ballPos;
    },

    followBall(pos, speedDir) {
      const back = speedDir.clone().normalize().multiplyScalar(-2.2);
      camera.position.lerp(new THREE.Vector3(pos[0] + back.x, pos[1] + 0.9, pos[2] + back.z + 1.4), 0.18);
      controls.target.lerp(new THREE.Vector3(...pos), 0.35);
    },
  };

  api.setCameraPreset('Broadcast');
  return api;
}
