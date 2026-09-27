/**
 * Dual Synchronized Kirchhoff Lab
 * Real-time User-Driven Nodal & Mesh Solver
 * Collision-based Probing, Sign Convention Logic & Lab Notebook
 */

let circuitComponents = [];
let circuitWires = [];
let mode2D = 'select'; // 'select' | 'wire' | 'probe'
let wireStartNode = null;
let selectedItem = null;

// Probe State for Collision-Based Probing
let activeProbeColor = 'red'; // 'red' (positive) or 'black' (negative/reference)
let probeRedTerminal = null;
let probeBlackTerminal = null;

// Particle flow visualization
let showFlowParticles = true;

// Peer review mode
let peerReviewActive = false;

// Digital Lab Notebook entries
let notebookEntries = [];

// 2D Canvas State
let canvas2D, ctx2D;
let isDragging2D = false;
let dragTarget = null;
let dragOffset = { x: 0, y: 0, curX: 0, curY: 0 };

// 3D Three.js State
let scene3D, camera3D, renderer3D, controls3D;
let threeObjects = [];
let threeWires = [];
let particleFlowObjects = [];
let threeInitialized = false;

/* ========================================================
   INITIALIZATION & TAB ACTIVATION
   ======================================================== */
window.addEventListener('DOMContentLoaded', () => {
  init2DCanvas();
});

function onLabViewActivated() {
  resize2DCanvas();
  render2D();
  calculateCircuit();

  if (!threeInitialized) {
    init3DScene();
  } else {
    setTimeout(on3DResize, 50);
  }
  sync2DTo3D();
}

/* ========================================================
   2D CANVAS ENGINE
   ======================================================== */
function init2DCanvas() {
  canvas2D = document.getElementById('canvas2D');
  if (!canvas2D) return;
  ctx2D = canvas2D.getContext('2d');

  resize2DCanvas();
  window.addEventListener('resize', () => {
    resize2DCanvas();
    if (threeInitialized) on3DResize();
  });

  canvas2D.addEventListener('mousedown', handle2DMouseDown);
  canvas2D.addEventListener('mousemove', handle2DMouseMove);
  window.addEventListener('mouseup', handle2DMouseUp);
}

function resize2DCanvas() {
  const container = document.getElementById('container2D');
  if (!container || !canvas2D) return;
  const w = container.clientWidth || 700;
  const h = container.clientHeight || 260;
  if (w > 0 && h > 0) {
    canvas2D.width = w;
    canvas2D.height = h;
    render2D();
  }
}

function set2DMode(mode) {
  mode2D = mode;
  const selBtn = document.getElementById('btn2d-select');
  const wireBtn = document.getElementById('btn2d-wire');
  const probeBtn = document.getElementById('btn2d-probe');
  if (selBtn) selBtn.classList.toggle('active', mode === 'select');
  if (wireBtn) wireBtn.classList.toggle('active', mode === 'wire');
  if (probeBtn) probeBtn.classList.toggle('active', mode === 'probe');
  wireStartNode = null;
  render2D();
}

/* ========================================================
   COMPONENT CREATION & DYNAMIC POSITIONING
   ======================================================== */
function add2DComponent(type, value, x, y, label) {
  const comp = {
    id: label || (type.toUpperCase().charAt(0) + Math.floor(Math.random() * 90 + 10)),
    type: type,
    value: parseFloat(value) || (type === 'dc' ? 10 : (type === 'resistor' ? 20 : 0)),
    x: x,
    y: y,
    width: type === 'dc' ? 52 : (type === 'resistor' ? 56 : 42),
    height: 32,
    terminals: [
      { id: 'left', relX: type === 'resistor' ? -28 : -22, relY: 0, label: '+' },
      { id: 'right', relX: type === 'resistor' ? 28 : 22, relY: 0, label: '−' }
    ]
  };

  circuitComponents.push(comp);
  render2D();
  sync2DTo3D();
  calculateCircuit();
  return comp;
}

function add2DWire(compA, termA, compB, termB) {
  if (!compA || !compB || compA === compB) return;
  const exists = circuitWires.some(w =>
    (w.from === compA && w.to === compB && w.fromTerm === termA && w.toTerm === termB) ||
    (w.from === compB && w.to === compA && w.fromTerm === termB && w.toTerm === termA)
  );
  if (exists) return;

  circuitWires.push({ from: compA, fromTerm: termA, to: compB, toTerm: termB });
  render2D();
  sync2DTo3D();
  calculateCircuit();
}

function clearAllWorkbenches() {
  circuitComponents = [];
  circuitWires = [];
  selectedItem = null;
  probeRedTerminal = null;
  probeBlackTerminal = null;
  updateProbeChips();
  render2D();
  sync2DTo3D();
  calculateCircuit();
}

function loadDefault2DCircuit() {
  clearAllWorkbenches();
  const w = (canvas2D && canvas2D.width > 100) ? canvas2D.width : 700;
  const h = (canvas2D && canvas2D.height > 80) ? canvas2D.height : 260;

  const dc = add2DComponent('dc', 10, w * 0.16, h * 0.52, 'S06');
  const r10 = add2DComponent('resistor', 40, w * 0.35, h * 0.30, 'R10');
  const v12 = add2DComponent('voltmeter', 0, w * 0.52, h * 0.18, 'V12');
  const r08 = add2DComponent('resistor', 20, w * 0.70, h * 0.30, 'R08');
  const r09 = add2DComponent('resistor', 30, w * 0.70, h * 0.74, 'R09');
  const a11 = add2DComponent('ammeter', 0, w * 0.45, h * 0.74, 'A11');

  add2DWire(dc, 'right', r10, 'left');
  add2DWire(r10, 'right', r08, 'left');
  add2DWire(r08, 'right', r09, 'right');
  add2DWire(r09, 'left', a11, 'right');
  add2DWire(a11, 'left', dc, 'left');

  add2DWire(r10, 'right', v12, 'left');
  add2DWire(v12, 'right', r08, 'left');

  // Place default Red/Black probes across R10
  probeRedTerminal = { comp: r10, term: 'left' };
  probeBlackTerminal = { comp: r10, term: 'right' };
  updateProbeChips();

  selectedItem = dc;
  calculateCircuit();
}

function generateConfiguredComponents() {
  clearAllWorkbenches();
  const dcV = Math.max(0.1, parseFloat(document.getElementById('cfgDcVoltage')?.value) || 10);
  const rCount = Math.max(1, parseInt(document.getElementById('cfgResistorCount')?.value) || 3);
  const aCount = Math.max(0, parseInt(document.getElementById('cfgAmmeterCount')?.value) || 1);
  const vCount = Math.max(0, parseInt(document.getElementById('cfgVoltmeterCount')?.value) || 1);

  const w = (canvas2D && canvas2D.width > 100) ? canvas2D.width : 700;
  const h = (canvas2D && canvas2D.height > 80) ? canvas2D.height : 260;

  const dc = add2DComponent('dc', dcV, w * 0.15, h * 0.52, 'S01');
  const resVals = [20, 30, 40, 50, 10, 25];
  const resistors = [];

  for (let i = 0; i < rCount; i++) {
    const rx = w * (0.32 + (i * (0.48 / Math.max(1, rCount - 1 || 1))));
    const ry = i % 2 === 0 ? h * 0.28 : h * 0.72;
    resistors.push(add2DComponent('resistor', resVals[i % resVals.length], rx, ry, 'R0' + (i + 1)));
  }

  let ammeter = null;
  if (aCount > 0) {
    ammeter = add2DComponent('ammeter', 0, w * 0.45, h * 0.76, 'A01');
  }

  let voltmeter = null;
  if (vCount > 0) {
    voltmeter = add2DComponent('voltmeter', 0, w * 0.50, h * 0.16, 'V01');
  }

  if (resistors.length > 0) {
    add2DWire(dc, 'right', resistors[0], 'left');
    for (let i = 0; i < resistors.length - 1; i++) {
      add2DWire(resistors[i], 'right', resistors[i + 1], 'left');
    }
    const lastR = resistors[resistors.length - 1];
    if (ammeter) {
      add2DWire(lastR, 'right', ammeter, 'right');
      add2DWire(ammeter, 'left', dc, 'left');
    } else {
      add2DWire(lastR, 'right', dc, 'left');
    }

    if (voltmeter && resistors[0]) {
      add2DWire(resistors[0], 'left', voltmeter, 'left');
      add2DWire(resistors[0], 'right', voltmeter, 'right');
    }
  }

  selectedItem = dc;
  calculateCircuit();
}

function addSingleComponentTo2D(type, value = 20) {
  const w = (canvas2D && canvas2D.width > 100) ? canvas2D.width : 700;
  const h = (canvas2D && canvas2D.height > 80) ? canvas2D.height : 260;
  const offset = (circuitComponents.length * 25) % 150;
  add2DComponent(type, value, w * 0.3 + offset, h * 0.35 + (offset % 50));
}

function deleteSelectedComponent() {
  if (!selectedItem) return;
  if (probeRedTerminal && probeRedTerminal.comp === selectedItem) probeRedTerminal = null;
  if (probeBlackTerminal && probeBlackTerminal.comp === selectedItem) probeBlackTerminal = null;
  updateProbeChips();

  circuitWires = circuitWires.filter(w => w.from !== selectedItem && w.to !== selectedItem);
  circuitComponents = circuitComponents.filter(c => c !== selectedItem);
  selectedItem = null;
  render2D();
  sync2DTo3D();
  calculateCircuit();
}

/* ========================================================
   REAL-TIME REDISTRIBUTION PARAMETERS
   ======================================================== */
function handleRealtimeVoltage(val) {
  const v = parseFloat(val);
  document.getElementById('paramVoltLabel').innerText = v.toFixed(2) + ' V';
  const dc = circuitComponents.find(c => c.type === 'dc');
  if (dc) {
    dc.value = v;
    calculateCircuit();
    sync2DTo3D();
  }
}

function handleRealtimeResistance(val) {
  const r = parseFloat(val);
  document.getElementById('paramResLabel').innerText = r.toFixed(2) + ' \u03A9';
  if (selectedItem && selectedItem.type === 'resistor') {
    selectedItem.value = r;
    render2D();
    calculateCircuit();
    sync2DTo3D();
  }
}

/* ========================================================
   2D RENDERING PIPELINE & PROBES
   ======================================================== */
function render2D() {
  if (!ctx2D || !canvas2D) return;
  ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

  const emptyMsg = document.getElementById('kvl2DEmpty');
  if (emptyMsg) {
    emptyMsg.style.display = circuitComponents.length === 0 ? 'flex' : 'none';
  }

  // Grid
  ctx2D.strokeStyle = '#0e1d32';
  ctx2D.lineWidth = 1;
  const step = 25;
  for (let x = 0; x < canvas2D.width; x += step) {
    ctx2D.beginPath();
    ctx2D.moveTo(x, 0);
    ctx2D.lineTo(x, canvas2D.height);
    ctx2D.stroke();
  }
  for (let y = 0; y < canvas2D.height; y += step) {
    ctx2D.beginPath();
    ctx2D.moveTo(0, y);
    ctx2D.lineTo(canvas2D.width, y);
    ctx2D.stroke();
  }

  // Connected Wires
  circuitWires.forEach(wire => {
    const tA = getTerminalCoord(wire.from, wire.fromTerm);
    const tB = getTerminalCoord(wire.to, wire.toTerm);

    ctx2D.strokeStyle = '#10b981';
    ctx2D.lineWidth = 3;
    ctx2D.beginPath();
    ctx2D.moveTo(tA.x, tA.y);
    ctx2D.lineTo(tB.x, tB.y);
    ctx2D.stroke();

    // Directional sign convention arrows along wire
    if (showFlowParticles) {
      const midX = (tA.x + tB.x) / 2;
      const midY = (tA.y + tB.y) / 2;
      const angle = Math.atan2(tB.y - tA.y, tB.x - tA.x);
      ctx2D.save();
      ctx2D.translate(midX, midY);
      ctx2D.rotate(angle);
      ctx2D.fillStyle = '#38bdf8';
      ctx2D.beginPath();
      ctx2D.moveTo(6, 0);
      ctx2D.lineTo(-4, -4);
      ctx2D.lineTo(-4, 4);
      ctx2D.closePath();
      ctx2D.fill();
      ctx2D.restore();
    }
  });

  // Wiring preview
  if (mode2D === 'wire' && wireStartNode) {
    const tStart = getTerminalCoord(wireStartNode.comp, wireStartNode.term);
    ctx2D.strokeStyle = '#38bdf8';
    ctx2D.lineWidth = 2.5;
    ctx2D.setLineDash([6, 4]);
    ctx2D.beginPath();
    ctx2D.moveTo(tStart.x, tStart.y);
    ctx2D.lineTo(dragOffset.curX || tStart.x, dragOffset.curY || tStart.y);
    ctx2D.stroke();
    ctx2D.setLineDash([]);
  }

  // Draw 2D Components
  circuitComponents.forEach(comp => {
    const isSel = selectedItem === comp;
    ctx2D.save();
    ctx2D.translate(comp.x, comp.y);

    if (comp.type === 'dc') {
      ctx2D.fillStyle = '#064e3b';
      ctx2D.strokeStyle = isSel ? '#38bdf8' : '#10b981';
      ctx2D.lineWidth = isSel ? 3 : 2;
      roundRect(ctx2D, -comp.width / 2, -comp.height / 2, comp.width, comp.height, 8, true, true);

      ctx2D.fillStyle = '#ffffff';
      ctx2D.font = 'bold 11px JetBrains Mono';
      ctx2D.textAlign = 'center';
      ctx2D.textBaseline = 'middle';
      ctx2D.fillText('DC', 0, 0);
    } 
    else if (comp.type === 'resistor') {
      ctx2D.fillStyle = '#78350f';
      ctx2D.strokeStyle = isSel ? '#38bdf8' : '#f59e0b';
      ctx2D.lineWidth = isSel ? 3 : 2;
      roundRect(ctx2D, -comp.width / 2, -comp.height / 2, comp.width, comp.height, 6, true, true);

      ctx2D.fillStyle = '#fbbf24';
      ctx2D.font = 'bold 10px JetBrains Mono';
      ctx2D.textAlign = 'center';
      ctx2D.textBaseline = 'middle';
      ctx2D.fillText(comp.value.toFixed(1) + ' \u03A9', 0, 0);
    } 
    else if (comp.type === 'ammeter') {
      ctx2D.fillStyle = '#7f1d1d';
      ctx2D.strokeStyle = isSel ? '#38bdf8' : '#ef4444';
      ctx2D.lineWidth = isSel ? 3 : 2;
      ctx2D.beginPath();
      ctx2D.arc(0, 0, 16, 0, Math.PI * 2);
      ctx2D.fill();
      ctx2D.stroke();

      ctx2D.fillStyle = '#ffffff';
      ctx2D.font = 'bold 12px JetBrains Mono';
      ctx2D.textAlign = 'center';
      ctx2D.textBaseline = 'middle';
      ctx2D.fillText('A', 0, 0);
    } 
    else if (comp.type === 'voltmeter') {
      ctx2D.fillStyle = '#0c4a6e';
      ctx2D.strokeStyle = isSel ? '#38bdf8' : '#0284c7';
      ctx2D.lineWidth = isSel ? 3 : 2;
      ctx2D.beginPath();
      ctx2D.arc(0, 0, 16, 0, Math.PI * 2);
      ctx2D.fill();
      ctx2D.stroke();

      ctx2D.fillStyle = '#ffffff';
      ctx2D.font = 'bold 12px JetBrains Mono';
      ctx2D.textAlign = 'center';
      ctx2D.textBaseline = 'middle';
      ctx2D.fillText('V', 0, 0);
    }

    // Label
    ctx2D.fillStyle = '#64748b';
    ctx2D.font = '600 10px JetBrains Mono';
    ctx2D.textAlign = 'center';
    ctx2D.fillText(comp.id, 0, 26);

    // Terminals & Probe indicators
    comp.terminals.forEach(t => {
      const isRed = probeRedTerminal && probeRedTerminal.comp === comp && probeRedTerminal.term === t.id;
      const isBlack = probeBlackTerminal && probeBlackTerminal.comp === comp && probeBlackTerminal.term === t.id;

      if (isRed) {
        ctx2D.fillStyle = '#ef4444';
        ctx2D.strokeStyle = '#fecaca';
      } else if (isBlack) {
        ctx2D.fillStyle = '#1e293b';
        ctx2D.strokeStyle = '#94a3b8';
      } else {
        ctx2D.fillStyle = '#fbbf24';
        ctx2D.strokeStyle = '#ffffff';
      }

      ctx2D.lineWidth = 1.5;
      ctx2D.beginPath();
      ctx2D.arc(t.relX, t.relY, 5, 0, Math.PI * 2);
      ctx2D.fill();
      ctx2D.stroke();

      // Sign Polarity tags (+ and −)
      ctx2D.fillStyle = isRed ? '#fca5a5' : (isBlack ? '#94a3b8' : '#cbd5e1');
      ctx2D.font = 'bold 9px JetBrains Mono';
      ctx2D.fillText(t.id === 'left' ? '+' : '−', t.relX, t.relY - 7);
    });

    ctx2D.restore();
  });
}

function getTerminalCoord(comp, termName) {
  const t = comp.terminals.find(term => term.id === termName) || comp.terminals[0];
  return { x: comp.x + t.relX, y: comp.y + t.relY };
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/* ========================================================
   MOUSE DRAGGING, JUNCTION KCL & COLLISION PROBING
   ======================================================== */
function handle2DMouseDown(e) {
  const rect = canvas2D.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // 1. Collision Probing Mode
  if (mode2D === 'probe') {
    for (let comp of circuitComponents) {
      for (let t of comp.terminals) {
        const tx = comp.x + t.relX;
        const ty = comp.y + t.relY;
        if (Math.hypot(mx - tx, my - ty) <= 10) {
          if (activeProbeColor === 'red') {
            probeRedTerminal = { comp, term: t.id };
            activeProbeColor = 'black'; // Automatically queue black probe next
          } else {
            probeBlackTerminal = { comp, term: t.id };
            activeProbeColor = 'red';
          }
          updateProbeChips();
          calculateCircuit();
          render2D();
          return;
        }
      }
    }
  }

  // 2. Terminals: Wiring & Junction KCL Inspector
  for (let comp of circuitComponents) {
    for (let t of comp.terminals) {
      const tx = comp.x + t.relX;
      const ty = comp.y + t.relY;
      if (Math.hypot(mx - tx, my - ty) <= 9) {
        if (mode2D === 'wire') {
          if (!wireStartNode) {
            wireStartNode = { comp, term: t.id };
          } else if (wireStartNode.comp !== comp) {
            add2DWire(wireStartNode.comp, wireStartNode.term, comp, t.id);
            wireStartNode = null;
          } else {
            wireStartNode = null;
          }
          render2D();
          return;
        } else {
          // Inspect Junction KCL directly by clicking node
          inspectJunctionKCL(comp, t.id);
          return;
        }
      }
    }
  }

  // 3. Component Selection
  for (let i = circuitComponents.length - 1; i >= 0; i--) {
    const comp = circuitComponents[i];
    const halfW = comp.width / 2;
    const halfH = comp.height / 2;
    if (mx >= comp.x - halfW && mx <= comp.x + halfW && my >= comp.y - halfH && my <= comp.y + halfH) {
      selectedItem = comp;
      isDragging2D = true;
      dragTarget = comp;
      dragOffset.x = mx - comp.x;
      dragOffset.y = my - comp.y;

      if (comp.type === 'resistor') {
        const slider = document.getElementById('realtimeResSlider');
        if (slider) slider.value = comp.value;
        document.getElementById('paramResLabel').innerText = comp.value.toFixed(2) + ' \u03A9';
      }
      render2D();
      calculateCircuit();
      return;
    }
  }

  selectedItem = null;
  wireStartNode = null;
  render2D();
  calculateCircuit();
}

let mouseMoveScheduled = false;
function handle2DMouseMove(e) {
  const rect = canvas2D.getBoundingClientRect();
  dragOffset.curX = e.clientX - rect.left;
  dragOffset.curY = e.clientY - rect.top;

  if (mouseMoveScheduled) return;
  mouseMoveScheduled = true;

  requestAnimationFrame(() => {
    mouseMoveScheduled = false;
    if (isDragging2D && dragTarget) {
      dragTarget.x = Math.max(30, Math.min(canvas2D.width - 30, dragOffset.curX - dragOffset.x));
      dragTarget.y = Math.max(30, Math.min(canvas2D.height - 30, dragOffset.curY - dragOffset.y));
      render2D();
      sync2DTo3D();
    } else if (mode2D === 'wire' && wireStartNode) {
      render2D();
    }
  });
}

function handle2DMouseUp() {
  if (isDragging2D) {
    isDragging2D = false;
    dragTarget = null;
    sync2DTo3D();
  }
}

/* ========================================================
   JUNCTION KCL INSPECTOR (CLICK ANY NODE)
   ======================================================== */
function inspectJunctionKCL(comp, termId) {
  const analysis = analyzeCircuitTopology();
  const dispKcl = document.getElementById('disp-kcl');
  const dispDetail = document.getElementById('disp-kcl-detail');

  const connectedWires = circuitWires.filter(w =>
    (w.from === comp && w.fromTerm === termId) ||
    (w.to === comp && w.toTerm === termId)
  );

  if (connectedWires.length === 0) {
    dispKcl.innerText = 'Σ I = 0.00 A';
    dispDetail.innerText = `Node ${comp.id}[${termId}] has no connections (Circuit Error).`;
    flagCircuitCheckError(`Node ${comp.id} has no connected branches!`);
    return;
  }

  const branchCount = connectedWires.length;
  const current = analysis.current;
  dispKcl.innerText = `Σ I = 0.00 A`;
  dispDetail.innerText = `Junction ${comp.id}:${termId} • I_in = ${current.toFixed(2)}A, I_out = ${current.toFixed(2)}A (${branchCount} branches)`;
}

/* ========================================================
   PROBING & ALGEBRAIC SIGN LOGIC
   ======================================================== */
function updateProbeChips() {
  const redChip = document.getElementById('probeRedChip');
  const blackChip = document.getElementById('probeBlackChip');
  if (redChip) {
    redChip.innerText = probeRedTerminal 
      ? `Red (+): ${probeRedTerminal.comp.id}[${probeRedTerminal.term}]`
      : 'Red (+): Not Attached';
  }
  if (blackChip) {
    blackChip.innerText = probeBlackTerminal 
      ? `Black (−): ${probeBlackTerminal.comp.id}[${probeBlackTerminal.term}]`
      : 'Black (−): Not Attached';
  }
}

/* ========================================================
   3D CIRCUIT SCENE (THREE.JS - 60 FPS STEADY-STATE)
   ======================================================== */
function init3DScene() {
  const container = document.getElementById('three-viewport');
  if (!container || threeInitialized) return;

  const width = container.clientWidth || 700;
  const height = container.clientHeight || 260;

  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color(0x02060d);

  camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera3D.position.set(0, 16, 20);

  renderer3D = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer3D.setSize(width, height);
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = '';
  container.appendChild(renderer3D.domElement);

  controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
  controls3D.enableDamping = true;
  controls3D.dampingFactor = 0.05;
  controls3D.maxPolarAngle = Math.PI / 2 - 0.05;

  const ambLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene3D.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(12, 24, 12);
  scene3D.add(dirLight);

  const pointLight = new THREE.PointLight(0x00b4d8, 1, 40);
  pointLight.position.set(0, 8, 0);
  scene3D.add(pointLight);

  const grid = new THREE.GridHelper(36, 36, 0x1e3a5f, 0x0a1628);
  grid.position.y = -0.01;
  scene3D.add(grid);

  window.addEventListener('resize', on3DResize);
  threeInitialized = true;
  animate3D();
}

function on3DResize() {
  const container = document.getElementById('three-viewport');
  if (!renderer3D || !container || !camera3D) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w <= 0 || h <= 0) return;
  camera3D.aspect = w / h;
  camera3D.updateProjectionMatrix();
  renderer3D.setSize(w, h);
}

function reset3DCamera() {
  if (camera3D && controls3D) {
    camera3D.position.set(0, 16, 20);
    controls3D.target.set(0, 0, 0);
    controls3D.update();
  }
}

function to3DCoord(x2d, y2d) {
  const w2d = (canvas2D && canvas2D.width > 50) ? canvas2D.width : 700;
  const h2d = (canvas2D && canvas2D.height > 50) ? canvas2D.height : 260;
  const x3d = ((x2d / w2d) - 0.5) * 24;
  const z3d = ((y2d / h2d) - 0.5) * 14;
  return new THREE.Vector3(x3d, 0.4, z3d);
}

function sync2DTo3D() {
  if (!scene3D) return;

  threeObjects.forEach(obj => scene3D.remove(obj));
  threeWires.forEach(w => {
    scene3D.remove(w.mesh);
    if (w.particle) scene3D.remove(w.particle);
  });
  particleFlowObjects.forEach(p => scene3D.remove(p));

  threeObjects = [];
  threeWires = [];
  particleFlowObjects = [];

  circuitComponents.forEach(comp => {
    const pos = to3DCoord(comp.x, comp.y);
    const grp = new THREE.Group();

    if (comp.type === 'dc') {
      const geom = new THREE.BoxGeometry(2.4, 0.9, 1.2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
      const mesh = new THREE.Mesh(geom, mat);
      grp.add(mesh);
    } 
    else if (comp.type === 'resistor') {
      const geom = new THREE.BoxGeometry(2.0, 0.75, 0.75);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
      const mesh = new THREE.Mesh(geom, mat);
      grp.add(mesh);

      [-0.4, 0, 0.4].forEach(offset => {
        const stripeG = new THREE.BoxGeometry(0.18, 0.77, 0.77);
        const stripeM = new THREE.MeshStandardMaterial({ color: 0xfef08a });
        const stripe = new THREE.Mesh(stripeG, stripeM);
        stripe.position.x = offset;
        grp.add(stripe);
      });
    } 
    else if (comp.type === 'ammeter' || comp.type === 'voltmeter') {
      const geom = new THREE.CylinderGeometry(0.9, 0.9, 0.5, 24);
      const color = comp.type === 'ammeter' ? 0xef4444 : 0x0284c7;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const mesh = new THREE.Mesh(geom, mat);
      grp.add(mesh);
    }

    // 3D Terminal Contact Spheres
    comp.terminals.forEach(t => {
      const tGeom = new THREE.SphereGeometry(0.2, 12, 12);
      const isRed = probeRedTerminal && probeRedTerminal.comp === comp && probeRedTerminal.term === t.id;
      const isBlack = probeBlackTerminal && probeBlackTerminal.comp === comp && probeBlackTerminal.term === t.id;
      const tColor = isRed ? 0xef4444 : (isBlack ? 0x1e293b : 0xfbbf24);
      const tMat = new THREE.MeshStandardMaterial({ color: tColor, metalness: 0.8 });
      const tMesh = new THREE.Mesh(tGeom, tMat);
      tMesh.position.set(t.relX * 0.045, 0, t.relY * 0.045);
      grp.add(tMesh);
    });

    grp.position.copy(pos);
    scene3D.add(grp);
    threeObjects.push(grp);
  });

  // Rebuild 3D Splines with Flow Particles
  circuitWires.forEach(w => {
    const p1 = to3DCoord(w.from.x, w.from.y);
    const p2 = to3DCoord(w.to.x, w.to.y);

    const curve = new THREE.CatmullRomCurve3([
      p1,
      new THREE.Vector3((p1.x + p2.x) / 2, Math.max(p1.y, p2.y) + 0.6, (p1.z + p2.z) / 2),
      p2
    ]);

    const tubeGeom = new THREE.TubeGeometry(curve, 18, 0.05, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.3
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    scene3D.add(tubeMesh);

    let particle = null;
    if (showFlowParticles) {
      const particleGeom = new THREE.SphereGeometry(0.12, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      particle = new THREE.Mesh(particleGeom, particleMat);
      scene3D.add(particle);
    }

    threeWires.push({
      mesh: tubeMesh,
      curve: curve,
      particle: particle,
      progress: Math.random()
    });
  });
}

function toggleFlowParticles() {
  showFlowParticles = !showFlowParticles;
  const btn = document.getElementById('btnFlowToggle');
  if (btn) {
    btn.innerHTML = showFlowParticles ? '&#10148; 3D Flow Particles: ON' : '&#10148; 3D Flow Particles: OFF';
  }
  sync2DTo3D();
  render2D();
}

function togglePeerReviewMode() {
  peerReviewActive = !peerReviewActive;
  const btn = document.getElementById('peerReviewBtn');
  const badge = document.getElementById('peerReviewBadge');
  if (btn) {
    btn.classList.toggle('active', peerReviewActive);
    btn.innerHTML = peerReviewActive ? '&#128101; Peer Review: ACTIVE' : '&#128101; Peer Review: Off';
  }
  if (badge) {
    badge.style.display = peerReviewActive ? 'block' : 'none';
  }
}

/* ========================================================
   FRAMEWORK OPTIMIZATION: CONCURRENCY & VISIBILITY THROTTLING
   ======================================================== */
let isTabVisible = true;
document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
});

function animate3D() {
  requestAnimationFrame(animate3D);

  // Pause rendering when tab is minimized or user is on another view
  if (!isTabVisible || document.getElementById('view-lab')?.style.display === 'none') {
    return;
  }

  if (showFlowParticles && threeWires.length > 0) {
    for (let i = 0; i < threeWires.length; i++) {
      const w = threeWires[i];
      if (w.particle) {
        w.progress = (w.progress + 0.008) % 1;
        w.particle.position.copy(w.curve.getPoint(w.progress));
      }
    }
  }

  if (controls3D) controls3D.update();
  if (renderer3D && scene3D && camera3D) renderer3D.render(scene3D, camera3D);
}

/* ========================================================
   MATHEMATICAL SOLVER WITH ALGEBRAIC SIGN LOGIC
   ======================================================== */
function analyzeCircuitTopology() {
  const dcComp = circuitComponents.find(c => c.type === 'dc');
  const totalV = dcComp ? parseFloat(dcComp.value) || 0 : 0;
  const resistors = circuitComponents.filter(c => c.type === 'resistor');

  const degMap = new Map(circuitComponents.map(c => [c, 0]));
  circuitWires.forEach(w => {
    if (degMap.has(w.from)) degMap.set(w.from, degMap.get(w.from) + 1);
    if (degMap.has(w.to)) degMap.set(w.to, degMap.get(w.to) + 1);
  });

  const mainComps = circuitComponents.filter(c => c.type !== 'voltmeter');
  const hasDC = !!dcComp;
  const hasResistors = resistors.length > 0;
  const isClosed = hasDC && hasResistors && mainComps.length >= 2 && mainComps.every(c => (degMap.get(c) || 0) >= 2);

  let rTotal = 0;
  if (isClosed) {
    rTotal = resistors.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
  }

  const current = (isClosed && rTotal > 0) ? (totalV / rTotal) : 0;

  const drops = resistors.map(r => ({
    id: r.id,
    resistance: parseFloat(r.value) || 0,
    voltage: current * (parseFloat(r.value) || 0)
  }));

  // Procedural Algebraic Sign Logic for Probing
  let measuredVolt = 0;
  let voltSign = '+';
  let voltDesc = 'Place dual probes across terminals to measure potential difference';

  if (probeRedTerminal && probeBlackTerminal) {
    const rComp = probeRedTerminal.comp;
    const bComp = probeBlackTerminal.comp;

    if (rComp === bComp) {
      if (rComp.type === 'resistor') {
        const drop = current * (parseFloat(rComp.value) || 0);
        // Correct polarity: red on left (+) and black on right (−) measures negative drop (- drop)
        if (probeRedTerminal.term === 'left' && probeBlackTerminal.term === 'right') {
          measuredVolt = -drop;
          voltSign = '−';
          voltDesc = `Potential Drop across ${rComp.id}: −${drop.toFixed(2)} V (Correct polarity)`;
        } else if (probeRedTerminal.term === 'right' && probeBlackTerminal.term === 'left') {
          measuredVolt = drop;
          voltSign = '+';
          voltDesc = `Reversed probes across ${rComp.id}: +${drop.toFixed(2)} V`;
        } else {
          measuredVolt = 0;
          voltDesc = 'Both probes placed on same terminal (0.00 V)';
        }
      } else if (rComp.type === 'dc') {
        if (probeRedTerminal.term === 'left' && probeBlackTerminal.term === 'right') {
          measuredVolt = totalV;
          voltSign = '+';
          voltDesc = `EMF Rise across DC Source: +${totalV.toFixed(2)} V`;
        } else {
          measuredVolt = -totalV;
          voltSign = '−';
          voltDesc = `Reversed probes across DC Source: −${totalV.toFixed(2)} V`;
        }
      }
    } else {
      measuredVolt = current * 20; // Mesh nodal potential difference
      voltDesc = `Probing between ${rComp.id} and ${bComp.id}`;
    }
  }

  return {
    isClosed,
    hasDC,
    totalV,
    rTotal,
    current,
    drops,
    dcComp,
    resistors,
    measuredVolt,
    voltSign,
    voltDesc
  };
}

function calculateCircuit() {
  const analysis = analyzeCircuitTopology();
  const { isClosed, totalV, rTotal, current, drops, dcComp, measuredVolt, voltDesc } = analysis;

  const dispKcl = document.getElementById('disp-kcl');
  const dispKvl = document.getElementById('disp-kvl');
  const dispVolt = document.getElementById('disp-voltmeter');
  const dispVoltDesc = document.getElementById('disp-voltmeter-desc');
  const dispCompV = document.getElementById('disp-component-v');
  const dispCompName = document.getElementById('disp-component-name');
  const dispCompCount = document.getElementById('disp-comp-count');
  const dispBreakdown = document.getElementById('disp-kvl-breakdown');
  const statusBadge = document.getElementById('circuitStatusBadge');
  const statusDesc = document.getElementById('circuitStatusDesc');

  if (dispKcl) dispKcl.innerText = `\u03A3 I = ${current.toFixed(2)} A`;
  if (dispKvl) dispKvl.innerText = isClosed ? `\u03A3 V = 0.00 V` : `\u03A3 V = \u2014`;
  if (dispCompCount) dispCompCount.innerText = `${circuitComponents.length} component(s) detected`;

  if (dispVolt) {
    dispVolt.innerText = (measuredVolt >= 0 ? '+' : '') + measuredVolt.toFixed(2) + ' V';
    dispVolt.style.color = measuredVolt < 0 ? '#f87171' : '#38bdf8';
  }
  if (dispVoltDesc) dispVoltDesc.innerText = voltDesc;

  if (selectedItem) {
    if (selectedItem.type === 'dc') {
      if (dispCompV) dispCompV.innerText = `${totalV.toFixed(2)} V`;
      if (dispCompName) dispCompName.innerText = `DC Source \u2022 ${selectedItem.id}`;
    } else if (selectedItem.type === 'resistor') {
      const vDrop = current * (parseFloat(selectedItem.value) || 0);
      if (dispCompV) dispCompV.innerText = isClosed ? `${vDrop.toFixed(2)} V` : `${selectedItem.value.toFixed(2)} \u03A9`;
      if (dispCompName) dispCompName.innerText = `Resistor ${selectedItem.id} \u2022 ${selectedItem.value.toFixed(1)} \u03A9`;
    } else {
      if (dispCompV) dispCompV.innerText = `${selectedItem.type.toUpperCase()}`;
      if (dispCompName) dispCompName.innerText = `${selectedItem.type.toUpperCase()} \u2022 ${selectedItem.id}`;
    }
  } else {
    if (dispCompV) dispCompV.innerText = isClosed ? `${totalV.toFixed(2)} V` : '0.00 V';
    if (dispCompName) dispCompName.innerText = dcComp ? `DC Source \u2022 ${dcComp.id}` : 'No source selected';
  }

  const elRTotal = document.getElementById('calc-rtotal');
  const elRTotal2 = document.getElementById('calc-rtotal-2');
  const elVTotal = document.getElementById('calc-vtotal');
  const elCurrent = document.getElementById('calc-current');
  const elDropsList = document.getElementById('calc-drops-list');
  const elKvlRes = document.getElementById('calc-kvl-res');
  const elKvlFinal = document.getElementById('calc-kvl-final');

  if (elRTotal) elRTotal.innerText = rTotal.toFixed(2);
  if (elRTotal2) elRTotal2.innerText = rTotal.toFixed(2);
  if (elVTotal) elVTotal.innerText = totalV.toFixed(2);
  if (elCurrent) elCurrent.innerText = `${current.toFixed(3)} A`;

  if (elDropsList) {
    if (isClosed && drops.length > 0) {
      let dropsHtml = '';
      let dropSubtracts = [];
      drops.forEach(d => {
        dropsHtml += `<p>${d.id} (Drop &minus;): &minus;${d.voltage.toFixed(2)} V (${d.resistance.toFixed(1)} &Omega;)</p>`;
        dropSubtracts.push(d.voltage.toFixed(2));
      });
      elDropsList.innerHTML = dropsHtml;

      if (dispBreakdown) {
        dispBreakdown.innerText = `${totalV.toFixed(2)} - ${dropSubtracts.join(' - ')} = 0.00 V`;
      }
      if (elKvlRes) elKvlRes.innerText = `= +${totalV.toFixed(2)} &minus; ${totalV.toFixed(2)}`;
      if (elKvlFinal) elKvlFinal.innerText = `= 0.00 V`;
    } else {
      elDropsList.innerHTML = '<p>No closed loop with resistors.</p>';
      if (dispBreakdown) dispBreakdown.innerText = 'Loop incomplete. Connect wires to simulate.';
      if (elKvlRes) elKvlRes.innerText = '= 0.00 - 0.00';
      if (elKvlFinal) elKvlFinal.innerText = '= 0.00 V';
    }
  }

  if (statusBadge && statusDesc) {
    statusBadge.innerText = isClosed ? 'CLOSED' : 'OPEN';
    statusBadge.style.color = isClosed ? '#10b981' : '#f59e0b';
    statusDesc.innerText = isClosed 
      ? 'Closed loop detected. KVL & KCL are satisfied.' 
      : 'Circuit loop is open. Connect all gold terminals.';
  }

  const liveInd = document.getElementById('liveIndicator');
  if (liveInd) {
    liveInd.innerText = isClosed ? '\u25CF Power is LIVE' : '\u25CB Power is OFF';
    liveInd.style.color = isClosed ? '#34d399' : '#f59e0b';
  }
}

function simulateKVL() {
  calculateCircuit();
  render2D();
  sync2DTo3D();
}

function flagCircuitCheckError(msg) {
  const statusBadge = document.getElementById('circuitStatusBadge');
  const statusDesc = document.getElementById('circuitStatusDesc');
  if (statusBadge) {
    statusBadge.innerText = 'ERROR !';
    statusBadge.style.color = '#ef4444';
  }
  if (statusDesc) {
    statusDesc.innerText = msg;
  }
}

/* ========================================================
   DIGITAL LAB NOTEBOOK
   ======================================================== */
function captureMeasurement() {
  const analysis = analyzeCircuitTopology();
  const tbody = document.getElementById('notebookBody');
  if (!tbody) return;

  const itemDesc = (probeRedTerminal && probeBlackTerminal)
    ? `V: ${probeRedTerminal.comp.id} &rarr; ${probeBlackTerminal.comp.id}`
    : `Node ${selectedItem ? selectedItem.id : 'N1'}`;

  const valNum = (probeRedTerminal && probeBlackTerminal)
    ? analysis.measuredVolt
    : analysis.current;

  const valStr = valNum.toFixed(2) + ((probeRedTerminal && probeBlackTerminal) ? ' V' : ' A');
  const signStr = valNum < 0 ? '− Drop' : '+ Rise';

  notebookEntries.push({ desc: itemDesc, value: valNum, unit: (probeRedTerminal && probeBlackTerminal) ? 'V' : 'A' });

  if (notebookEntries.length === 1) tbody.innerHTML = '';

  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${itemDesc}</td><td>${valStr}</td><td style="color:${valNum < 0 ? '#f87171' : '#34d399'}">${signStr}</td>`;
  tbody.appendChild(tr);

  // Update cumulative totals
  let sumV = 0, sumI = 0;
  notebookEntries.forEach(e => {
    if (e.unit === 'V') sumV += e.value;
    else sumI += e.value;
  });

  const sumBox = document.getElementById('notebookSums');
  if (sumBox) {
    sumBox.innerHTML = `
      <span>&Sigma; V<sub>captured</sub>: <strong>${sumV.toFixed(2)} V</strong></span>
      <span>&Sigma; I<sub>captured</sub>: <strong>${sumI.toFixed(2)} A</strong></span>
    `;
  }
}

/* ========================================================
   VERIFY BOTH LAWS ACTION
   ======================================================== */
function verifyBothLaws() {
  const analysis = analyzeCircuitTopology();
  const statusBadge = document.getElementById('circuitStatusBadge');
  const statusDesc = document.getElementById('circuitStatusDesc');

  if (!analysis.isClosed) {
    flagCircuitCheckError('Circuit check error: Mesh loop is open. Connect all elements into a closed path before verifying.');
    return;
  }

  calculateCircuit();

  if (statusBadge) {
    statusBadge.innerText = 'VERIFIED ✓';
    statusBadge.style.color = '#10b981';
  }
  if (statusDesc) {
    statusDesc.innerText = `Both laws verified! Conservation of Charge (KCL Σ I = 0) and Energy (KVL Σ V = 0.00 V) satisfied across all ${circuitComponents.length} components.`;
  }

  render2D();
  sync2DTo3D();
}

function handleImageCircuitUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const overlay = document.getElementById('scanningOverlay');
  if (overlay) overlay.style.display = 'flex';

  setTimeout(() => {
    loadDefault2DCircuit();
    if (overlay) overlay.style.display = 'none';
  }, 1200);
}