import React, { useRef, useEffect, useState, useCallback } from 'react';

// Default physical parameters
const DEFAULTS = {
  N:       40,
  a:       1.0,
  r0:      14,
  A:       6000,
  B:       400,
  C:       250,
  n:       6,
  m:       3,
  p:       4,
  dt:      0.025,
  damping: 0.82,
};

function makeNodes(N, W, H, r0) {
  return Array.from({ length: N }, () => ({
    x:    W * 0.1 + Math.random() * W * 0.8,
    y:    H * 0.1 + Math.random() * H * 0.8,
    r:    r0 + (Math.random() - 0.5) * 4,
    phi:  Math.random() * 2 * Math.PI,
    s:    Math.random() < 0.5 ? 1 : -1,
    vx: 0, vy: 0, vr: 0, vphi: 0,
  }));
}

// Compute forces on all nodes from energy gradient
// E = Σ a(r_i-r0)²  +  Σ_{i<j} [ A/d^n  -  B cos(Δφ)/d^m  +  C s_i s_j / d^p ]
function computeForces(nodes, { a, r0, A, B, C, n, m, p }) {
  const F = nodes.map(() => ({ fx: 0, fy: 0, fr: 0, fphi: 0 }));

  for (let i = 0; i < nodes.length; i++) {
    // Self: radius spring  dE/dr_i = 2a(r_i - r0)
    F[i].fr -= 2 * a * (nodes[i].r - r0);

    for (let j = i + 1; j < nodes.length; j++) {
      const dx  = nodes[i].x - nodes[j].x;
      const dy  = nodes[i].y - nodes[j].y;
      const d   = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.5) continue;

      const dphi     = nodes[i].phi - nodes[j].phi;
      const cosDphi  = Math.cos(dphi);
      const sinDphi  = Math.sin(dphi);
      const sisj     = nodes[i].s * nodes[j].s;

      // dU_ij/dd  (chain rule: F_i = -dU/dd * (r_ij/d))
      const dUdd =
        -n * A   / Math.pow(d, n + 1)
        + m * B  * cosDphi / Math.pow(d, m + 1)
        - p * C  * sisj    / Math.pow(d, p + 1);

      const fx = -dUdd * dx / d;
      const fy = -dUdd * dy / d;

      F[i].fx += fx;  F[i].fy += fy;
      F[j].fx -= fx;  F[j].fy -= fy;

      // dU_ij/dphi_i = B sin(dphi) / d^m
      const dUdphi = B * sinDphi / Math.pow(d, m);
      F[i].fphi -= dUdphi;
      F[j].fphi += dUdphi;
    }
  }
  return F;
}

function stepNodes(nodes, params, W, H) {
  const { dt, damping } = params;
  const F = computeForces(nodes, params);
  let E = 0;

  for (let i = 0; i < nodes.length; i++) {
    const nd = nodes[i];
    const f  = F[i];

    nd.vx   = (nd.vx   + f.fx   * dt) * damping;
    nd.vy   = (nd.vy   + f.fy   * dt) * damping;
    nd.vr   = (nd.vr   + f.fr   * dt) * damping;
    nd.vphi = (nd.vphi + f.fphi * dt) * damping;

    nd.x   += nd.vx   * dt;
    nd.y   += nd.vy   * dt;
    nd.r    = Math.max(3, nd.r + nd.vr * dt);
    nd.phi += nd.vphi * dt;

    // Reflective walls
    if (nd.x < nd.r)      { nd.x =  nd.r;      nd.vx *= -0.4; }
    if (nd.x > W - nd.r)  { nd.x =  W - nd.r;  nd.vx *= -0.4; }
    if (nd.y < nd.r)      { nd.y =  nd.r;      nd.vy *= -0.4; }
    if (nd.y > H - nd.r)  { nd.y =  H - nd.r;  nd.vy *= -0.4; }

    E += params.a * Math.pow(nd.r - params.r0, 2);
  }
  return Math.round(E);
}

function drawScene(canvas, nodes) {
  if (!canvas || !nodes) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, W, H);

  for (const nd of nodes) {
    const color = nd.s === 1 ? '#40916c' : '#e07b54';
    const alpha = nd.s === 1 ? '#40916c88' : '#e07b5488';

    // Ring
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, nd.r, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    ctx.stroke();

    // Phase arrow
    ctx.beginPath();
    ctx.moveTo(nd.x, nd.y);
    ctx.lineTo(nd.x + nd.r * Math.cos(nd.phi), nd.y + nd.r * Math.sin(nd.phi));
    ctx.strokeStyle = alpha;
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ── Slider row helper ───────────────────────────────────────────────────────
function Slider({ label, name, min, max, step = 1, value, onChange, fmt }) {
  return (
    <div className="sim-param-row">
      <span className="sim-param-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(name, +e.target.value)}
        className="sim-slider"
      />
      <span className="sim-param-val">{fmt ? fmt(value) : value}</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function LoopSimulation() {
  const canvasRef  = useRef(null);
  const nodesRef   = useRef(null);
  const paramsRef  = useRef(DEFAULTS);
  const animRef    = useRef(null);
  const runningRef = useRef(false);

  const [params,  setParams]  = useState(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [energy,  setEnergy]  = useState(0);
  const [gen,     setGen]     = useState(0);   // bump to force re-init

  // Keep paramsRef in sync
  useEffect(() => { paramsRef.current = params; }, [params]);

  // Canvas draw wrapper
  const draw = useCallback(() => {
    drawScene(canvasRef.current, nodesRef.current);
  }, []);

  // Init / re-init
  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    nodesRef.current = makeNodes(
      paramsRef.current.N,
      canvas.width, canvas.height,
      paramsRef.current.r0,
    );
    setEnergy(0);
    draw();
  }, [draw]);

  // Animation loop
  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    let last = 0;
    function loop(t) {
      if (t - last > 14) {   // ~60 fps cap
        const canvas = canvasRef.current;
        if (canvas && nodesRef.current) {
          // Run several physics steps per frame for speed
          let e = 0;
          for (let i = 0; i < 6; i++) {
            e = stepNodes(nodesRef.current, paramsRef.current, canvas.width, canvas.height);
          }
          setEnergy(e);
          drawScene(canvas, nodesRef.current);
        }
        last = t;
      }
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [running]);

  // Init on mount and whenever gen changes
  useEffect(() => { init(); }, [gen, init]);

  function reset() {
    setRunning(false);
    runningRef.current = false;
    cancelAnimationFrame(animRef.current);
    setGen(g => g + 1);
  }

  function toggleRun() {
    setRunning(r => !r);
  }

  function flipRandomChirality() {
    if (!nodesRef.current) return;
    const i = Math.floor(Math.random() * nodesRef.current.length);
    nodesRef.current[i].s *= -1;
    draw();
  }

  function randomisePhases() {
    if (!nodesRef.current) return;
    nodesRef.current.forEach(nd => { nd.phi = Math.random() * 2 * Math.PI; });
    draw();
  }

  function handleParam(name, value) {
    setParams(p => {
      const next = { ...p, [name]: value };
      paramsRef.current = next;
      return next;
    });
    // Re-init if structural params change
    if (name === 'N') {
      cancelAnimationFrame(animRef.current);
      setRunning(false);
      setGen(g => g + 1);
    }
  }

  return (
    <div className="sim-wrap">
      <div className="sim-header">
        <h2 className="sim-title">Loop Node Model</h2>
        <p className="sim-sub">
          Each node C<sub>i</sub> = (x, y, r, φ, s). Energy minimisation
          reveals clusters, shells, chains &amp; lattices.
        </p>
      </div>

      <div className="sim-toolbar">
        <button
          className={`sim-btn ${running ? 'sim-btn--stop' : 'sim-btn--run'}`}
          onClick={toggleRun}
        >
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button className="sim-btn sim-btn--reset" onClick={reset}>↺ Reset</button>
        <button className="sim-btn sim-btn--action" onClick={flipRandomChirality}>± Chirality</button>
        <button className="sim-btn sim-btn--action" onClick={randomisePhases}>∿ Phases</button>
        <span className="sim-energy-badge">E<sub>r</sub> ≈ {energy}</span>
      </div>

      <canvas ref={canvasRef} width={620} height={420} className="sim-canvas" />

      <div className="sim-legend">
        <span className="sim-legend-item sim-legend-pos">◯ s = +1</span>
        <span className="sim-legend-item sim-legend-neg">◯ s = −1</span>
        <span className="sim-legend-note">Arrow = phase φ</span>
      </div>

      <details className="sim-params-panel" open>
        <summary className="sim-params-title">Parameters</summary>
        <div className="sim-params-grid">
          <div className="sim-params-col">
            <p className="sim-params-section">Structure</p>
            <Slider label="Nodes N"      name="N"   min={5}   max={80}    value={params.N}   onChange={handleParam} />
            <Slider label="Natural r₀"   name="r0"  min={5}   max={35}    value={params.r0}  onChange={handleParam} />
            <Slider label="Radius spring a" name="a" min={0.1} max={5} step={0.1} value={params.a} onChange={handleParam} />
          </div>
          <div className="sim-params-col">
            <p className="sim-params-section">Interaction strengths</p>
            <Slider label="Exclusion A"   name="A"  min={100}  max={20000} step={100} value={params.A} onChange={handleParam} />
            <Slider label="Phase lock B"  name="B"  min={0}    max={2000}  step={10}  value={params.B} onChange={handleParam} />
            <Slider label="Chirality C"   name="C"  min={0}    max={2000}  step={10}  value={params.C} onChange={handleParam} />
          </div>
          <div className="sim-params-col">
            <p className="sim-params-section">Exponents</p>
            <Slider label="Exclusion n"  name="n"  min={2} max={12} value={params.n} onChange={handleParam} />
            <Slider label="Phase m"      name="m"  min={1} max={8}  value={params.m} onChange={handleParam} />
            <Slider label="Chirality p"  name="p"  min={1} max={8}  value={params.p} onChange={handleParam} />
          </div>
          <div className="sim-params-col">
            <p className="sim-params-section">Dynamics</p>
            <Slider label="Step dt"      name="dt"      min={0.005} max={0.08}  step={0.005} value={params.dt}      onChange={handleParam} fmt={v => v.toFixed(3)} />
            <Slider label="Damping"      name="damping" min={0.5}   max={0.99}  step={0.01}  value={params.damping} onChange={handleParam} fmt={v => v.toFixed(2)} />
          </div>
        </div>
      </details>

      <div className="sim-equation">
        <p>
          E = Σ a(rᵢ−r₀)² + Σ<sub>i&lt;j</sub>[A/d<sup>n</sup> − B·cos(Δφ)/d<sup>m</sup> + C·sᵢsⱼ/d<sup>p</sup>]
        </p>
      </div>
    </div>
  );
}
