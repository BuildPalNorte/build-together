'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from 'react';
import { FILAMENT_SCORE, STRONG_MATCH_SCORE } from '@/lib/events/constants';
import type { PublicConnection, PublicParticipant } from '@/lib/events/types';
import {
  DARK_SCHEME,
  LIGHT_SCHEME,
  hueOf,
  type CanvasScheme,
} from '@/lib/network/palette';
import { firstName, initialsOf } from '@/lib/network/people';
import { curvatureOf, threadsToDraw } from '@/lib/network/threads';
import { GraphModel } from './graph-model';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

export type GraphVariant = 'home' | 'stage';

export interface GraphNode {
  id: string;
  person: PublicParticipant;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  id: string;
  source: GraphNode;
  target: GraphNode;
  score: number;
  reason: string;
}

export interface ThreadInfo {
  id: string;
  names: [string, string];
  score: number;
  reason: string;
}

export interface GraphHandle {
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
}

interface Force {
  (alpha: number): void;
  initialize?: (nodes: GraphNode[]) => void;
  strength?: (value: number | ((link: GraphLink) => number)) => Force;
  distance?: (value: number | ((link: GraphLink) => number)) => Force;
}

interface ForceGraphInstance {
  centerAt(x?: number, y?: number, ms?: number): ForceGraphInstance | { x: number; y: number };
  zoom(k?: number, ms?: number): ForceGraphInstance | number;
  d3Force(name: string, fn?: unknown): Force | undefined;
  d3ReheatSimulation(): void;
}

/* -------------------------------------------------------------------------------------------------
 * Constants from docs/design.md › The room
 * -----------------------------------------------------------------------------------------------*/

const STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';
const DIM_ALPHA = 0.28;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 5;
const CAMERA_MS = 480;
const FIT_MS = 600;

const FORCES = {
  home: { charge: -72, collide: 30, radius: 14, panel: 360, settle: [0.8, 1.35] as const },
  stage: { charge: -90, collide: 34, radius: 16, panel: 380, settle: [0.95, 1.35] as const },
};

const FIT_CAP = 1.2;

/* -------------------------------------------------------------------------------------------------
 * Client-only force graph. Ref is forwarded through a wrapper because next/dynamic does not forward it.
 * -----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

const ForceGraph2D = dynamic<AnyProps>(
  async () => {
    const mod = await import('react-force-graph-2d');
    const Graph = mod.default as unknown as React.ComponentType<AnyProps>;
    return function ForceGraphWithRef({ graphRef, ...props }: AnyProps) {
      return <Graph ref={graphRef} {...props} />;
    };
  },
  { ssr: false },
);

/* -------------------------------------------------------------------------------------------------
 * Media queries
 * -----------------------------------------------------------------------------------------------*/

function useMedia(query: string, server = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* -------------------------------------------------------------------------------------------------
 * Paint state. Lives in a ref so the canvas callbacks stay stable and React never re-renders the hot path.
 * -----------------------------------------------------------------------------------------------*/

interface PaintState {
  variant: GraphVariant;
  meId: string | null;
  selectedId: string | null;
  hoveredId: string | null;
  hoverLinkId: string | null;
  pinnedLinkId: string | null;
  highlightLinkId: string | null;
  connected: Set<string>;
  drawn: Set<string>;
  peopleCount: number;
  scheme: CanvasScheme;
  contrast: boolean;
}

/** Mutable paint state, owned by one component instance. Written from effects and canvas callbacks only. */
class PaintStore {
  state: PaintState;
  constructor(initial: PaintState) {
    this.state = initial;
  }
  patch(next: Partial<PaintState>) {
    Object.assign(this.state, next);
  }
}

const isFiniteNode = (n: GraphNode) => Number.isFinite(n.x) && Number.isFinite(n.y);

function focusOf(s: PaintState): string | null {
  return s.selectedId ?? s.hoveredId;
}

function isDimmedNode(s: PaintState, id: string) {
  const focus = focusOf(s);
  return focus !== null && id !== focus && !s.connected.has(id);
}

function isLinkVisible(s: PaintState, l: GraphLink) {
  return s.drawn.has(l.id) || (s.selectedId !== null && (l.source.id === s.selectedId || l.target.id === s.selectedId));
}

/** docs/design.md › The node. Seven steps, every gradient centered on the node. */
function paintNode(node: GraphNode, ctx: CanvasRenderingContext2D, k: number, s: PaintState) {
  if (!isFiniteNode(node)) {
    node.x = 0;
    node.y = 0;
    node.vx = 0;
    node.vy = 0;
    return;
  }
  const x = node.x as number;
  const y = node.y as number;
  const isYou = node.id === s.meId;
  const isSelected = node.id === s.selectedId;
  const isHovered = node.id === s.hoveredId;
  const dimmed = isDimmedNode(s, node.id);
  const radius = FORCES[s.variant].radius + (isYou ? 1 : 0);
  const hue = hueOf(node.person.discipline);

  ctx.save();
  ctx.globalAlpha = dimmed ? DIM_ALPHA : 1;

  // 1. Halo: starts outside the body, reads as a leak of the rim.
  if (!dimmed) {
    const glowR = radius * (s.contrast ? 1.3 : 1.8);
    const halo = ctx.createRadialGradient(x, y, radius * 0.9, x, y, glowR);
    halo.addColorStop(0, `rgba(${hue.glow}, ${isYou ? 0.2 : 0.12})`);
    halo.addColorStop(1, `rgba(${hue.glow}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Body: a flat near-black of the same hue.
  ctx.fillStyle = hue.core;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rim glow, clipped to the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const rim = ctx.createRadialGradient(x, y, radius * 0.38, x, y, radius);
  rim.addColorStop(0, `rgba(${hue.glow}, 0)`);
  rim.addColorStop(0.62, `rgba(${hue.glow}, ${dimmed ? 0.1 : 0.22})`);
  rim.addColorStop(1, `rgba(${hue.glow}, ${s.contrast ? 1 : 0.92})`);
  ctx.fillStyle = rim;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();

  // 4. Edge line.
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${hue.glow}, 0.55)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Focus ring: you, the selected person, or the hovered person.
  if (isYou || isSelected || isHovered) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = s.scheme.ring;
    ctx.lineWidth = Math.max(1 / k, 0.4);
    ctx.stroke();
  }

  // 6. Initials.
  ctx.fillStyle = '#f5f5f7';
  ctx.font = `600 ${Math.max(11, radius * 0.5)}px ${STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initialsOf(node.person.displayName), x, y + 0.5);

  // 7. Name below the node.
  const showName =
    s.variant === 'stage' ||
    isYou ||
    isSelected ||
    isHovered ||
    (s.peopleCount <= 16 && k > 0.55) ||
    (s.selectedId !== null && !dimmed);
  if (showName) {
    const size = (s.variant === 'stage' ? 15 : 13) / k;
    ctx.fillStyle = s.scheme.paper;
    ctx.font = `500 ${size}px ${STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(firstName(node.person.displayName), x, y + radius + 7 / k);
  }
  ctx.restore();
}

function linkPath(link: GraphLink, ctx: CanvasRenderingContext2D) {
  const sx = link.source.x as number;
  const sy = link.source.y as number;
  const tx = link.target.x as number;
  const ty = link.target.y as number;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const factor = link.score >= STRONG_MATCH_SCORE ? 0.08 : 0.2;
  const offset = factor * Math.min(len, 36) * curvatureOf(link.id);
  const cx = (sx + tx) / 2 + (-dy / len) * offset;
  const cy = (sy + ty) / 2 + (dx / len) * offset;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, tx, ty);
}

/** docs/design.md › Threads. Three stroke states, hairline widths divided by zoom. */
function paintLink(link: GraphLink, ctx: CanvasRenderingContext2D, k: number, s: PaintState) {
  if (!isFiniteNode(link.source) || !isFiniteNode(link.target)) return;
  const focus = focusOf(s);
  const touches = focus !== null && (link.source.id === focus || link.target.id === focus);
  const active =
    link.id === s.hoverLinkId || link.id === s.pinnedLinkId || link.id === s.highlightLinkId;

  let strong: boolean;
  let dim = false;
  if (active || touches) strong = true;
  else if (focus !== null) {
    strong = false;
    dim = true;
  } else strong = link.score >= FILAMENT_SCORE;

  if (dim) ctx.strokeStyle = s.scheme.threadDim;
  else if (strong) ctx.strokeStyle = s.contrast ? s.scheme.threadStrongContrast : s.scheme.threadStrong;
  else ctx.strokeStyle = s.contrast ? s.scheme.threadWeakContrast : s.scheme.threadWeak;

  ctx.lineWidth = (strong ? 1.35 : 1) / k;
  ctx.lineCap = 'round';
  linkPath(link, ctx);
  ctx.stroke();
}

/** Same curve, 16px wide on screen. */
function paintLinkPointerArea(link: GraphLink, color: string, ctx: CanvasRenderingContext2D, k: number) {
  if (!isFiniteNode(link.source) || !isFiniteNode(link.target)) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 16 / k;
  ctx.lineCap = 'round';
  linkPath(link, ctx);
  ctx.stroke();
}

function paintNodePointerArea(node: GraphNode, color: string, ctx: CanvasRenderingContext2D, k: number, s: PaintState) {
  if (!isFiniteNode(node)) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x as number, node.y as number, Math.max(14 / k, FORCES[s.variant].radius), 0, Math.PI * 2);
  ctx.fill();
}

/** A simple collision force, so the graph needs no extra d3 dependency. */
function createCollideForce(radius: number): Force {
  let nodes: GraphNode[] = [];
  const min = radius * 2;
  const force: Force = () => {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!isFiniteNode(a)) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        if (!isFiniteNode(b)) continue;
        let dx = (b.x as number) - (a.x as number);
        let dy = (b.y as number) - (a.y as number);
        let d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 === 0) {
          dx = (Math.random() - 0.5) * 1e-3;
          dy = (Math.random() - 0.5) * 1e-3;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * 0.7;
        a.vx = (a.vx ?? 0) - dx * push;
        a.vy = (a.vy ?? 0) - dy * push;
        b.vx = (b.vx ?? 0) + dx * push;
        b.vy = (b.vy ?? 0) + dy * push;
      }
    }
  };
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/* -------------------------------------------------------------------------------------------------
 * Component
 * -----------------------------------------------------------------------------------------------*/

interface NetworkGraphProps {
  variant: GraphVariant;
  participants: PublicParticipant[];
  connections: PublicConnection[];
  loaded: boolean;
  meId: string | null;
  selectedId: string | null;
  highlightLinkId: string | null;
  panelOpen: boolean;
  railOpen?: boolean;
  hasAction?: boolean;
  onSelect(id: string | null): void;
  onThread(info: ThreadInfo | null): void;
  ref?: Ref<GraphHandle>;
}

export function NetworkGraph({
  variant,
  participants,
  connections,
  loaded,
  meId,
  selectedId,
  highlightLinkId,
  panelOpen,
  railOpen = false,
  hasAction = false,
  onSelect,
  onThread,
  ref,
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fgRef = useRef<ForceGraphInstance | null>(null);
  const zoomRef = useRef(1);
  const lightScheme = useMedia('(prefers-color-scheme: light)');
  const contrast = useMedia('(prefers-contrast: more)');

  const [model] = useState(() => new GraphModel());
  const graph = model.sync(participants, connections);
  const drawn = useMemo(() => threadsToDraw(connections), [connections]);
  const strongCount = useMemo(() => connections.filter((c) => c.score >= FILAMENT_SCORE).length, [connections]);

  const [store] = useState(
    () =>
      new PaintStore({
        variant: 'home',
        meId: null,
        selectedId: null,
        hoveredId: null,
        hoverLinkId: null,
        pinnedLinkId: null,
        highlightLinkId: null,
        connected: new Set(),
        drawn: new Set(),
        peopleCount: 0,
        scheme: DARK_SCHEME,
        contrast: false,
      }),
  );

  /* Latest props for callbacks that must stay referentially stable. */
  const live = useRef({ onSelect, onThread, selectedId, graph });
  useLayoutEffect(() => {
    live.current = { onSelect, onThread, selectedId, graph };
  });

  const requestRedraw = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const c = fg.centerAt() as { x: number; y: number };
    fg.centerAt(c.x, c.y);
  }, []);

  const emitThread = useCallback(() => {
    const s = store.state;
    const id = s.hoverLinkId ?? s.pinnedLinkId;
    const link = id ? live.current.graph.linkById.get(id) : undefined;
    live.current.onThread(
      link
        ? {
            id: link.id,
            names: [link.source.person.displayName, link.target.person.displayName],
            score: link.score,
            reason: link.reason,
          }
        : null,
    );
  }, [store]);

  const recomputeConnected = useCallback(() => {
    const focus = focusOf(store.state);
    const set = new Set<string>();
    if (focus) {
      for (const l of live.current.graph.links) {
        if (l.source.id === focus) set.add(l.target.id);
        else if (l.target.id === focus) set.add(l.source.id);
      }
    }
    store.patch({ connected: set });
  }, [store]);

  /* Sync props into the paint state, then redraw once. */
  useLayoutEffect(() => {
    const s = store.state;
    store.patch({
      variant,
      meId,
      selectedId,
      highlightLinkId,
      drawn,
      peopleCount: participants.length,
      scheme: lightScheme ? LIGHT_SCHEME : DARK_SCHEME,
      contrast,
    });
    if (s.hoverLinkId && !graph.linkById.has(s.hoverLinkId)) store.patch({ hoverLinkId: null });
    if (s.hoveredId && !model.node(s.hoveredId)) store.patch({ hoveredId: null });
    // A pin is dropped when its thread is no longer drawn.
    if (s.pinnedLinkId) {
      const pinned = graph.linkById.get(s.pinnedLinkId);
      if (!pinned || !isLinkVisible(s, pinned)) store.patch({ pinnedLinkId: null });
    }
    recomputeConnected();
    emitThread();
    requestRedraw();
  }, [
    store,
    model,
    graph,
    variant,
    meId,
    selectedId,
    highlightLinkId,
    drawn,
    participants.length,
    lightScheme,
    contrast,
    recomputeConnected,
    emitThread,
    requestRedraw,
  ]);

  /* Container size. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Camera. */
  const panelWidth = Math.min(FORCES[variant].panel, size.w * 0.46);
  const sheetMode = size.w <= 720;

  const padding = useMemo(() => {
    if (variant === 'home') {
      return {
        top: 156,
        right: panelOpen && !sheetMode ? panelWidth : 36,
        bottom: hasAction ? 108 : 72,
        left: 36,
      };
    }
    return {
      top: 118,
      right: railOpen && !sheetMode ? 380 : panelOpen && !sheetMode ? panelWidth : 36,
      bottom: 36,
      left: 36,
    };
  }, [variant, panelOpen, panelWidth, hasAction, railOpen, sheetMode]);

  const fit = useCallback(
    (duration = FIT_MS) => {
      const fg = fgRef.current;
      const { w, h } = size;
      if (!fg || w === 0 || h === 0) return;
      const nodes = model.all().filter(isFiniteNode);
      if (nodes.length === 0) return;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const pad = FORCES[variant].radius + 24; // keep the rim and the name inside the box
      for (const n of nodes) {
        minX = Math.min(minX, (n.x as number) - pad);
        maxX = Math.max(maxX, (n.x as number) + pad);
        minY = Math.min(minY, (n.y as number) - pad);
        maxY = Math.max(maxY, (n.y as number) + pad);
      }
      const availW = Math.max(60, w - padding.left - padding.right);
      const availH = Math.max(60, h - padding.top - padding.bottom);
      const k = Math.min(FIT_CAP, Math.max(MIN_ZOOM, Math.min(availW / (maxX - minX), availH / (maxY - minY))));
      const regionCx = padding.left + availW / 2;
      const regionCy = padding.top + availH / 2;
      const cx = (minX + maxX) / 2 - (regionCx - w / 2) / k;
      const cy = (minY + maxY) / 2 - (regionCy - h / 2) / k;
      const ms = reducedMotion() ? 0 : duration;
      fg.centerAt(cx, cy, ms);
      fg.zoom(k, ms);
    },
    [size, padding, variant, model],
  );
  const fitRef = useRef(fit);
  useLayoutEffect(() => {
    fitRef.current = fit;
  }, [fit]);

  /* Fit when the room settles, and when the padding or container changes. */
  useEffect(() => {
    if (live.current.selectedId) return;
    const id = requestAnimationFrame(() => fitRef.current());
    return () => cancelAnimationFrame(id);
  }, [padding, size, loaded]);

  const handleEngineStop = useCallback(() => {
    if (!live.current.selectedId) fitRef.current();
  }, []);

  /* Ease onto a selected person; ease back to the room when the panel closes. */
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    const fg = fgRef.current;
    const previous = prevSelected.current;
    prevSelected.current = selectedId;
    if (!fg) return;
    const ms = reducedMotion() ? 0 : CAMERA_MS;
    if (selectedId) {
      const node = model.node(selectedId);
      if (!node || !isFiniteNode(node)) return;
      const [lo, hi] = FORCES[variant].settle;
      const k = Math.min(hi, Math.max(lo, zoomRef.current));
      const shiftX = sheetMode ? 0 : panelWidth / 2 / k;
      const shiftY = sheetMode ? (size.h * 0.46) / 2 / k : 0;
      fg.centerAt((node.x as number) + shiftX, (node.y as number) + shiftY, ms);
      fg.zoom(k, ms);
    } else if (previous) {
      fitRef.current(CAMERA_MS);
    }
    // Only a change of selection moves the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn() {
        const fg = fgRef.current;
        if (fg) fg.zoom(Math.min(MAX_ZOOM, zoomRef.current * 1.4), reducedMotion() ? 0 : 240);
      },
      zoomOut() {
        const fg = fgRef.current;
        if (fg) fg.zoom(Math.max(MIN_ZOOM, zoomRef.current / 1.4), reducedMotion() ? 0 : 240);
      },
      fit() {
        fitRef.current();
      },
    }),
    [],
  );

  /* Forces. Configured once the graph instance exists, and again if the variant changes. */
  const setGraphRef = useCallback(
    (fg: ForceGraphInstance | null) => {
      fgRef.current = fg;
      if (!fg) return;
      const cfg = FORCES[variant];
      fg.d3Force('charge')?.strength?.(cfg.charge);
      const linkForce = fg.d3Force('link');
      linkForce?.distance?.((l: GraphLink) => (l.score >= STRONG_MATCH_SCORE ? 72 : 110));
      linkForce?.strength?.((l: GraphLink) => (l.score >= STRONG_MATCH_SCORE ? 0.4 : 0.14));
      fg.d3Force('center')?.strength?.(0.12);
      fg.d3Force('collide', createCollideForce(cfg.collide));
    },
    [variant],
  );

  /* Canvas callbacks: stable, and they read the paint store. */
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, k: number) => paintNode(node, ctx, k, store.state),
    [store],
  );
  const linkCanvasObject = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D, k: number) => paintLink(link, ctx, k, store.state),
    [store],
  );
  const linkPointerAreaPaint = useCallback(
    (link: GraphLink, color: string, ctx: CanvasRenderingContext2D, k: number) =>
      paintLinkPointerArea(link, color, ctx, k),
    [],
  );
  const nodePointerAreaPaint = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D, k: number) =>
      paintNodePointerArea(node, color, ctx, k, store.state),
    [store],
  );
  const linkVisibility = useCallback((l: GraphLink) => isLinkVisible(store.state, l), [store]);
  const replace = useCallback(() => 'replace', []);

  const onNodeHover = useCallback(
    (node: GraphNode | null) => {
      store.patch({ hoveredId: node?.id ?? null });
      recomputeConnected();
      requestRedraw();
    },
    [store, recomputeConnected, requestRedraw],
  );
  const onLinkHover = useCallback(
    (link: GraphLink | null) => {
      store.patch({ hoverLinkId: link?.id ?? null });
      emitThread();
      requestRedraw();
    },
    [store, emitThread, requestRedraw],
  );
  const onLinkClick = useCallback(
    (link: GraphLink) => {
      store.patch({ pinnedLinkId: store.state.pinnedLinkId === link.id ? null : link.id });
      emitThread();
      requestRedraw();
    },
    [store, emitThread, requestRedraw],
  );
  const onNodeClick = useCallback(
    (node: GraphNode) => {
      store.patch({ pinnedLinkId: null });
      emitThread();
      live.current.onSelect(node.id);
    },
    [store, emitThread],
  );
  const onBackgroundClick = useCallback(() => {
    store.patch({ pinnedLinkId: null });
    emitThread();
    live.current.onSelect(null);
    requestRedraw();
  }, [store, emitThread, requestRedraw]);
  const onZoom = useCallback((t: { k: number }) => {
    zoomRef.current = t.k;
  }, []);

  const summary = `${participants.length} personas. ${drawn.size} hilos dibujados. ${strongCount} hilos de ${FILAMENT_SCORE} puntos o más.`;
  const hasPeople = participants.length > 0;

  return (
    <div ref={containerRef} className={`graph-field${hasPeople ? ' is-live' : ''}`} role="img" aria-label={summary}>
      <div className="aurora" aria-hidden="true" />
      {loaded && !hasPeople ? <p className="empty-line">La red abre cuando entra la primera persona.</p> : null}
      {size.w > 0 && size.h > 0 ? (
        <ForceGraph2D
          graphRef={setGraphRef}
          width={size.w}
          height={size.h}
          graphData={graph}
          nodeId="id"
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={260}
          d3AlphaDecay={0.018}
          d3VelocityDecay={0.32}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          enableNodeDrag={false}
          linkHoverPrecision={8}
          nodeCanvasObjectMode={replace}
          linkCanvasObjectMode={replace}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkPointerAreaPaint={linkPointerAreaPaint}
          linkVisibility={linkVisibility}
          onNodeHover={onNodeHover}
          onLinkHover={onLinkHover}
          onNodeClick={onNodeClick}
          onLinkClick={onLinkClick}
          onBackgroundClick={onBackgroundClick}
          onEngineStop={handleEngineStop}
          onZoom={onZoom}
        />
      ) : null}
    </div>
  );
}
