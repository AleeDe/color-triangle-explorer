import React, { useState, useCallback, useRef, useMemo } from "react";

// --- Types ---
interface Vertex {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

interface Point {
  x: number;
  y: number;
}

type PointLocation = "inside" | "edge" | "outside";

interface EdgeInfo {
  edgeIndex: number; // 0=AB, 1=BC, 2=CA
  t: number;
}

// --- Geometry helpers ---
function cross2D(ox: number, oy: number, ax: number, ay: number, bx: number, by: number) {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

function triangleArea(a: Vertex, b: Vertex, c: Vertex) {
  return 0.5 * Math.abs(cross2D(a.x, a.y, b.x, b.y, c.x, c.y));
}

function isDegenerate(a: Vertex, b: Vertex, c: Vertex) {
  return triangleArea(a, b, c) < 0.5;
}

function sign(n: number) {
  if (Math.abs(n) < 1e-6) return 0;
  return n > 0 ? 1 : -1;
}

function pointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number | null {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return null;
  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < -0.01 || t > 1.01) return null;
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  if (dist < 5) return Math.max(0, Math.min(1, t));
  return null;
}

function classifyPoint(p: Point, a: Vertex, b: Vertex, c: Vertex): { location: PointLocation; edge?: EdgeInfo; bary?: [number, number, number]; crosses: [number, number, number] } {
  const d1 = cross2D(a.x, a.y, b.x, b.y, p.x, p.y);
  const d2 = cross2D(b.x, b.y, c.x, c.y, p.x, p.y);
  const d3 = cross2D(c.x, c.y, a.x, a.y, p.x, p.y);
  const crosses: [number, number, number] = [d1, d2, d3];

  // Check edges
  const edges: [Vertex, Vertex][] = [[a, b], [b, c], [c, a]];
  for (let i = 0; i < 3; i++) {
    const t = pointOnSegment(p.x, p.y, edges[i][0].x, edges[i][0].y, edges[i][1].x, edges[i][1].y);
    if (t !== null) {
      return { location: "edge", edge: { edgeIndex: i, t }, crosses };
    }
  }

  const s1 = sign(d1);
  const s2 = sign(d2);
  const s3 = sign(d3);

  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;

  if (!(hasNeg && hasPos)) {
    // Inside — compute barycentric
    const area = cross2D(a.x, a.y, b.x, b.y, c.x, c.y);
    const l1 = cross2D(b.x, b.y, c.x, c.y, p.x, p.y) / area;
    const l2 = cross2D(c.x, c.y, a.x, a.y, p.x, p.y) / area;
    const l3 = 1 - l1 - l2;
    return { location: "inside", bary: [l1, l2, l3], crosses };
  }

  return { location: "outside", crosses };
}

function lerpColor(a: Vertex, b: Vertex, t: number): [number, number, number] {
  return [
    a.r + t * (b.r - a.r),
    a.g + t * (b.g - a.g),
    a.b + t * (b.b - a.b),
  ];
}

function baryColor(a: Vertex, b: Vertex, c: Vertex, l1: number, l2: number, l3: number): [number, number, number] {
  return [
    l1 * a.r + l2 * b.r + l3 * c.r,
    l1 * a.g + l2 * b.g + l3 * c.g,
    l1 * a.b + l2 * b.b + l3 * c.b,
  ];
}

function clampRGB(v: number) {
  return Math.max(0, Math.min(255, v));
}

function fmt(n: number, d = 4) {
  return n.toFixed(d);
}

// --- Collapsible Section ---
function Section({ title, defaultOpen = false, children, badge }: { title: string; defaultOpen?: boolean; children: React.ReactNode; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary transition-colors text-left"
      >
        <span className="font-semibold text-sm text-foreground flex items-center gap-2">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          {title}
        </span>
        {badge}
      </button>
      {open && <div className="px-4 py-3 bg-card">{children}</div>}
    </div>
  );
}

// --- Color swatch ---
function ColorSwatch({ r, g, b, size = "lg" }: { r: number; g: number; b: number; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-8 h-8";
  return (
    <div
      className={`${dim} rounded-lg border-2 border-border shadow-md`}
      style={{ backgroundColor: `rgb(${clampRGB(r)},${clampRGB(g)},${clampRGB(b)})` }}
      title={`rgb(${clampRGB(r)}, ${clampRGB(g)}, ${clampRGB(b)})`}
    />
  );
}

// --- Number input ---
function NumInput({ label, value, onChange, min, max, step, color }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        step={step ?? 0.01}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-24 px-2 py-1.5 rounded-md border border-input bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        style={color ? { borderLeftWidth: 3, borderLeftColor: color } : undefined}
      />
    </label>
  );
}

// --- Constants ---
const HANDLE_R = 10;

const EDGE_NAMES = ["AB", "BC", "CA"];
const VERTEX_COLORS_HEX = ["#e53e3e", "#38a169", "#3b82f6"];
const VERTEX_LABELS = ["A", "B", "C"];

const DEFAULT_VERTICES: [Vertex, Vertex, Vertex] = [
  { x: 250, y: 60, r: 255, g: 30, b: 30 },
  { x: 80, y: 350, r: 30, g: 200, b: 30 },
  { x: 420, y: 350, r: 30, g: 30, b: 255 },
];
const DEFAULT_TARGET: Point = { x: 250, y: 240 };

// --- Main Component ---
export default function TriangleColorInterpolation() {
  const [vertices, setVertices] = useState<[Vertex, Vertex, Vertex]>([...DEFAULT_VERTICES]);
  const [target, setTarget] = useState<Point>({ ...DEFAULT_TARGET });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<null | "A" | "B" | "C" | "P">(null);

  const updateVertex = useCallback((idx: number, patch: Partial<Vertex>) => {
    setVertices((v) => {
      const copy = [...v] as [Vertex, Vertex, Vertex];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }, []);

  const reset = useCallback(() => {
    setVertices([...DEFAULT_VERTICES]);
    setTarget({ ...DEFAULT_TARGET });
  }, []);

  // Dynamic viewBox based on all points
  const viewBox = useMemo(() => {
    const allX = [...vertices.map(v => v.x), target.x];
    const allY = [...vertices.map(v => v.y), target.y];
    const pad = 40;
    const minX = Math.min(...allX) - pad;
    const minY = Math.min(...allY) - pad;
    const maxX = Math.max(...allX) + pad;
    const maxY = Math.max(...allY) + pad;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [vertices, target]);

  // SVG drag
  const toSVG = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(viewBox.minX + ((e.clientX - rect.left) / rect.width) * viewBox.w),
      y: Math.round(viewBox.minY + ((e.clientY - rect.top) / rect.height) * viewBox.h),
    };
  }, [viewBox]);

  const onMouseDown = useCallback((id: "A" | "B" | "C" | "P") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = id;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const pt = toSVG(e);
    if (dragging.current === "P") setTarget(pt);
    else {
      const idx = dragging.current.charCodeAt(0) - 65;
      updateVertex(idx, pt);
    }
  }, [toSVG, updateVertex]);

  const onMouseUp = useCallback(() => { dragging.current = null; }, []);

  // Classification
  const result = useMemo(() => classifyPoint(target, ...vertices), [target, vertices]);
  const degenerate = useMemo(() => isDegenerate(...vertices), [vertices]);
  const area = useMemo(() => triangleArea(...vertices), [vertices]);

  // Computed color
  const computedColor = useMemo<[number, number, number] | null>(() => {
    if (degenerate) return null;
    if (result.location === "edge" && result.edge) {
      const { edgeIndex, t } = result.edge;
      const edges: [Vertex, Vertex][] = [[vertices[0], vertices[1]], [vertices[1], vertices[2]], [vertices[2], vertices[0]]];
      return lerpColor(edges[edgeIndex][0], edges[edgeIndex][1], t);
    }
    if (result.location === "inside" && result.bary) {
      return baryColor(vertices[0], vertices[1], vertices[2], ...result.bary);
    }
    return null;
  }, [result, vertices, degenerate]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Triangle Color Interpolation
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Drag the vertices and target point to explore how colors are interpolated across a 2D triangle using <strong>barycentric coordinates</strong> and <strong>linear interpolation</strong>.
            </p>
          </div>
          <button
            onClick={reset}
            className="mt-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/70 transition-colors border border-border"
          >
            ↺ Reset
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Canvas */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`}
              className="w-full cursor-crosshair select-none"
              style={{ aspectRatio: `${viewBox.w} / ${viewBox.h}`, minHeight: 300, maxHeight: 500 }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(220,15%,90%)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.w} height={viewBox.h} fill="hsl(220,20%,97%)" />
              <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.w} height={viewBox.h} fill="url(#grid)" />
              {/* Axes */}
              <line x1={viewBox.minX} y1={0} x2={viewBox.minX + viewBox.w} y2={0} stroke="hsl(220,15%,80%)" strokeWidth="0.8" />
              <line x1={0} y1={viewBox.minY} x2={0} y2={viewBox.minY + viewBox.h} stroke="hsl(220,15%,80%)" strokeWidth="0.8" />

              {/* Filled triangle */}
              <polygon
                points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
                fill="hsl(215,70%,45%)"
                fillOpacity={0.06}
                stroke="hsl(220,15%,75%)"
                strokeWidth={1.5}
              />

              {/* Edges with colored gradient */}
              {[[0, 1], [1, 2], [2, 0]].map(([i, j], idx) => (
                <line
                  key={idx}
                  x1={vertices[i].x} y1={vertices[i].y}
                  x2={vertices[j].x} y2={vertices[j].y}
                  stroke={VERTEX_COLORS_HEX[i]}
                  strokeWidth={2}
                  strokeOpacity={0.4}
                />
              ))}

              {/* Vertex handles */}
              {vertices.map((v, i) => (
                <g key={i} onMouseDown={onMouseDown(VERTEX_LABELS[i] as "A" | "B" | "C")} className="cursor-grab">
                  <circle cx={v.x} cy={v.y} r={HANDLE_R + 4} fill="transparent" />
                  <circle cx={v.x} cy={v.y} r={HANDLE_R} fill={VERTEX_COLORS_HEX[i]} stroke="white" strokeWidth={2.5} />
                  <text x={v.x} y={v.y + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="bold" className="pointer-events-none select-none">
                    {VERTEX_LABELS[i]}
                  </text>
                  {/* Small color swatch near vertex */}
                  <rect x={v.x + 14} y={v.y - 10} width={20} height={20} rx={4}
                    fill={`rgb(${v.r},${v.g},${v.b})`} stroke="white" strokeWidth={1.5} className="pointer-events-none" />
                </g>
              ))}

              {/* Target point */}
              <g onMouseDown={onMouseDown("P")} className="cursor-grab">
                <circle cx={target.x} cy={target.y} r={HANDLE_R + 6} fill="transparent" />
                <circle cx={target.x} cy={target.y} r={7} fill={computedColor ? `rgb(${computedColor[0]},${computedColor[1]},${computedColor[2]})` : "hsl(220,10%,50%)"} stroke="white" strokeWidth={2.5} />
                <circle cx={target.x} cy={target.y} r={12} fill="none" stroke={computedColor ? `rgb(${computedColor[0]},${computedColor[1]},${computedColor[2]})` : "hsl(220,10%,50%)"} strokeWidth={1.5} strokeDasharray="3 3" className="pointer-events-none" />
                <text x={target.x} y={target.y - 18} textAnchor="middle" fill="hsl(220,25%,20%)" fontSize="11" fontWeight="600" className="pointer-events-none select-none">P</text>
              </g>
            </svg>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Status badge */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              {degenerate ? (
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <span className="inline-block w-3 h-3 rounded-full bg-destructive" />
                  Degenerate triangle (area ≈ 0). Adjust vertices.
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${
                    result.location === "inside" ? "bg-accent" : result.location === "edge" ? "bg-primary" : "bg-muted-foreground"
                  }`} />
                  <span className="font-semibold text-sm text-foreground">
                    Point P is {result.location === "inside" ? "inside the triangle" : result.location === "edge" ? `on edge ${EDGE_NAMES[result.edge!.edgeIndex]}` : "outside the triangle"}
                  </span>
                </div>
              )}

              {/* Result color */}
              {computedColor && (
                <div className="mt-4 flex items-center gap-4 p-3 rounded-lg bg-math border border-border">
                  <ColorSwatch r={computedColor[0]} g={computedColor[1]} b={computedColor[2]} />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">Interpolated Color</div>
                    <div className="font-mono font-semibold text-foreground text-lg">
                      rgb({computedColor[0]}, {computedColor[1]}, {computedColor[2]})
                    </div>
                  </div>
                </div>
              )}
              {result.location === "outside" && !degenerate && (
                <p className="mt-3 text-xs text-muted-foreground">Drag point P inside the triangle or onto an edge to compute a color.</p>
              )}
            </div>

            {/* Vertex Inputs */}
            <Section title="Vertex Coordinates & Colors" defaultOpen={true}>
              <div className="space-y-3">
                {vertices.map((v, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: VERTEX_COLORS_HEX[i] }} />
                      <span className="text-sm font-semibold text-foreground">Vertex {VERTEX_LABELS[i]}</span>
                      <ColorSwatch r={v.r} g={v.g} b={v.b} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <NumInput label="x" value={v.x} onChange={(val) => updateVertex(i, { x: val })} color={VERTEX_COLORS_HEX[i]} />
                      <NumInput label="y" value={v.y} onChange={(val) => updateVertex(i, { y: val })} color={VERTEX_COLORS_HEX[i]} />
                      <NumInput label="R" value={v.r} onChange={(val) => updateVertex(i, { r: clampRGB(val) })} min={0} max={255} />
                      <NumInput label="G" value={v.g} onChange={(val) => updateVertex(i, { g: clampRGB(val) })} min={0} max={255} />
                      <NumInput label="B" value={v.b} onChange={(val) => updateVertex(i, { b: clampRGB(val) })} min={0} max={255} />
                    </div>
                  </div>
                ))}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-foreground" />
                    <span className="text-sm font-semibold text-foreground">Target P</span>
                  </div>
                  <div className="flex gap-2">
                    <NumInput label="x" value={target.x} onChange={(val) => setTarget((p) => ({ ...p, x: val }))} />
                    <NumInput label="y" value={target.y} onChange={(val) => setTarget((p) => ({ ...p, y: val }))} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Math Steps */}
            <Section title="Point-in-Triangle Test" badge={
              <span className="text-xs font-mono bg-math text-math-foreground px-2 py-0.5 rounded">cross products</span>
            }>
              <div className="font-mono text-xs leading-relaxed space-y-1 text-math-foreground">
                <p>d₁ = cross(A→B, A→P) = <strong>{fmt(result.crosses[0])}</strong></p>
                <p>d₂ = cross(B→C, B→P) = <strong>{fmt(result.crosses[1])}</strong></p>
                <p>d₃ = cross(C→A, C→P) = <strong>{fmt(result.crosses[2])}</strong></p>
                <p className="pt-1 text-muted-foreground">
                  {result.location === "inside" && "All same sign → P is inside."}
                  {result.location === "edge" && "One ≈ 0, P is on an edge."}
                  {result.location === "outside" && "Mixed signs → P is outside."}
                </p>
                <p className="text-muted-foreground">Triangle area = {fmt(area, 1)} px²</p>
              </div>
            </Section>

            {result.location === "edge" && result.edge && (
              <Section title={`LERP on Edge ${EDGE_NAMES[result.edge.edgeIndex]}`} defaultOpen={true} badge={
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">t = {fmt(result.edge.t, 3)}</span>
              }>
                {(() => {
                  const { edgeIndex, t } = result.edge!;
                  const edges: [Vertex, Vertex][] = [[vertices[0], vertices[1]], [vertices[1], vertices[2]], [vertices[2], vertices[0]]];
                  const [va, vb] = edges[edgeIndex];
                  const labels = [["A", "B"], ["B", "C"], ["C", "A"]][edgeIndex];
                  return (
                    <div className="font-mono text-xs leading-relaxed text-math-foreground space-y-2">
                      <p>t = {fmt(t, 3)}</p>
                      <p>Color = (1−t)·C<sub>{labels[0]}</sub> + t·C<sub>{labels[1]}</sub></p>
                      <div className="bg-math rounded p-2 space-y-1">
                        <p>R = (1−{fmt(t)})·{va.r} + {fmt(t)}·{vb.r} = <strong>{computedColor?.[0]}</strong></p>
                        <p>G = (1−{fmt(t)})·{va.g} + {fmt(t)}·{vb.g} = <strong>{computedColor?.[1]}</strong></p>
                        <p>B = (1−{fmt(t)})·{va.b} + {fmt(t)}·{vb.b} = <strong>{computedColor?.[2]}</strong></p>
                      </div>
                    </div>
                  );
                })()}
              </Section>
            )}

            {result.location === "inside" && result.bary && (
              <Section title="Barycentric Interpolation" defaultOpen={true} badge={
                <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">λ₁+λ₂+λ₃=1</span>
              }>
                <div className="font-mono text-xs leading-relaxed text-math-foreground space-y-2">
                  <p>λ₁ (A) = {fmt(result.bary[0])}</p>
                  <p>λ₂ (B) = {fmt(result.bary[1])}</p>
                  <p>λ₃ (C) = {fmt(result.bary[2])}</p>
                  <p className="text-muted-foreground">Sum = {fmt(result.bary[0] + result.bary[1] + result.bary[2])}</p>
                  <div className="bg-math rounded p-2 space-y-1">
                    <p>R = {fmt(result.bary[0])}·{vertices[0].r} + {fmt(result.bary[1])}·{vertices[1].r} + {fmt(result.bary[2])}·{vertices[2].r} = <strong>{computedColor?.[0]}</strong></p>
                    <p>G = {fmt(result.bary[0])}·{vertices[0].g} + {fmt(result.bary[1])}·{vertices[1].g} + {fmt(result.bary[2])}·{vertices[2].g} = <strong>{computedColor?.[1]}</strong></p>
                    <p>B = {fmt(result.bary[0])}·{vertices[0].b} + {fmt(result.bary[1])}·{vertices[1].b} + {fmt(result.bary[2])}·{vertices[2].b} = <strong>{computedColor?.[2]}</strong></p>
                  </div>
                </div>
              </Section>
            )}

            {/* Method explanation */}
            <Section title="Why Barycentric?">
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  <strong className="text-foreground">Barycentric interpolation</strong> is the general solution for interpolating values across a triangle. It expresses any interior point as a weighted combination of the three vertices, where the weights (λ₁, λ₂, λ₃) sum to 1.
                </p>
                <p>
                  <strong className="text-foreground">Linear interpolation (LERP)</strong> is the special case when the point lies exactly on an edge — reducing the problem to a 1D blend between two endpoints with parameter <em>t</em>.
                </p>
                <p className="text-xs">
                  On an edge, the barycentric coordinate of the opposite vertex becomes 0, and the remaining two coordinates become (1−t) and t — showing that LERP is simply a degenerate case of barycentric interpolation.
                </p>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
