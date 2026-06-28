// Parameter panel (lil-gui), delivery presets, and the post-delivery
// results card.

import GUI from 'lil-gui';

export const defaultParams = {
  // delivery
  speedKph: 135,
  aimMode: 'target (length & line)',
  lengthM: 6.5,        // metres in front of the batter's stumps
  lineM: 0.0,          // metres from middle stump (+ = leg side, RH batter)
  elevationDeg: -6,
  azimuthDeg: 0,
  // bowler
  bowlerHeight: 1.88,
  releaseExtra: 0.12,  // jump / wrist snap above 1.22 × height
  releaseZ: 0.28,      // + = over the wicket for a right-armer
  batterRH: true,
  // ball
  ballType: 'red',
  brand: 'dukes',
  ageOvers: 4,
  shine: 0.9,
  shinySideLeg: true,
  seamAngleDeg: -20,
  wobble: 0.0,
  // spin
  spinPreset: 'seam (backspin)',
  spinRpm: 900,
  spinAzimuthDeg: 200,
  spinElevationDeg: 0,
  // conditions
  tempC: 22,
  humidity: 55,
  pressureHPa: 1013,
  cloud: 0.6,
  cloudAssist: 0.15,
  windKph: 8,
  windDirDeg: 30,
  // pitch
  grass: 0.45,
  hardness: 0.65,
  dryness: 0.15,
  // playback
  slowMo: 1,
  keepTrails: false,  // each new ball clears the last; toggle on to overlay & compare
  followBall: false,
  camera: 'Broadcast',
  seed: 0,
};

export const PRESETS = {
  'New-ball outswinger (135k)': {
    speedKph: 135, ageOvers: 3, shine: 0.95, seamAngleDeg: -20, shinySideLeg: true,
    wobble: 0, spinPreset: 'seam (backspin)', spinRpm: 900, lengthM: 6.5, lineM: 0.1,
    cloud: 0.75, grass: 0.5, hardness: 0.6, dryness: 0.1, brand: 'dukes', ballType: 'red',
  },
  'New-ball inswinger (132k)': {
    speedKph: 132, ageOvers: 3, shine: 0.95, seamAngleDeg: 20, shinySideLeg: false,
    wobble: 0, spinPreset: 'seam (backspin)', spinRpm: 850, lengthM: 5.5, lineM: -0.25,
    cloud: 0.75, grass: 0.5, brand: 'dukes', ballType: 'red',
  },
  'Reverse-swing yorker (148k)': {
    speedKph: 148, ageOvers: 45, shine: 0.85, seamAngleDeg: -18, shinySideLeg: true,
    wobble: 0, spinPreset: 'seam (backspin)', spinRpm: 1100, lengthM: 1.0, lineM: -0.05,
    cloud: 0.1, grass: 0.05, hardness: 0.75, dryness: 0.55, brand: 'sg', ballType: 'red',
  },
  'Wobble seam, green top (138k)': {
    speedKph: 138, ageOvers: 10, seamAngleDeg: -8, wobble: 0.75, spinPreset: 'seam (backspin)',
    spinRpm: 700, lengthM: 7, lineM: 0, grass: 0.85, hardness: 0.7, dryness: 0.05,
    cloud: 0.85, brand: 'dukes', ballType: 'red',
  },
  'Bouncer (145k)': {
    speedKph: 145, ageOvers: 25, seamAngleDeg: 0, wobble: 0.4, spinPreset: 'seam (backspin)',
    spinRpm: 800, lengthM: 9.8, lineM: 0.15, hardness: 0.85, grass: 0.3, dryness: 0.2,
  },
  'Leg-break — the Gatting ball': {
    speedKph: 84, ageOvers: 30, shine: 0.5, seamAngleDeg: 30, spinPreset: 'leg-break',
    spinRpm: 2600, lengthM: 4.2, lineM: 0.45, grass: 0.15, hardness: 0.55, dryness: 0.6,
    cloud: 0.4, brand: 'dukes', ballType: 'red',
  },
  'Off-break, day-5 dustbowl': {
    speedKph: 88, ageOvers: 50, shine: 0.3, seamAngleDeg: -25, spinPreset: 'off-break',
    spinRpm: 2200, lengthM: 4.5, lineM: -0.35, grass: 0.0, hardness: 0.45, dryness: 0.95,
    brand: 'sg', ballType: 'red',
  },
  'Googly (wrong-un)': {
    speedKph: 80, ageOvers: 35, seamAngleDeg: 20, spinPreset: 'googly', spinRpm: 2300,
    lengthM: 4.0, lineM: 0.35, dryness: 0.7, grass: 0.05, hardness: 0.5,
  },
  'Top-spinner (extra bounce)': {
    speedKph: 86, ageOvers: 35, seamAngleDeg: 0, spinPreset: 'top-spinner', spinRpm: 2400,
    lengthM: 4.8, lineM: 0.0, dryness: 0.6, grass: 0.05, hardness: 0.6,
  },
  'Flipper (skids on)': {
    speedKph: 92, ageOvers: 35, seamAngleDeg: 0, spinPreset: 'flipper / back-spin', spinRpm: 2000,
    lengthM: 6.5, lineM: 0.0, dryness: 0.5, grass: 0.1, hardness: 0.6,
  },
  'White-ball T20 death yorker': {
    speedKph: 142, ballType: 'white', brand: 'kookaburra', ageOvers: 16, shine: 0.6,
    seamAngleDeg: 12, shinySideLeg: false, wobble: 0.2, spinPreset: 'seam (backspin)',
    spinRpm: 950, lengthM: 0.8, lineM: 0.12, cloud: 0.0, grass: 0.25, hardness: 0.7, dryness: 0.3,
  },
  'Pink-ball twilight nip-backer': {
    speedKph: 140, ballType: 'pink', brand: 'kookaburra', ageOvers: 8, shine: 0.9,
    seamAngleDeg: 14, shinySideLeg: false, spinPreset: 'seam (backspin)', spinRpm: 850,
    lengthM: 6.8, lineM: -0.18, cloud: 0.9, grass: 0.6, hardness: 0.7, dryness: 0.05,
  },
};

// ── Famous deliveries ────────────────────────────────────────────────────────
// A separate category from the lab presets above: real, documented deliveries
// from cricket history, each researched (speed / ball condition / pitch) and
// then tuned against the physics engine so the simulated outcome matches what
// actually happened — bowled balls bowl; the caught/struck ones beat the bat or
// rear up. Facts fact-checked against ESPNcricinfo, Wisden, BBC and scorecards;
// where no speed gun existed the speed is a labelled era/style estimate.
export const FAMOUS_DELIVERIES = {
  '🐍 Warne — Ball of the Century': {
    meta: 'Old Trafford · 1st Ashes Test, 1993 · ~80 km/h (era estimate) · Gatting b Warne 4',
    story: "Warne's first ball in Ashes cricket drifted toward Gatting's pads, gripped the Old Trafford rough and spat past his edge to clip the top of off stump — reviving the lost art of leg-spin overnight.",
    params: {
      speedKph: 80, brand: 'dukes', ballType: 'red', ageOvers: 25, shine: 0.45,
      seamAngleDeg: 32, spinPreset: 'leg-break', spinRpm: 2900, lengthM: 3.8, lineM: 0.42,
      grass: 0.12, hardness: 0.70, dryness: 0.75, cloud: 0.3, batterRH: true, shinySideLeg: true,
    },
  },
  '🔄 Wasim — Two that won the Cup': {
    meta: 'MCG · 1992 World Cup final · ~140 km/h (era estimate) · Lamb & Lewis, both bowled',
    story: "Two balls, two shattered stumps, one World Cup. A 34-over-old white ball reverse-swinging under the Melbourne lights: Akram squared up Allan Lamb, then bent one back through Chris Lewis.",
    params: {
      speedKph: 142, brand: 'kookaburra', ballType: 'white', ageOvers: 38, shine: 0.2,
      seamAngleDeg: -18, spinPreset: 'seam (backspin)', spinRpm: 1100, lengthM: 5.5, lineM: 0.10,
      grass: 0.1, hardness: 0.78, dryness: 0.5, cloud: 0.1, batterRH: true, shinySideLeg: false,
    },
  },
  '💨 Shoaib — the 100 mph ball': {
    meta: 'Newlands, Cape Town · 2003 World Cup · 161.3 km/h (measured) · Nick Knight, dot ball',
    story: "The only delivery ever officially clocked past 100 mph — 161.3 km/h from the Rawalpindi Express — which Nick Knight simply nudged to square leg, ending the fastest over ever bowled.",
    params: {
      speedKph: 161.3, brand: 'kookaburra', ballType: 'white', ageOvers: 4, shine: 0.9,
      seamAngleDeg: 5, spinPreset: 'seam (backspin)', spinRpm: 1300, lengthM: 6.2, lineM: 0.22,
      grass: 0.25, hardness: 0.72, dryness: 0.1, cloud: 0.6, batterRH: false,
    },
  },
  '🪄 Murali — the doosra': {
    meta: 'Trent Bridge · 2006, 3rd Test · ~72 km/h (lab estimate) · Trescothick b Muralitharan 31',
    story: "Trescothick read the off-break and played back; Murali's doosra spun the other way, skidded straight on and rattled off stump — the first of an 8 for 70 that buried England.",
    params: {
      speedKph: 72, brand: 'dukes', ballType: 'red', ageOvers: 15, shine: 0.4,
      seamAngleDeg: -10, spinPreset: 'leg-break', spinRpm: 1100, lengthM: 5.5, lineM: 0.42,
      grass: 0.05, hardness: 0.5, dryness: 0.7, batterRH: false,
    },
  },
  '🔥 Flintoff — the Edgbaston over': {
    meta: "Edgbaston · 2005 Ashes · ~145 km/h (estimate) · Ponting c Jones b Flintoff 1",
    story: "Round the wicket, the old ball hooping both ways at 90 mph. Flintoff castled Langer, then tortured Ponting for six balls before a late reverse out-swinger kissed the edge — rated one of Test cricket's greatest overs.",
    params: {
      speedKph: 145, brand: 'dukes', ballType: 'red', ageOvers: 45, shine: 0.6,
      seamAngleDeg: -18, shinySideLeg: true, spinPreset: 'seam (backspin)', spinRpm: 1100,
      lengthM: 6.0, lineM: -0.05, grass: 0.2, hardness: 0.7, dryness: 0.65, cloud: 0.5, batterRH: true,
    },
  },
  "😱 Archer — the Lord's neck blow": {
    meta: "Lord's · 2019 Ashes · 148.7 km/h (measured) · struck Steve Smith — no wicket",
    story: "On a 66-over-old ball, debutant Jofra Archer touched 96 mph then thudded a 92.4 mph rocket into Steve Smith's neck below the left ear — felling the world's best batsman and forcing cricket's first concussion substitution.",
    params: {
      speedKph: 148.7, brand: 'dukes', ballType: 'red', ageOvers: 40, shine: 0.5,
      seamAngleDeg: 0, wobble: 0.2, spinPreset: 'seam (backspin)', spinRpm: 1000,
      lengthM: 9.6, lineM: 0.0, grass: 0.3, hardness: 0.9, dryness: 0.35, batterRH: true,
    },
  },
  '🎯 Malinga — four in four': {
    meta: 'Providence, Guyana · 2007 World Cup · 144.7 km/h (measured) · Ntini b Malinga — 4th in 4',
    story: "Needing just four to win, South Africa lost four wickets in four balls. Malinga's old-ball reverse-swing yorkers skidded low onto the toes — the first four-in-four in international cricket history.",
    params: {
      speedKph: 144.7, brand: 'kookaburra', ballType: 'white', ageOvers: 45, shine: 0.3,
      seamAngleDeg: -14, spinPreset: 'seam (backspin)', spinRpm: 1100, lengthM: 1.0, lineM: -0.02,
      grass: 0.05, hardness: 0.62, dryness: 0.55, bowlerHeight: 1.70, releaseExtra: 0.0, batterRH: true,
    },
  },
  "📐 McGrath — Atherton's bunny": {
    meta: 'The Oval · 2001 Ashes · ~132 km/h (estimate) · Atherton c Warne b McGrath 9',
    story: "McGrath's metronomic off-stump channel claimed Atherton for a record 19th time — a back-of-a-length seamer that held its line, kissed the edge and nestled in Warne's hands at slip, ending the opener's last Test innings.",
    params: {
      speedKph: 134, brand: 'dukes', ballType: 'red', ageOvers: 3, shine: 0.93,
      seamAngleDeg: -3, shinySideLeg: true, spinPreset: 'seam (backspin)', spinRpm: 1000,
      lengthM: 7.2, lineM: 0.08, grass: 0.22, hardness: 0.72, dryness: 0.1, cloud: 0.4, batterRH: true,
    },
  },
  '⚡ Bumrah — the Vizag yorker': {
    meta: 'Visakhapatnam · 2024, 2nd Test · ~140 km/h (estimate) · Pope b Bumrah 23',
    story: "Vizag, Day 2: Bumrah summons reverse from a hard old ball and bends a yorker back through Ollie Pope before his bat can come down — middle and leg uprooted in a series-turning thunderbolt.",
    params: {
      speedKph: 142, brand: 'sg', ballType: 'red', ageOvers: 40, shine: 0.3,
      seamAngleDeg: 16, spinPreset: 'seam (backspin)', spinRpm: 1100, lengthM: 1.2, lineM: 0.0,
      grass: 0.05, hardness: 0.62, dryness: 0.85, cloud: 0.5, batterRH: true,
    },
  },
  '☠️ Holding — the over from hell': {
    meta: 'Kensington Oval, Barbados · 1981, 3rd Test · ~145 km/h (era estimate) · Boycott b Holding 0',
    story: "Whispering Death's first over to a 40-year-old Boycott on a green Bridgetown deck: five rising thunderbolts that beat the bat and thudded into the body, then a full sixth that uprooted off stump and sent it cartwheeling 20 yards.",
    params: {
      speedKph: 145, brand: 'dukes', ballType: 'red', ageOvers: 1, shine: 0.92,
      seamAngleDeg: -6, spinPreset: 'seam (backspin)', spinRpm: 1100, lengthM: 3.6, lineM: 0.05,
      grass: 0.7, hardness: 0.85, dryness: 0.05, cloud: 0.3, batterRH: true,
    },
  },
};

const fmt = (v, d = 1) => (v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d));

export function setupUI(params, { onBowl, onReplay, onParamsChanged, onCamera }) {
  const gui = new GUI({ title: '🏏 Delivery Lab' });

  const storyEl = document.getElementById('story');
  const showStory = (entry) => {
    if (!storyEl) return;
    if (!entry) { storyEl.style.display = 'none'; return; }
    storyEl.innerHTML =
      `<div class="sname">${entry.name}</div>` +
      `<div class="smeta">${entry.meta}</div>` +
      `<div class="stext">${entry.story}</div>`;
    storyEl.style.display = 'block';
  };

  // 🏆 Famous deliveries — a SEPARATE category from the lab presets below.
  // Selecting one resets to defaults then applies the researched, engine-tuned
  // parameters so the historical ball reproduces exactly, and shows its story.
  const FAMOUS_PLACEHOLDER = '— pick a famous delivery —';
  const famousState = { delivery: FAMOUS_PLACEHOLDER };
  gui.add(famousState, 'delivery', [FAMOUS_PLACEHOLDER, ...Object.keys(FAMOUS_DELIVERIES)])
    .name('🏆 famous delivery')
    .onChange((name) => {
      const entry = FAMOUS_DELIVERIES[name];
      if (!entry) { showStory(null); return; }
      Object.assign(params, defaultParams, entry.params, {
        slowMo: params.slowMo, keepTrails: params.keepTrails,
        followBall: params.followBall, camera: params.camera,
      });
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      showStory({ name, meta: entry.meta, story: entry.story });
      onParamsChanged();
      onBowl();
    });

  const presetState = { preset: 'New-ball outswinger (135k)' };
  gui.add(presetState, 'preset', Object.keys(PRESETS)).name('🧪 lab preset').onChange((name) => {
    Object.assign(params, PRESETS[name]);
    famousState.delivery = FAMOUS_PLACEHOLDER;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    showStory(null);
    onParamsChanged();
    onBowl();
  });

  const fD = gui.addFolder('🎯 Delivery');
  fD.add(params, 'speedKph', 60, 165, 0.5).name('release speed (kph)');
  fD.add(params, 'aimMode', ['target (length & line)', 'manual release angles']).name('aim mode');
  fD.add(params, 'lengthM', 0.2, 12, 0.1).name('length (m from stumps)');
  fD.add(params, 'lineM', -1.2, 1.2, 0.01).name('line (m, + = leg side)');
  fD.add(params, 'elevationDeg', -20, 8, 0.1).name('manual: elevation °');
  fD.add(params, 'azimuthDeg', -6, 6, 0.05).name('manual: azimuth °');

  const fB = gui.addFolder('🧍 Bowler');
  fB.add(params, 'bowlerHeight', 1.55, 2.10, 0.01).name('height (m)');
  fB.add(params, 'releaseExtra', 0, 0.35, 0.01).name('jump at release (m)');
  fB.add(params, 'releaseZ', -1.2, 1.2, 0.01).name('crease position (m)');
  fB.add(params, 'batterRH').name('right-hand batter');

  const fBall = gui.addFolder('🔴 Ball');
  fBall.add(params, 'ballType', ['red', 'white', 'pink']).name('ball');
  fBall.add(params, 'brand', ['dukes', 'kookaburra', 'sg']).name('make');
  fBall.add(params, 'ageOvers', 0, 80, 1).name('age (overs)');
  fBall.add(params, 'shine', 0, 1, 0.01).name('shine maintained');
  fBall.add(params, 'shinySideLeg').name('shiny side: leg (RH bat)');
  fBall.add(params, 'seamAngleDeg', -45, 45, 1).name('seam angle ° (+leg)');
  fBall.add(params, 'wobble', 0, 1, 0.01).name('seam wobble');

  const fS = gui.addFolder('🌀 Spin');
  fS.add(params, 'spinPreset', [
    'seam (backspin)', 'leg-break', 'off-break', 'top-spinner', 'googly',
    'flipper / back-spin', 'arm ball / drifter', 'custom',
  ]).name('grip / wrist');
  fS.add(params, 'spinRpm', 0, 3200, 10).name('revs (rpm)');
  fS.add(params, 'spinAzimuthDeg', 0, 360, 1).name('custom axis az °');
  fS.add(params, 'spinElevationDeg', -80, 80, 1).name('custom axis elev °');

  const fW = gui.addFolder('🌦 Conditions');
  fW.add(params, 'tempC', 0, 45, 0.5).name('temperature °C');
  fW.add(params, 'humidity', 0, 100, 1).name('humidity %');
  fW.add(params, 'pressureHPa', 850, 1045, 1).name('pressure hPa');
  fW.add(params, 'cloud', 0, 1, 0.01).name('cloud cover');
  fW.add(params, 'cloudAssist', 0, 0.5, 0.01).name('cloud swing assist');
  fW.add(params, 'windKph', 0, 45, 0.5).name('wind (kph)');
  fW.add(params, 'windDirDeg', 0, 360, 1).name('wind direction °');

  const fP = gui.addFolder('🟩 Pitch');
  fP.add(params, 'grass', 0, 1, 0.01).name('grass cover');
  fP.add(params, 'hardness', 0, 1, 0.01).name('hardness');
  fP.add(params, 'dryness', 0, 1, 0.01).name('wear / dryness');

  const fV = gui.addFolder('📺 Playback');
  fV.add(params, 'slowMo', 0.03, 1, 0.01).name('playback speed ×');
  fV.add(params, 'keepTrails').name('overlay previous balls');
  fV.add(params, 'followBall').name('follow-ball camera');
  fV.add(params, 'camera', [
    'Broadcast', 'Bowler run-up', 'Batter eye', 'Keeper', 'Side-on', 'Umpire', 'Overhead',
  ]).name('camera').onChange(onCamera);

  fW.close(); fP.close(); fS.close(); fB.close(); fV.close();

  gui.onChange(() => onParamsChanged());

  document.getElementById('bowlBtn').addEventListener('click', onBowl);
  document.getElementById('replayBtn').addEventListener('click', onReplay);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); onBowl(); }
    if (e.code === 'KeyR') onReplay();
  });

  return gui;
}

export function renderResults(result, params) {
  const m = result.metrics;
  const el = document.getElementById('results');
  const side = (v, flip = false) => {
    const s = flip ? -v : v;
    if (Math.abs(v) < 0.05) return '';
    const leg = params.batterRH ? 'leg' : 'off';
    const off = params.batterRH ? 'off' : 'leg';
    return s > 0 ? ` → ${leg}` : ` → ${off}`;
  };
  const rows = [
    ['Release', `${fmt(m.releaseKph)} kph from ${fmt(m.releaseH, 2)} m`],
    ['Air density', `${fmt(m.rho, 3)} kg/m³`],
    ['Movement in air', m.swingCm !== undefined ? `${fmt(Math.abs(m.swingCm))} cm${side(m.swingCm)}` : '—'],
    ['Pitched', m.bounceLenM !== undefined ? `${fmt(m.bounceLenM)} m — ${m.lengthLabel}` : m.lengthLabel],
    ['Speed at bounce', m.kphAtBounce ? `${fmt(m.kphAtBounce)} kph` : '—'],
    ['Off the pitch', m.turnDeg !== undefined
      ? `${fmt(Math.abs(m.turnDeg))}°${side(m.turnDeg)}${m.kickCm && Math.abs(m.kickCm) > 1 ? ` (seam ${fmt(Math.abs(m.kickCm), 0)} cm)` : ''}${m.gripped ? ' · gripped' : ' · skidded'}`
      : '—'],
    ['Pace off pitch', m.paceOffPitch ? `${fmt(m.paceOffPitch, 0)}% retained` : '—'],
    ['At the batter', m.kphAtBatsman ? `${fmt(m.kphAtBatsman)} kph, ${fmt(m.heightAtBatsman, 2)} m high` : '—'],
    ['At the stumps', m.heightAtStumps !== undefined ? `${fmt(m.heightAtStumps, 2)} m high, ${fmt(Math.abs(m.lineAtStumps * 100), 0)} cm${side(m.lineAtStumps)}` : '—'],
  ];
  el.innerHTML =
    `<div class="verdict ${m.hitStumps ? 'out' : ''}">${m.hitStumps ? '🎯 BOWLED HIM!' : 'Delivery complete'}</div>` +
    rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  el.style.display = 'block';
}
