/* ============================================================
   Sakib Ahmed — Navigable Map
   assets/js/map/world.js
   ------------------------------------------------------------
   The WebGL half. Owns the Three.js scene, the camera rig, the
   render loop and hit-testing. Knows nothing about the DOM
   panel or the copy — it takes the graph, draws it, and reports
   where every node landed on screen so ui.js can pin a label
   there.

   Deliberate choices worth knowing:

   · Lines use a ShaderMaterial, not LineBasicMaterial, for two
     reasons: per-vertex alpha (edge weight) and a distance fade
     that works in both themes. WebGL ignores lineWidth, so edge
     importance is carried entirely by brightness.
   · NormalBlending everywhere structural. Additive looks better
     on the dark theme but disappears on a light background, and
     the light theme is not a second-class citizen here.
   · 28 nodes means individual meshes are cheaper to reason about
     than InstancedMesh, and per-node scale animation stays easy.
   ============================================================ */

import * as THREE from '../vendor/three.module.min.js';
import { NODES, EDGES, TYPES, THEME, EDGE_KINDS, BY_ID, NEIGHBOURS } from './graph.js';

/* ── shaders ────────────────────────────────────────────────── */

const LINE_VERT = `
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uNear;
  uniform float uFar;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = -mv.z;
    float fade = 1.0 - smoothstep(uNear, uFar, depth);
    vAlpha = aAlpha * mix(0.12, 1.0, fade);
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = `
  uniform float uOpacity;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * uOpacity);
  }
`;

const PULSE_VERT = `
  attribute vec3  aColor;
  attribute float aAlpha;
  attribute float aSize;
  uniform float uScale;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * uScale / max(-mv.z, 0.001), 22.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const PULSE_FRAG = `
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`;

/* ── helpers ────────────────────────────────────────────────── */

/** Soft radial blob, generated once, used for node halos and dust. */
function haloTexture() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  /* Kept deliberately faint: ~30 of these overlap near the centre and
     additive blending sums them. A hotter gradient turns the whole
     graph into one white blob and the edges stop reading.            */
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.16, 'rgba(255,255,255,0.30)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.07)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ── world ──────────────────────────────────────────────────── */

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {Map<string,{x,y,z}>} opts.positions   from graph.layout()
 * @param {boolean} opts.reduceMotion
 * @param {(id:string|null)=>void} opts.onHover
 * @param {(id:string)=>void} opts.onSelect
 * @param {(screen:Map)=>void} opts.onFrame      called once per rendered frame
 */
export function createWorld(opts) {
  const canvas = opts.canvas;
  const positions = opts.positions;
  const reduceMotion = !!opts.reduceMotion;

  /* --- renderer (throws if WebGL is unavailable; boot.js catches) --- */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 520);

  let mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  let palette = THEME[mode];

  /* ── nodes ─────────────────────────────────────────────────── */

  const HALO = haloTexture();
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  const shared = {
    geo: {
      core: new THREE.IcosahedronGeometry(1, 3),
      hub:  new THREE.IcosahedronGeometry(1, 2),
      dot:  new THREE.IcosahedronGeometry(1, 1),
    },
  };

  /** id → { node, group, mesh, halo, base, phase, pos } */
  const items = new Map();
  const pickable = [];

  NODES.forEach(function (n, i) {
    const p = positions.get(n.id);
    const spec = TYPES[n.type];
    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);

    const geo = n.type === 'core' ? shared.geo.core
      : n.type === 'domain' ? shared.geo.hub
      : shared.geo.dot;

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: palette[n.type],
        transparent: true,
        opacity: mode === 'dark' ? 0.92 : 0.96,
      })
    );
    mesh.scale.setScalar(spec.size);
    mesh.userData.id = n.id;
    group.add(mesh);
    pickable.push(mesh);

    /* wireframe shell — gives the spheres structure instead of flat discs */
    const shell = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: palette[n.type],
        wireframe: true,
        transparent: true,
        opacity: mode === 'dark' ? 0.22 : 0.16,
        depthWrite: false,
      })
    );
    shell.scale.setScalar(spec.size * 1.55);
    group.add(shell);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: HALO,
        color: palette[n.type],
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: mode === 'dark' ? 0.3 : 0.14,
        blending: mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
      })
    );
    const haloScale = spec.size * (n.type === 'core' ? 3.2 : 2.3);
    halo.scale.setScalar(haloScale);
    group.add(halo);

    nodeGroup.add(group);
    items.set(n.id, {
      node: n,
      group: group,
      mesh: mesh,
      shell: shell,
      halo: halo,
      base: spec.size,
      haloBase: haloScale,
      phase: i * 0.7,
      pos: new THREE.Vector3(p.x, p.y, p.z),
      dim: 1,
    });
  });

  /* ── edges ─────────────────────────────────────────────────── */

  const liveEdges = EDGES.filter(function (e) {
    return positions.has(e[0]) && positions.has(e[1]);
  });

  const edgeGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(liveEdges.length * 6);
  const eCol = new Float32Array(liveEdges.length * 6);
  const eAlp = new Float32Array(liveEdges.length * 2);

  const tmpColor = new THREE.Color();

  liveEdges.forEach(function (e, i) {
    const A = positions.get(e[0]);
    const B = positions.get(e[1]);
    ePos[i * 6 + 0] = A.x; ePos[i * 6 + 1] = A.y; ePos[i * 6 + 2] = A.z;
    ePos[i * 6 + 3] = B.x; ePos[i * 6 + 4] = B.y; ePos[i * 6 + 5] = B.z;
  });

  edgeGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  edgeGeo.setAttribute('aColor', new THREE.BufferAttribute(eCol, 3));
  edgeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(eAlp, 1));

  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: {
      uNear: { value: 42 },
      uFar: { value: 165 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
  });

  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  scene.add(edgeLines);

  /** Repaint every edge. `focusId` brightens its neighbourhood and mutes the rest. */
  function paintEdges(focusId) {
    liveEdges.forEach(function (e, i) {
      const kind = EDGE_KINDS[e[2]] || { weight: 0.16, from: 'project' };
      const touches = !focusId || e[0] === focusId || e[1] === focusId;

      tmpColor.setHex(palette[kind.from] || palette.project);
      if (mode === 'light') tmpColor.multiplyScalar(0.85);

      let a = kind.weight;
      if (focusId) a = touches ? Math.min(1, kind.weight * 3.2 + 0.25) : kind.weight * 0.22;
      if (mode === 'light') a *= 1.35;

      for (let v = 0; v < 2; v++) {
        eCol[i * 6 + v * 3 + 0] = tmpColor.r;
        eCol[i * 6 + v * 3 + 1] = tmpColor.g;
        eCol[i * 6 + v * 3 + 2] = tmpColor.b;
        eAlp[i * 2 + v] = a;
      }
    });
    edgeGeo.attributes.aColor.needsUpdate = true;
    edgeGeo.attributes.aAlpha.needsUpdate = true;
  }
  paintEdges(null);

  /* ── pulses — signal travelling the graph ──────────────────── */
  /* This is the "living organism" bit: each pulse rides one edge,
     wraps at the end, and re-picks a random edge. Off entirely
     under prefers-reduced-motion.                                */

  const PULSE_N = reduceMotion ? 0 : Math.min(liveEdges.length * 2, 130);
  let pulses = null;
  let pulseGeo = null;
  let pulseAttr = null;

  if (PULSE_N > 0) {
    pulses = [];
    const pPos = new Float32Array(PULSE_N * 3);
    const pCol = new Float32Array(PULSE_N * 3);
    const pAlp = new Float32Array(PULSE_N);
    const pSize = new Float32Array(PULSE_N);

    for (let i = 0; i < PULSE_N; i++) {
      const ei = i % liveEdges.length;
      pulses.push({
        edge: ei,
        t: Math.random(),
        speed: 0.055 + Math.random() * 0.13,
      });
      const kind = EDGE_KINDS[liveEdges[ei][2]] || { from: 'project' };
      tmpColor.setHex(palette[kind.from] || palette.project);
      pCol[i * 3] = tmpColor.r; pCol[i * 3 + 1] = tmpColor.g; pCol[i * 3 + 2] = tmpColor.b;
      pAlp[i] = 0.55 + Math.random() * 0.45;
      pSize[i] = 0.3 + Math.random() * 0.36;
    }

    pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pulseGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
    pulseGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlp, 1));
    pulseGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
    pulseAttr = pulseGeo.attributes;

    const pulseMat = new THREE.ShaderMaterial({
      vertexShader: PULSE_VERT,
      fragmentShader: PULSE_FRAG,
      uniforms: { uScale: { value: 1000 } },
      transparent: true,
      depthWrite: false,
      blending: mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    scene.add(new THREE.Points(pulseGeo, pulseMat));
    scene.userData.pulseMat = pulseMat;
  }

  /* ── dust — parallax depth cue ─────────────────────────────── */

  const DUST_N = 620;
  const dPos = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N; i++) {
    const r = 58 + Math.random() * 150;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dPos[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 96;
    dPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dustMat = new THREE.PointsMaterial({
    map: HALO,
    size: 0.85,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    opacity: mode === 'dark' ? 0.5 : 0.28,
    color: mode === 'dark' ? 0x9fb4d8 : 0x5d6b88,
    blending: mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ── camera rig ────────────────────────────────────────────── */
  /* Spherical orbit around a movable target, everything damped.
     No OrbitControls: fly-to needs to drive target and radius
     together, and hand-rolling it is ~40 lines.                  */

  const rig = {
    theta: 0.72, phi: 1.16, radius: 72,
    tTheta: 0.72, tPhi: 1.16, tRadius: 72,
    target: new THREE.Vector3(0, 0, 0),
    tTarget: new THREE.Vector3(0, 0, 0),
    autoSpin: !reduceMotion,
  };

  const MIN_R = 18, MAX_R = 165;
  const HOME_R = 72;

  /* The FOV is vertical, so a portrait viewport shows less of the graph
     horizontally and crops it. Pull back as the frame narrows.        */
  function aspectScale() {
    const a = camera.aspect || 1;
    return a < 0.7 ? 1.9 : a < 1.0 ? 1.5 : a < 1.35 ? 1.15 : 1;
  }
  const MIN_PHI = 0.28, MAX_PHI = Math.PI - 0.28;

  function applyCamera() {
    const sp = Math.sin(rig.phi), cp = Math.cos(rig.phi);
    camera.position.set(
      rig.target.x + rig.radius * sp * Math.cos(rig.theta),
      rig.target.y + rig.radius * cp,
      rig.target.z + rig.radius * sp * Math.sin(rig.theta)
    );
    camera.lookAt(rig.target);
  }

  /* ── input ─────────────────────────────────────────────────── */

  const pointer = new THREE.Vector2(-9999, -9999);
  const ray = new THREE.Raycaster();
  let hovered = null;
  let selected = null;
  let dragging = false;
  let moved = 0;
  let last = { x: 0, y: 0 };
  let idleAt = performance.now();
  let pinchFrom = 0;

  function markActive() { idleAt = performance.now(); }

  function pointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    moved = 0;
    last.x = e.clientX;
    last.y = e.clientY;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    markActive();
  }

  function pointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;

    if (dragging) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      rig.tTheta -= dx * 0.0055;
      rig.tPhi = clamp(rig.tPhi - dy * 0.0045, MIN_PHI, MAX_PHI);
      last.x = e.clientX;
      last.y = e.clientY;
      markActive();
    }
  }

  function pointerUp(e) {
    const wasDrag = moved > 6;
    dragging = false;
    try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!wasDrag) {
      /* a tap, not an orbit — treat as selection */
      if (hovered) select(hovered);
      else deselect();
    }
    markActive();
  }

  function wheel(e) {
    e.preventDefault();
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    rig.tRadius = clamp(rig.tRadius * (1 + clamp(step, -220, 220) * 0.0012), MIN_R, MAX_R);
    markActive();
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove, { passive: true });
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', function () { dragging = false; });
  canvas.addEventListener('pointerleave', function () {
    pointer.x = pointer.y = -9999;
  });
  canvas.addEventListener('wheel', wheel, { passive: false });

  /* pinch zoom */
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      pinchFrom = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      dragging = false;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && pinchFrom > 0) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      rig.tRadius = clamp(rig.tRadius * (pinchFrom / (d || 1)), MIN_R, MAX_R);
      pinchFrom = d;
      markActive();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function () { pinchFrom = 0; });

  /* ── selection ─────────────────────────────────────────────── */

  function select(id) {
    if (!items.has(id)) return;
    selected = id;
    paintEdges(id);

    const near = new Set([id]);
    (NEIGHBOURS.get(id) || []).forEach(function (e) { near.add(e.id); });
    items.forEach(function (it, key) { it.dim = near.has(key) ? 1 : 0.28; });

    flyTo(id);
    if (opts.onSelect) opts.onSelect(id);
  }

  function deselect() {
    if (selected === null) return;
    selected = null;
    paintEdges(null);
    items.forEach(function (it) { it.dim = 1; });
    if (opts.onSelect) opts.onSelect(null);
  }

  function flyTo(id) {
    const it = items.get(id);
    if (!it) return;
    rig.tTarget.copy(it.pos);
    const t = it.node.type;
    rig.tRadius = (t === 'core' ? 52 : t === 'domain' ? 38 : 30) * aspectScale();
    if (reduceMotion) {
      /* no swooping — arrive immediately */
      rig.target.copy(rig.tTarget);
      rig.radius = rig.tRadius;
      rig.theta = rig.tTheta;
      rig.phi = rig.tPhi;
    }
  }

  function home() {
    rig.tTarget.set(0, 0, 0);
    rig.tRadius = HOME_R * aspectScale();
    rig.tPhi = 1.16;
    if (reduceMotion) {
      rig.target.set(0, 0, 0);
      rig.radius = rig.tRadius;
      rig.phi = 1.16;
    }
    deselect();
  }

  /* ── resize ────────────────────────────────────────────────── */

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();

    if (selected === null) rig.tRadius = clamp(HOME_R * aspectScale(), MIN_R, MAX_R);
    if (scene.userData.pulseMat) {
      /* pixels = worldDiameter * (h/2) / (tan(fov/2) * depth) */
      const t = Math.tan((camera.fov * Math.PI) / 360);
      scene.userData.pulseMat.uniforms.uScale.value = (h / 2) / t;
    }
  }

  let rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 140);
  });

  /* ── frame loop ────────────────────────────────────────────── */

  const screen = new Map();
  const projected = new THREE.Vector3();
  let raf = null;
  let visible = true;
  let clock = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    clock += 0.016;

    /* idle auto-spin: only once the pointer has been quiet a while,
       and never when something is selected — that would fight the user */
    if (rig.autoSpin && !dragging && selected === null && now - idleAt > 3200) {
      rig.tTheta += 0.00075;
    }

    /* damping */
    const k = reduceMotion ? 1 : 0.075;
    rig.theta  += (rig.tTheta - rig.theta) * k;
    rig.phi    += (rig.tPhi - rig.phi) * k;
    rig.radius += (rig.tRadius - rig.radius) * k;
    rig.target.lerp(rig.tTarget, reduceMotion ? 1 : 0.06);
    applyCamera();

    /* hit-test — skipped mid-drag, no point */
    if (!dragging && pointer.x > -9000) {
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects(pickable, false);
      const id = hits.length ? hits[0].object.userData.id : null;
      if (id !== hovered) {
        hovered = id;
        canvas.style.cursor = id ? 'pointer' : 'grab';
        if (opts.onHover) opts.onHover(id);
      }
    }

    /* node breathing + hover/selection response */
    items.forEach(function (it) {
      const isHot = it.node.id === hovered || it.node.id === selected;
      const breathe = reduceMotion ? 1 : 1 + Math.sin(clock * 0.9 + it.phase) * 0.045;
      const want = it.base * breathe * (isHot ? 1.42 : 1);
      it.mesh.scale.setScalar(it.mesh.scale.x + (want - it.mesh.scale.x) * 0.18);
      it.shell.scale.setScalar(it.mesh.scale.x * 1.55);
      it.shell.rotation.y += reduceMotion ? 0 : 0.0022;
      it.shell.rotation.x += reduceMotion ? 0 : 0.0011;

      const haloWant = it.haloBase * (isHot ? 1.3 : 1) * breathe;
      it.halo.scale.setScalar(it.halo.scale.x + (haloWant - it.halo.scale.x) * 0.18);

      const baseOp = mode === 'dark' ? 0.92 : 0.96;
      const wantOp = baseOp * it.dim;
      it.mesh.material.opacity += (wantOp - it.mesh.material.opacity) * 0.14;
      it.shell.material.opacity += ((mode === 'dark' ? 0.22 : 0.16) * it.dim - it.shell.material.opacity) * 0.14;
      const haloTarget = (mode === 'dark' ? 0.3 : 0.14) * it.dim * (isHot ? 1.8 : 1);
      it.halo.material.opacity += (haloTarget - it.halo.material.opacity) * 0.14;
    });

    /* pulses ride their edges */
    if (pulses) {
      const arr = pulseAttr.position.array;
      for (let i = 0; i < pulses.length; i++) {
        const pu = pulses[i];
        pu.t += pu.speed * 0.016;
        if (pu.t > 1) {
          pu.t = 0;
          pu.edge = (Math.random() * liveEdges.length) | 0;
          const kind = EDGE_KINDS[liveEdges[pu.edge][2]] || { from: 'project' };
          tmpColor.setHex(palette[kind.from] || palette.project);
          pulseAttr.aColor.array[i * 3]     = tmpColor.r;
          pulseAttr.aColor.array[i * 3 + 1] = tmpColor.g;
          pulseAttr.aColor.array[i * 3 + 2] = tmpColor.b;
          pulseAttr.aColor.needsUpdate = true;
        }
        const e = liveEdges[pu.edge];
        const A = positions.get(e[0]), B = positions.get(e[1]);
        const t = pu.t;
        arr[i * 3]     = A.x + (B.x - A.x) * t;
        arr[i * 3 + 1] = A.y + (B.y - A.y) * t;
        arr[i * 3 + 2] = A.z + (B.z - A.z) * t;
      }
      pulseAttr.position.needsUpdate = true;
    }

    if (!reduceMotion) {
      dust.rotation.y += 0.00035;
      nodeGroup.rotation.y = Math.sin(clock * 0.06) * 0.012;
    }

    renderer.render(scene, camera);

    /* --- report screen positions for the DOM labels --- */
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    items.forEach(function (it, id) {
      projected.copy(it.pos);
      /* account for the whole-graph sway so labels don't drift off their nodes */
      projected.applyMatrix4(nodeGroup.matrixWorld);
      const dist = camera.position.distanceTo(projected);
      projected.project(camera);
      const behind = projected.z > 1;
      let rec = screen.get(id);
      if (!rec) { rec = {}; screen.set(id, rec); }
      rec.x = (projected.x * 0.5 + 0.5) * w;
      rec.y = (-projected.y * 0.5 + 0.5) * h;
      rec.visible = !behind && projected.x > -1.25 && projected.x < 1.25 &&
                    projected.y > -1.25 && projected.y < 1.25;
      rec.dist = dist;
      rec.dim = it.dim;
      rec.hot = id === hovered || id === selected;
    });
    if (opts.onFrame) opts.onFrame(screen, { hovered: hovered, selected: selected });
  }

  function start() { if (!raf && visible) { idleAt = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    visible ? start() : stop();
  });

  /* ── theme ─────────────────────────────────────────────────── */

  function setTheme(next) {
    mode = next === 'light' ? 'light' : 'dark';
    palette = THEME[mode];

    items.forEach(function (it) {
      const c = palette[it.node.type];
      it.mesh.material.color.setHex(c);
      it.shell.material.color.setHex(c);
      it.halo.material.color.setHex(c);
      it.halo.material.blending = mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      it.halo.material.needsUpdate = true;
    });

    dustMat.color.setHex(mode === 'dark' ? 0x9fb4d8 : 0x5d6b88);
    dustMat.opacity = mode === 'dark' ? 0.5 : 0.28;
    dustMat.blending = mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    dustMat.needsUpdate = true;

    if (scene.userData.pulseMat) {
      scene.userData.pulseMat.blending = mode === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      scene.userData.pulseMat.needsUpdate = true;
    }

    paintEdges(selected);
  }

  /* ── nudge helpers, used by keyboard control in ui.js ──────── */

  function orbitBy(dTheta, dPhi) {
    rig.tTheta += dTheta;
    rig.tPhi = clamp(rig.tPhi + dPhi, MIN_PHI, MAX_PHI);
    markActive();
  }

  function zoomBy(factor) {
    rig.tRadius = clamp(rig.tRadius * factor, MIN_R, MAX_R);
    markActive();
  }

  resize();
  rig.radius = rig.tRadius;   // start at the fitted distance, don't zoom out on load
  applyCamera();

  return {
    start: start,
    stop: stop,
    resize: resize,
    select: select,
    deselect: deselect,
    home: home,
    setTheme: setTheme,
    orbitBy: orbitBy,
    zoomBy: zoomBy,
    getSelected: function () { return selected; },
    getHovered: function () { return hovered; },
  };
}
