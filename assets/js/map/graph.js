/* ============================================================
   Sakib Ahmed — Navigable Map
   assets/js/map/graph.js
   ------------------------------------------------------------
   The content graph. This is the single source of truth for the
   map: every node, every connection, every word of copy shown in
   the detail panel. Nothing here is presentational — world.js
   renders it, ui.js writes it into the DOM.

   Node types
     core      the person at the centre
     domain    an engineering discipline  (the seven hubs)
     project   something actually built
     chapter   a period of time (work / education)
     frontier  an open question — where the work is heading

   Positions are NOT stored. They're grown at load time by
   layout() below: a fixed seed plus a short relaxation pass, so
   the arrangement is organic-looking but identical every visit.
   ============================================================ */

/* ── NODES ──────────────────────────────────────────────────── */

export const NODES = [
  /* ---------- core ---------- */
  {
    id: 'me',
    type: 'core',
    title: 'Sakib Ahmed',
    eyebrow: 'IoT & AI Systems Engineer',
    blurb:
      'Chattogram, Bangladesh. I take systems the whole way — sensor and PCB, firmware, ' +
      'connectivity, computer vision, backend APIs, dashboard — and get them running in ' +
      'production. Most engineers pick a layer. I have spent my career refusing to.',
    points: [
      'Electronics & Telecommunication Engineering, CUET — CGPA 3.71',
      'Currently IoT Engineer (R&D) at magnetismtech',
      'Seven domains that feed each other, not seven separate skills',
    ],
    chips: ['Embedded', 'Computer Vision', 'Edge AI', 'Backend', 'Electronics'],
    anchor: 'page.html#about',
  },

  /* ---------- domains ---------- */
  {
    id: 'embedded',
    type: 'domain',
    title: 'Embedded & IoT',
    eyebrow: 'Domain 01',
    blurb:
      'Firmware and device architecture for connected hardware — provisioning, streaming ' +
      'and staying alive on flaky networks.',
    chips: [
      'ESP32 / ESP32-S3', 'Embedded C/C++', 'Arduino', 'MQTT · Mosquitto',
      'Wi-Fi AP provisioning', 'NVS storage', 'I2C · SPI · I2S · UART', 'OTA & reconnection',
    ],
    anchor: 'page.html#expertise',
  },
  {
    id: 'vision',
    type: 'domain',
    title: 'Computer Vision & Edge AI',
    eyebrow: 'Domain 02',
    blurb:
      'Detection and OCR pipelines that run on real camera feeds, on real hardware, under ' +
      'real latency budgets.',
    chips: [
      'YOLOv8 / YOLO11 / YOLO26', 'ANPR & LPR', 'Bangla OCR', 'Dataset engineering · CVAT',
      'Model training & eval', 'ONNX Runtime', 'OpenVINO · TensorRT', 'RTSP multi-camera',
    ],
    anchor: 'page.html#expertise',
  },
  {
    id: 'ai',
    type: 'domain',
    title: 'NLP, RAG & Agentic AI',
    eyebrow: 'Domain 03 · growing',
    blurb:
      'The newest limb. Moving from consuming model APIs toward training and hosting my own — ' +
      'retrieval first, then tool-using agents.',
    chips: [
      'RAG', 'Embeddings', 'FAISS', 'Sentence Transformers',
      'Vector search', 'pgvector', 'Gemini API', 'Agentic AI',
    ],
    anchor: 'page.html#skills',
  },
  {
    id: 'backend',
    type: 'domain',
    title: 'Backend & Real-Time',
    eyebrow: 'Domain 04',
    blurb:
      'APIs and streaming layers built for devices, not just browsers — where a dropped frame ' +
      'is a clinical or industrial problem.',
    chips: [
      'Python', 'Django · DRF', 'FastAPI', 'WebSockets · SSE',
      'REST · JWT', 'PostgreSQL · Redis', 'Daphne · Uvicorn', 'Laravel integration',
    ],
    anchor: 'page.html#expertise',
  },
  {
    id: 'frontend',
    type: 'domain',
    title: 'Full-Stack Web',
    eyebrow: 'Domain 05',
    blurb:
      'Operator dashboards and product frontends — the surface where all that device data ' +
      'finally becomes useful.',
    chips: [
      'React · Vite', 'TypeScript', 'Next.js', 'Tailwind · Bootstrap',
      'Live data dashboards', 'Flutter', 'HTML5 · CSS3', 'API integration',
    ],
    anchor: 'page.html#expertise',
  },
  {
    id: 'devops',
    type: 'domain',
    title: 'DevOps & Deployment',
    eyebrow: 'Domain 06',
    blurb:
      'Getting it off the laptop and keeping it up — containers, pipelines, proxies and the ' +
      'Linux boxes underneath.',
    chips: [
      'Docker · Compose', 'GitHub Actions · GHCR', 'Linux · AlmaLinux', 'Apache reverse proxy',
      'SSH · VPS admin', 'CI/CD pipelines', 'Git & GitHub', 'Production debugging',
    ],
    anchor: 'page.html#expertise',
  },
  {
    id: 'rf',
    type: 'domain',
    title: 'Electronics & RF',
    eyebrow: 'Domain 07',
    blurb:
      'The layer most software engineers never touch — circuits, biomedical front-ends and ' +
      'antenna design.',
    chips: [
      'PCB design', 'Sensor interfacing', 'Biomedical electronics', 'MIMO & microstrip antennas',
      'CST Studio Suite', 'MATLAB', 'Cadence Virtuoso', 'Signal acquisition',
    ],
    anchor: 'page.html#expertise',
  },

  /* ---------- projects ---------- */
  {
    id: 'anpr',
    type: 'project',
    title: 'Industrial ANPR & Gate Monitoring',
    eyebrow: 'Flagship · Production · @magnetismtech',
    badge: 'Live',
    flagship: true,
    blurb:
      'An end-to-end computer-vision system for shipping and logistics gates. Vehicles are ' +
      'detected and read from live RTSP feeds, plates are recognised through a Bangla OCR ' +
      'pipeline, and the result is tied to an industrial weighing session.',
    arch: [
      'IP Cameras (RTSP)', 'YOLO vehicle detect', 'Plate detect', 'Character OCR',
      'Plate reconstruction', 'Backend + DB', 'Dashboard',
    ],
    points: [
      '24/7 gate-event cameras with a configurable virtual detection line and IN/OUT direction logic',
      'Conditional weight-session cameras bound to live scale readings',
      'Architected for multi-camera scale — up to 28 concurrent RTSP streams',
      'GPU and CPU inference paths for deployment flexibility on edge hardware',
    ],
    chips: ['Python', 'YOLOv8/11/26', 'OpenCV', 'FastAPI', 'RTSP', 'Docker', 'Linux', 'React'],
    note: 'Proprietary — built for a live logistics platform',
    anchor: 'page.html#work',
  },
  {
    id: 'bangla-ocr',
    type: 'project',
    title: 'Bangla Licence Plate OCR',
    eyebrow: 'Computer Vision · Model training',
    blurb:
      'A character-level OCR pipeline for Bangladeshi licence plates — trained from scratch ' +
      'rather than adapted from an off-the-shelf model, because Bangla script has no usable ' +
      'pretrained detector.',
    points: [
      '4,530 source images augmented to 33,511 training entries (~31% real)',
      '102-class Bangla character map with full class-alignment validation',
      'Trained on Tesla T4 — YOLO11s, 100 epochs, PyTorch + CUDA 12.8',
      'CVAT annotation workflow and dataset QA',
    ],
    chips: ['YOLOv8', 'YOLO11', 'YOLO26', 'Ultralytics', 'PyTorch', 'CVAT'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'container',
    type: 'project',
    title: 'Container Number Recognition',
    eyebrow: 'Computer Vision · Logistics',
    blurb:
      'Automated reading of shipping-container identification numbers from yard and gate ' +
      'cameras — a multi-stage detection cascade rather than a single model.',
    arch: ['Container', 'Number region', 'Characters', 'OCR', 'ID reconstruction'],
    points: [
      'Dataset of ~99,000 images across 20 classes',
      'Reached approximately 76% mAP on the detection stage',
      'Designed to plug directly into the existing logistics workflow',
    ],
    chips: ['YOLO', 'OCR', 'Python', 'OpenCV', 'Edge inference'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'medical',
    type: 'project',
    title: 'Medical Device Integration Platform',
    eyebrow: 'Healthcare platform · Production',
    badge: 'Live',
    flagship: true,
    blurb:
      'A backend platform connecting ESP32-based medical devices to a clinical EMR in real ' +
      'time. Devices register themselves, open sessions, and stream physiological data that ' +
      "reaches the clinician's browser with sub-second latency.",
    arch: [
      'ESP32 device', 'WebSocket / HTTP', 'Django + DRF', 'Stream processor',
      'SSE', 'Browser', 'Laravel EMR',
    ],
    points: [
      'Device registry, auto-registration and session lifecycle management',
      'WebSocket ingestion via Daphne behind an Apache mod_proxy_wstunnel reverse proxy',
      'Server-Sent Events fan-out for live in-browser waveform rendering',
      'Dockerised deployment: GitHub Actions → GHCR → Linux VPS, with PostgreSQL and Redis',
      'Diagnosed a silent-stream bug down through firmware timing → 240 req/min → a 120 req/min DRF throttle',
    ],
    chips: ['Django', 'DRF', 'Laravel', 'WebSockets', 'SSE', 'PostgreSQL', 'Redis', 'Docker', 'Apache', 'CI/CD'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'ecg',
    type: 'project',
    title: 'ESP32 ECG Acquisition Device',
    eyebrow: 'Embedded · Biomedical',
    blurb:
      'A connected ECG front-end built on the MAX30003 analog AFE, streaming clinical-grade ' +
      'waveform data off an ESP32 over Wi-Fi.',
    points: [
      '256 Hz continuous sampling with millivolt-calibrated output',
      'Custom binary packet protocol — 64 samples per POST, ~4 posts/second',
      'First-boot AP-mode provisioning with credentials persisted to NVS',
      'Automatic reconnection and heartbeat/keepalive handling',
    ],
    chips: ['ESP32', 'MAX30003', 'Embedded C++', 'SPI', 'WebSockets', 'Wi-Fi'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'steth',
    type: 'project',
    title: 'Digital Stethoscope',
    eyebrow: 'Embedded · Audio DSP',
    blurb:
      'A digital auscultation device capturing heart and lung sounds through an I2S MEMS ' +
      'microphone and streaming them live to a browser for clinician review.',
    points: [
      'INMP441 I2S microphone at 8 kHz and 44.1 kHz sample rates',
      'On-device DSP filtering tuned for the auscultation band',
      'Low-latency WebSocket audio streaming into the web platform',
      'Auto device-registry integration alongside the ECG hardware',
    ],
    chips: ['ESP32', 'INMP441', 'I2S', 'DSP', 'WebSockets', 'C++'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'weighbridge',
    type: 'project',
    title: 'Industrial Weighbridge Integration',
    eyebrow: 'Industrial integration',
    blurb:
      'Bringing a physical weighing scale into an AI logistics platform, so that a truck ' +
      'settling on the weighbridge is what triggers the vision pipeline.',
    points: [
      'Migrated the fleet from XK3190-D10 to Marques BM1000 hardware',
      'Direct RS232 serial over CH340 USB adapters — 9600 baud, 8N1, request mode',
      'Custom frame parser with a reconnection watchdog and maintenance mode',
      'Weight-stable events trigger camera capture and plate recognition',
    ],
    chips: ['Python', 'RS232', 'pySerial', 'Industrial hardware', 'FastAPI'],
    note: 'Proprietary',
    anchor: 'page.html#work',
  },
  {
    id: 'wearable',
    type: 'project',
    title: 'Multi-Sensor Health Wearable',
    eyebrow: 'Research prototype',
    blurb:
      'An ESP32 wearable fusing five biomedical sensors into a single continuous monitoring ' +
      'device — a research prototype, not a clinically validated instrument.',
    points: [
      'MAX30101 / MAX32664 optical front-end for heart rate and SpO₂',
      'MAX30003 ECG, DS18B20 body temperature, MPU6050 motion',
      'Accelerometer-based fall detection and respiratory-rate estimation',
      'On-device TFT interface via TFT_eSPI with IoT cloud upload',
    ],
    chips: ['ESP32', 'Sensor fusion', 'MQTT', 'TFT_eSPI', 'PPG', 'Embedded C++'],
    note: 'Research prototype',
    anchor: 'page.html#work',
  },
  {
    id: 'rag',
    type: 'project',
    title: 'University Notes RAG Assistant',
    eyebrow: 'NLP · Retrieval',
    blurb:
      'A retrieval-augmented question-answering system over academic PDFs, built in plain ' +
      'Python to understand the mechanics rather than hide them behind a framework.',
    arch: ['PDF', 'Chunking', 'Embeddings', 'FAISS', 'Retrieval', 'LLM'],
    points: [
      'Local all-MiniLM-L6-v2 embeddings — no external calls for indexing',
      'FAISS vector index tuned for modest local hardware',
      'Hosted LLM generation, keeping inference cost off the client machine',
    ],
    chips: ['Python', 'Sentence Transformers', 'FAISS', 'RAG', 'Gemini API'],
    note: 'Learning project',
    anchor: 'page.html#work',
  },
  {
    id: 'face',
    type: 'project',
    title: 'Automated Face Attendance',
    eyebrow: 'Computer Vision',
    blurb:
      'Real-time face-recognition attendance — enrolment, live identification from a webcam ' +
      'feed, and automatic attendance logging with duplicate suppression.',
    chips: ['Python', 'OpenCV', 'Face recognition', 'Real-time inference'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'ecom',
    type: 'project',
    title: 'Django + React E-Commerce',
    eyebrow: 'Full-stack',
    blurb:
      'A complete multi-vendor commerce system — the project where I worked through the full ' +
      'breadth of Django REST Framework rather than a CRUD demo.',
    points: [
      'JWT auth with a custom user model; vendor and customer roles',
      'Products, categories, reviews, wishlist, session and DB-backed carts',
      'Checkout, orders, payments and invoice generation',
      'Vendor dashboard with product and order management; filtering and price sliders',
    ],
    chips: ['Django', 'DRF', 'SimpleJWT', 'React', 'Vite', 'TypeScript', 'PostgreSQL'],
    note: 'Private repository',
    anchor: 'page.html#work',
  },
  {
    id: 'vision-kit',
    type: 'project',
    title: 'Real-Time Vision Toolkit',
    eyebrow: 'Computer Vision · Toolkit',
    blurb:
      'A series of real-time perception builds covering the classic CV interaction problems — ' +
      'each a standalone working system rather than a notebook.',
    points: [
      'Hand tracking and a gesture-controlled LED system (vision → hardware)',
      'Pose estimation, face mesh and face detection',
      'Emotion detection and sign-language recognition',
    ],
    chips: ['Python', 'OpenCV', 'MediaPipe', 'CNNs', 'Arduino'],
    note: 'Private repositories',
    anchor: 'page.html#work',
  },
  {
    id: 'antenna',
    type: 'project',
    title: 'Wrench-Shaped MIMO Antenna',
    eyebrow: 'Undergraduate thesis · RF',
    blurb:
      'My BSc thesis: a novel wrench-shaped MIMO antenna geometry designed for enhanced ' +
      'bandwidth and inter-element isolation in sub-6 GHz 5G bands, simulated in CST Studio Suite.',
    points: [
      'Full-wave electromagnetic simulation and parametric optimisation',
      'Isolation and envelope-correlation analysis across the operating band',
      'Companion work: circular microstrip patch array antenna for 2.3 GHz',
    ],
    chips: ['CST Studio Suite', 'MIMO', 'Microstrip', 'RF design', 'MATLAB'],
    note: 'Academic — CUET, 2024',
    anchor: 'page.html#work',
  },

  /* ---------- chapters ---------- */
  {
    id: 'magnetism',
    type: 'chapter',
    title: 'IoT Engineer — R&D',
    eyebrow: 'magnetismtech · Shipping & logistics technology',
    badge: 'Present',
    when: 'Present',
    blurb:
      'Building the intelligent layer of a live logistics platform: computer-vision gate ' +
      'systems, industrial hardware integration and the backend services connecting them. ' +
      'Also responsible for medical-device integration work.',
    points: [
      'Owned the ANPR/LPR pipeline from dataset and model training through to edge deployment',
      'Integrated industrial weighing hardware over serial into the AI capture workflow',
      'Built and deployed Django/FastAPI services with Docker, CI/CD and Linux VPS infrastructure',
      '~92% of contribution activity as direct commits across 30+ organisation repositories',
    ],
    chips: ['Computer Vision', 'Edge AI', 'Django', 'FastAPI', 'ESP32', 'Docker', 'Linux'],
    anchor: 'page.html#journey',
  },
  {
    id: 'teletalk',
    type: 'chapter',
    title: 'Industrial Attachment',
    eyebrow: 'Teletalk Bangladesh Ltd.',
    when: '2023',
    blurb:
      'Hands-on exposure to national telecom network infrastructure, software systems and ' +
      'operational processes, working alongside experienced engineers on live problems.',
    points: [
      'Explored network infrastructure and operational workflows in a production telecom environment',
      'Assisted with troubleshooting and fault diagnosis in a fast-paced setting',
    ],
    chips: ['Networking', 'Telecom infrastructure', 'Troubleshooting'],
    anchor: 'page.html#journey',
  },
  {
    id: 'cuet',
    type: 'chapter',
    title: 'BSc. Electronics & Telecommunication Engineering',
    eyebrow: 'Chittagong University of Engineering & Technology · Chattogram',
    when: '2019 — 2024',
    blurb:
      'CGPA 3.71 — with coursework spanning VLSI technology, MOS transistor theory, CMOS ' +
      'subsystem design and fabrication technology.',
    points: [
      'Thesis: A Wrench-Shaped MIMO Antenna with Enhanced Bandwidth and Isolation for Sub-6 GHz 5G Applications',
      'Projects in antenna design, VLSI circuit design and embedded sensing systems',
    ],
    chips: ['VLSI', 'RF & antennas', 'Cadence Virtuoso', 'CST Studio', 'MATLAB'],
    anchor: 'page.html#journey',
  },
  {
    id: 'bnsc',
    type: 'chapter',
    title: 'Higher Secondary Certificate',
    eyebrow: 'B.N. School & College · Chattogram',
    when: '2016 — 2018',
    blurb: 'GPA 4.75 — Science.',
    anchor: 'page.html#journey',
  },

  /* ---------- frontiers ---------- */
  {
    id: 'glucose',
    type: 'frontier',
    title: 'Non-invasive glucose measurement',
    eyebrow: 'Open question',
    blurb:
      'Ongoing literature review of optical and spectroscopic approaches to needle-free ' +
      'glucose sensing — NIR photodiode front-ends, Beer–Lambert modelling and their ' +
      'practical limits.',
    anchor: 'page.html#journey',
  },
  {
    id: 'edge-opt',
    type: 'frontier',
    title: 'Edge AI & inference optimisation',
    eyebrow: 'Open question',
    blurb:
      'Getting detection and OCR models to real-time on constrained hardware: quantisation, ' +
      'ONNX/OpenVINO conversion and CPU-versus-GPU deployment trade-offs.',
    anchor: 'page.html#journey',
  },
  {
    id: 'agents',
    type: 'frontier',
    title: 'Agentic AI systems',
    eyebrow: 'Open question',
    blurb:
      'Moving from retrieval-augmented generation toward tool-using agents — with the goal of ' +
      'training and hosting my own models rather than only consuming APIs.',
    anchor: 'page.html#journey',
  },
];

/* ── EDGES ──────────────────────────────────────────────────── */
/* [from, to, kind] — kind drives colour and weight in world.js  */

export const EDGES = [
  /* core → domains: the seven limbs */
  ['me', 'embedded', 'spine'],
  ['me', 'vision', 'spine'],
  ['me', 'ai', 'spine'],
  ['me', 'backend', 'spine'],
  ['me', 'frontend', 'spine'],
  ['me', 'devops', 'spine'],
  ['me', 'rf', 'spine'],

  /* domains ↔ domains: the point of the whole map — they touch */
  ['embedded', 'rf', 'weave'],
  ['embedded', 'backend', 'weave'],
  ['vision', 'ai', 'weave'],
  ['vision', 'devops', 'weave'],
  ['backend', 'frontend', 'weave'],
  ['backend', 'devops', 'weave'],
  ['ai', 'backend', 'weave'],

  /* projects → domains */
  ['anpr', 'vision', 'built'],
  ['anpr', 'backend', 'built'],
  ['anpr', 'devops', 'built'],
  ['bangla-ocr', 'vision', 'built'],
  ['bangla-ocr', 'ai', 'built'],
  ['container', 'vision', 'built'],
  ['medical', 'backend', 'built'],
  ['medical', 'embedded', 'built'],
  ['medical', 'devops', 'built'],
  ['ecg', 'embedded', 'built'],
  ['ecg', 'rf', 'built'],
  ['steth', 'embedded', 'built'],
  ['steth', 'rf', 'built'],
  ['weighbridge', 'embedded', 'built'],
  ['weighbridge', 'backend', 'built'],
  ['wearable', 'embedded', 'built'],
  ['wearable', 'rf', 'built'],
  ['rag', 'ai', 'built'],
  ['rag', 'backend', 'built'],
  ['face', 'vision', 'built'],
  ['ecom', 'backend', 'built'],
  ['ecom', 'frontend', 'built'],
  ['vision-kit', 'vision', 'built'],
  ['vision-kit', 'embedded', 'built'],
  ['antenna', 'rf', 'built'],

  /* projects ↔ projects: shared lineage */
  ['anpr', 'bangla-ocr', 'lineage'],
  ['anpr', 'weighbridge', 'lineage'],
  ['anpr', 'container', 'lineage'],
  ['medical', 'ecg', 'lineage'],
  ['medical', 'steth', 'lineage'],
  ['ecg', 'wearable', 'lineage'],

  /* chapters → what happened in them */
  ['magnetism', 'anpr', 'when'],
  ['magnetism', 'container', 'when'],
  ['magnetism', 'bangla-ocr', 'when'],
  ['magnetism', 'weighbridge', 'when'],
  ['magnetism', 'medical', 'when'],
  ['magnetism', 'ecg', 'when'],
  ['magnetism', 'steth', 'when'],
  ['cuet', 'antenna', 'when'],
  ['cuet', 'wearable', 'when'],
  ['cuet', 'vision-kit', 'when'],
  ['cuet', 'face', 'when'],

  /* the time spine */
  ['magnetism', 'teletalk', 'time'],
  ['teletalk', 'cuet', 'time'],
  ['cuet', 'bnsc', 'time'],

  /* frontiers → the domains they grow out of */
  ['glucose', 'rf', 'reach'],
  ['glucose', 'embedded', 'reach'],
  ['edge-opt', 'vision', 'reach'],
  ['edge-opt', 'devops', 'reach'],
  ['agents', 'ai', 'reach'],
];

/* ── TYPE STYLING ───────────────────────────────────────────── */
/* Hex values mirror the site tokens: --c1 cyan, --c2 violet,
   --c3 mint, --c4 amber. Kept literal because WebGL needs numbers,
   not CSS custom properties. THEME.light swaps them on toggle.     */

export const TYPES = {
  core:     { size: 2.5,  color: 0xffffff, label: 'Me' },
  domain:   { size: 1.55, color: 0x00e5ff, label: 'Domain' },
  project:  { size: 1.0,  color: 0x6d5dfc, label: 'Project' },
  chapter:  { size: 1.15, color: 0x00f5a0, label: 'Chapter' },
  frontier: { size: 0.85, color: 0xffb020, label: 'Frontier' },
};

export const THEME = {
  dark:  { core: 0xdbe6ff, domain: 0x00e5ff, project: 0x6d5dfc, chapter: 0x00f5a0, frontier: 0xd8901c },
  light: { core: 0x1a2338, domain: 0x0091b5, project: 0x5a45e0, chapter: 0x01935f, frontier: 0xb96a00 },
};

export const EDGE_KINDS = {
  spine:   { weight: 0.62, from: 'core' },
  weave:   { weight: 0.46, from: 'domain' },
  built:   { weight: 0.32, from: 'project' },
  lineage: { weight: 0.24, from: 'project' },
  when:    { weight: 0.20, from: 'chapter' },
  time:    { weight: 0.40, from: 'chapter' },
  reach:   { weight: 0.26, from: 'frontier' },
};

/* ── DERIVED INDEXES ────────────────────────────────────────── */

export const BY_ID = new Map(NODES.map((n) => [n.id, n]));

/** adjacency: id → [{ id, kind }] */
export const NEIGHBOURS = (function () {
  const m = new Map(NODES.map((n) => [n.id, []]));
  EDGES.forEach(function (e) {
    const a = e[0], b = e[1], kind = e[2];
    if (!m.has(a) || !m.has(b)) return;      // guard against typos in EDGES
    m.get(a).push({ id: b, kind: kind });
    m.get(b).push({ id: a, kind: kind });
  });
  return m;
})();

/* ── LAYOUT ─────────────────────────────────────────────────── */

/* mulberry32 — tiny deterministic PRNG. Fixed seed, so the map
   "grows" the same shape on every device and every reload.       */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Shell radius and vertical band per type. Domains form a tilted
   ring close in; projects orbit further out near their domain;
   chapters sink below as a time spine; frontiers rise above.     */
const SHELL = {
  core:     { r: 0,  y: [0, 0] },
  domain:   { r: 17, y: [-3, 3] },
  project:  { r: 33, y: [-8, 8] },
  chapter:  { r: 22, y: [-16, -9] },
  frontier: { r: 40, y: [9, 15] },
};

/**
 * Grow node positions.
 * Seeded placement into type shells, then a short relaxation pass
 * (edge springs + all-pairs repulsion + shell restoration) so the
 * result looks organic instead of geometric — but is identical
 * every single load.
 *
 * @returns {Map<string, {x:number,y:number,z:number}>}
 */
export function layout() {
  const rand = rng(20260817);
  const pos = new Map();

  /* --- seed: golden-angle spiral per type, so nothing starts stacked --- */
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const counts = {};
  NODES.forEach(function (n) { counts[n.type] = (counts[n.type] || 0) + 1; });

  const seen = {};
  NODES.forEach(function (n) {
    const shell = SHELL[n.type] || SHELL.project;
    const i = seen[n.type] = (seen[n.type] || 0) + 1;

    if (n.type === 'core') { pos.set(n.id, { x: 0, y: 0, z: 0 }); return; }

    /* spread this type evenly around the ring, then jitter */
    const a = i * GOLDEN + (rand() - 0.5) * 0.45;
    const r = shell.r * (0.82 + rand() * 0.36);
    const yLo = shell.y[0], yHi = shell.y[1];
    const y = yLo + rand() * (yHi - yLo);

    pos.set(n.id, {
      x: Math.cos(a) * r,
      y: y,
      z: Math.sin(a) * r * 0.86,       // slightly flattened: reads as a disc with depth
    });
  });

  /* --- pull each project toward its primary domain before relaxing --- */
  NODES.forEach(function (n) {
    if (n.type !== 'project' && n.type !== 'frontier') return;
    const hubs = (NEIGHBOURS.get(n.id) || []).filter(function (e) {
      const t = BY_ID.get(e.id);
      return t && t.type === 'domain';
    });
    if (!hubs.length) return;

    const p = pos.get(n.id);
    let hx = 0, hy = 0, hz = 0;
    hubs.forEach(function (h) {
      const q = pos.get(h.id);
      hx += q.x; hy += q.y; hz += q.z;
    });
    hx /= hubs.length; hy /= hubs.length; hz /= hubs.length;

    /* place outward along the hub direction, keeping some of the seed jitter */
    const len = Math.hypot(hx, hy, hz) || 1;
    const out = SHELL[n.type].r;
    p.x = (hx / len) * out * 0.94 + p.x * 0.16;
    p.y = (hy / len) * out * 0.34 + p.y * 0.62;
    p.z = (hz / len) * out * 0.94 + p.z * 0.16;
  });

  /* --- relaxation --- */
  const ids = NODES.map(function (n) { return n.id; });
  const REST = { spine: 17, weave: 20, built: 15, lineage: 14, when: 18, time: 11, reach: 16 };
  const MIN_GAP = 7;

  for (let step = 0; step < 220; step++) {
    const cool = 1 - step / 220;

    /* springs along edges */
    EDGES.forEach(function (e) {
      const A = pos.get(e[0]), B = pos.get(e[1]);
      if (!A || !B) return;
      const rest = REST[e[2]] || 12;
      let dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
      const d = Math.hypot(dx, dy, dz) || 0.001;
      const f = ((d - rest) / d) * 0.045 * cool;
      dx *= f; dy *= f; dz *= f;
      const aFixed = e[0] === 'me', bFixed = e[1] === 'me';
      if (!aFixed) { A.x += dx; A.y += dy * 0.5; A.z += dz; }
      if (!bFixed) { B.x -= dx; B.y -= dy * 0.5; B.z -= dz; }
    });

    /* all-pairs repulsion — 28 nodes, so O(n²) is nothing */
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = pos.get(ids[i]), B = pos.get(ids[j]);
        let dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
        let d = Math.hypot(dx, dy, dz);
        if (d > MIN_GAP * 2.4) continue;
        if (d < 0.001) { dx = 0.01; dy = 0.01; dz = 0.01; d = 0.017; }
        const push = ((MIN_GAP * 2.4 - d) / d) * 0.09 * cool;
        if (ids[i] !== 'me') { A.x -= dx * push; A.y -= dy * push * 0.55; A.z -= dz * push; }
        if (ids[j] !== 'me') { B.x += dx * push; B.y += dy * push * 0.55; B.z += dz * push; }
      }
    }

    /* shell restoration — stops the graph collapsing or flying apart */
    NODES.forEach(function (n) {
      if (n.type === 'core') return;
      const p = pos.get(n.id);
      const shell = SHELL[n.type];
      const rNow = Math.hypot(p.x, p.z) || 0.001;
      const k = (shell.r - rNow) / rNow * 0.05 * cool;
      p.x += p.x * k;
      p.z += p.z * k;

      const mid = (shell.y[0] + shell.y[1]) / 2;
      p.y += (mid - p.y) * 0.035 * cool;
    });
  }

  return pos;
}

/** Reading order for keyboard / screen-reader traversal and the index list. */
export const ORDER = ['core', 'domain', 'project', 'chapter', 'frontier'];

export function sortedNodes() {
  return NODES.slice().sort(function (a, b) {
    const d = ORDER.indexOf(a.type) - ORDER.indexOf(b.type);
    return d !== 0 ? d : 0;
  });
}
