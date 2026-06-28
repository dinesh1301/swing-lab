// Procedural canvas textures: the ball (leather, lacquer, stitched seam,
// polished vs scuffed halves) and the pitch strip (grass cover → bare brown →
// cracked day-5 dust).

import * as THREE from 'three';

const BALL_COLOURS = {
  red:   { base: '#9e2218', shineTint: '#c03425', seam: '#e9e0c4', dirt: '#6e3a2c' },
  white: { base: '#e8e6df', shineTint: '#f7f6f2', seam: '#2e4d2c', dirt: '#9a9484' },
  pink:  { base: '#e4486e', shineTint: '#f15f86', seam: '#1d1d1d', dirt: '#9c4a52' },
};

// Equirectangular layout, 1024×512. The seam runs along the equator (v=0.5);
// the v<0.5 hemisphere is the "north" (+Y local) half.
// shinyNorth selects which half gets the lacquered finish.
export function makeBallTextures({ ballType, ageOvers, shine, shinyNorth }) {
  const C = BALL_COLOURS[ballType] ?? BALL_COLOURS.red;
  const wear = Math.min(1, ageOvers / 50);
  const W = 1024, H = 512;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const rcv = document.createElement('canvas');
  rcv.width = W; rcv.height = H;
  const rg = rcv.getContext('2d');

  const rough = { shiny: 0.13 + 0.5 * wear * (1 - 0.82 * shine), rough: 0.28 + 0.6 * wear };

  for (const north of [true, false]) {
    const isShiny = north === shinyNorth;
    const y0 = north ? 0 : H / 2;

    // base leather
    g.fillStyle = isShiny ? C.shineTint : C.base;
    g.fillRect(0, y0, W, H / 2);

    // wear: scuffs and dirt on the unpolished half, light marks on the other
    const scuffs = isShiny ? wear * (1 - 0.7 * shine) * 250 : wear * 900;
    for (let i = 0; i < scuffs; i++) {
      const x = Math.random() * W;
      const y = y0 + Math.random() * (H / 2);
      g.fillStyle = Math.random() < 0.5 ? C.dirt : 'rgba(0,0,0,0.18)';
      g.globalAlpha = 0.08 + Math.random() * 0.25;
      const s = 1 + Math.random() * 5;
      g.fillRect(x, y, s, s * (0.4 + Math.random()));
    }
    g.globalAlpha = 1;

    // roughness map: dark = glossy
    const rv = isShiny ? rough.shiny : rough.rough;
    rg.fillStyle = `rgb(${rv * 255},${rv * 255},${rv * 255})`;
    rg.fillRect(0, y0, W, H / 2);
    for (let i = 0; i < (isShiny ? 120 : 600) * wear; i++) {
      rg.fillStyle = 'rgba(255,255,255,0.25)';
      rg.fillRect(Math.random() * W, y0 + Math.random() * (H / 2), 2, 2);
    }
  }

  // quarter seams (subtle embossed lines at v=0.25, v=0.75)
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (const v of [0.25, 0.75]) {
    g.beginPath(); g.moveTo(0, v * H); g.lineTo(W, v * H); g.stroke();
  }

  // primary seam: 6 rows of stitching around the equator
  const seamHalf = 0.045 * H; // proud stitched band
  g.fillStyle = C.base === '#e8e6df' ? '#d8d5c8' : 'rgba(0,0,0,0.30)';
  g.fillRect(0, H / 2 - seamHalf, W, seamHalf * 2);
  g.strokeStyle = C.seam;
  g.lineWidth = 3;
  for (let row = 0; row < 6; row++) {
    const y = H / 2 - seamHalf + (row + 0.5) * ((seamHalf * 2) / 6);
    g.beginPath();
    for (let x = 0; x <= W; x += 14) {
      const dy = (row % 2 ? 1 : -1) * 3.2;
      if (x === 0) g.moveTo(x, y + dy);
      else g.lineTo(x, y + ((x / 14) % 2 ? dy : -dy));
    }
    g.stroke();
  }
  // seam is matte
  rg.fillStyle = 'rgb(170,170,170)';
  rg.fillRect(0, H / 2 - seamHalf, W, seamHalf * 2);

  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(rcv);
  return { map, roughnessMap };
}

// ── pitch strip ──────────────────────────────────────────────────────────────
const lerpHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => {
    const va = (pa >> s) & 255, vb = (pb >> s) & 255;
    return Math.round(va + (vb - va) * t);
  });
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export function makePitchTexture({ grass, dryness }) {
  const W = 512, H = 2048;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const green = '#5d7f42', brown = '#a98e62', dust = '#c2ae85';
  const base = grass > 0 ? lerpHex(brown, green, Math.min(1, grass * 1.2))
                         : lerpHex(brown, dust, dryness);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  // mower stripes + soil mottling
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(255,255,255,${0.03 + 0.04 * grass})`;
    if (i % 2) g.fillRect((i * W) / 8, 0, W / 8, H);
  }
  for (let i = 0; i < 5200; i++) {
    const t = Math.random();
    g.fillStyle = t < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,240,0.05)';
    g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 2 + Math.random() * 7);
  }

  // bowlers' footmarks (rough patches near each end)
  g.fillStyle = `rgba(120,90,55,${0.25 + 0.45 * dryness})`;
  for (const end of [0.07, 0.93]) {
    for (let i = 0; i < 26; i++) {
      const x = W * (0.30 + Math.random() * 0.4);
      const y = H * (end + (Math.random() - 0.5) * 0.05);
      g.beginPath();
      g.ellipse(x, y, 8 + Math.random() * 18, 5 + Math.random() * 9, Math.random(), 0, 7);
      g.fill();
    }
  }

  // cracks on a dry surface
  if (dryness > 0.25) {
    g.strokeStyle = `rgba(60,42,25,${0.35 + 0.45 * dryness})`;
    const n = Math.floor(dryness * 42);
    for (let i = 0; i < n; i++) {
      let x = Math.random() * W, y = Math.random() * H;
      g.lineWidth = 0.8 + Math.random() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 9; s++) {
        x += (Math.random() - 0.5) * 36;
        y += (Math.random() - 0.3) * 50;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
