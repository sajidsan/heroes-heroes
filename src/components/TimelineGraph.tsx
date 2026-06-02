import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import type { Musician, HeroRef } from '../types';
import type { Theme } from '../theme';
import { IconExternalLink, IconClose, KeyHint } from './Icons';

// ── constants ─────────────────────────────────────────────────────────────────

const ML = 52, MR = 32, MT = 24, MB = 48;

const ERA_COLORS: Record<string, string> = {
  // ── Jazz ──────────────────────────────────────────────────────────────────
  'early-jazz':  '#a78bfa',
  swing:         '#60a5fa',
  bebop:         '#f97316',
  cool:          '#34d399',
  'hard-bop':    '#fb923c',
  'post-bop':    '#e879f9',
  free:          '#f43f5e',
  fusion:        '#facc15',
  // ── UX & Design ───────────────────────────────────────────────────────────
  foundations:          '#a78bfa', // violet
  'hci-pioneers':       '#38bdf8', // sky blue
  'industrial-design':  '#fbbf24', // amber
  'cognitive-design':   '#34d399', // emerald
  'gui-era':            '#f97316', // orange
  'interaction-design': '#e879f9', // fuchsia
  'web-usability':      '#22d3ee', // cyan
  'product-design':     '#fb7185', // rose
};

const SOURCE_LABEL: Record<string, string> = {
  interview:     'Interview',
  autobiography: 'Autobiography',
  biography:     'Biography',
  'liner-notes': 'Liner Notes',
  documentary:   'Documentary',
  attributed:    'Attributed',
};

// ── selection state ───────────────────────────────────────────────────────────

type Selection =
  | { kind: 'musician'; id: string }
  | { kind: 'edge'; studentId: string; heroId: string; contextId: string };

// ── D3 internals ──────────────────────────────────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  musician: Musician;
}

interface ResolvedLink {
  source: SimNode;
  target: SimNode; // the hero
  studentId: string;
  heroId: string;
  ref: HeroRef;
}

// ── hover tooltip state ───────────────────────────────────────────────────────

interface HoverTip {
  x: number; y: number;
  studentName: string; heroName: string;
  quote?: string;
}

// ── component ─────────────────────────────────────────────────────────────────

export function TimelineGraph({
  musicians,
  theme,
  headerHeight = 60,
}: {
  musicians: Musician[];
  theme: Theme;
  headerHeight?: number;
}) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const zoomBehRef    = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodePositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const arcMids       = useRef<Map<string, { mx: number; my: number }>>(new Map());
  const selRef           = useRef<Selection | null>(null); // kept in sync, avoids stale closures
  // Remembers last-visited edge per context+direction so navigating back lands on the right sibling
  // Key: `${contextId}-in` | `${contextId}-out`   Value: the other endpoint id
  const lastEdgeRef      = useRef<Map<string, string>>(new Map());

  const [selection, _setSelection] = useState<Selection | null>(null);
  const [hoverTip, setHoverTip]    = useState<HoverTip | null>(null);
  const [positionKey, setPositionKey] = useState(0); // bumped on zoom end → re-positions cards
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const setSelection = useCallback((s: Selection | null) => {
    selRef.current = s;
    _setSelection(s);
    // Remember last-visited edge per context+direction for "memory" navigation
    if (s?.kind === 'edge') {
      const isIncoming = s.contextId === s.heroId;
      const key = `${s.contextId}-${isIncoming ? 'in' : 'out'}`;
      lastEdgeRef.current.set(key, isIncoming ? s.studentId : s.heroId);
    }
  }, []);

  // hero → all students who cited them
  const heroToStudents = useMemo(() => {
    const map = new Map<string, Musician[]>();
    musicians.forEach(m =>
      m.heroes.forEach(h => {
        if (!map.has(h.heroId)) map.set(h.heroId, []);
        map.get(h.heroId)!.push(m);
      })
    );
    return map;
  }, [musicians]);

  // ── auto-pan: fit a set of node IDs in view ────────────────────────────────
  const fitNodes = useCallback((ids: string[]) => {
    const el = svgRef.current;
    const zb = zoomBehRef.current;
    if (!el || !zb || ids.length === 0) return;

    const W = el.clientWidth, H = el.clientHeight;
    const positions = ids
      .map(id => nodePositions.current.get(id))
      .filter(Boolean) as { x: number; y: number }[];
    if (positions.length === 0) return;

    const PAD = 60; // px buffer around nodes
    const minX = Math.min(...positions.map(p => p.x)) - PAD;
    const maxX = Math.max(...positions.map(p => p.x)) + PAD;
    const minY = Math.min(...positions.map(p => p.y)) - PAD;
    const maxY = Math.max(...positions.map(p => p.y)) + PAD;
    const cw = maxX - minX, ch = maxY - minY;

    const OUTER = 0.1; // 10% outer margin of viewport
    const availW = (W - ML - MR) * (1 - OUTER * 2);
    const availH = (H - MT - MB) * (1 - OUTER * 2);
    const k = Math.min(availW / (cw || 1), availH / (ch || 1), 3);

    const midX = (minX + maxX) / 2 + ML;
    const midY = (minY + maxY) / 2 + MT;

    // Check if already in view
    const t = d3.zoomTransform(el);
    const [sMinX, sMinY] = t.apply([minX + ML, minY + MT]);
    const [sMaxX, sMaxY] = t.apply([maxX + ML, maxY + MT]);
    const SLACK = 40;
    if (
      sMinX > SLACK && sMinY > SLACK &&
      sMaxX < W - SLACK && sMaxY < H - SLACK
    ) return;

    const target = d3.zoomIdentity
      .translate(W / 2, H / 2)
      .scale(k)
      .translate(-midX, -midY);

    d3.select(el)
      .transition().duration(650).ease(d3.easeCubicOut)
      .call(zb.transform, target);
  }, []);

  // ── EFFECT 1: full D3 layout + render ─────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const W = el.clientWidth  || 1100;
    const H = el.clientHeight || 600;
    // Always lay out with at least 820px of horizontal plot space.
    // On narrow viewports we set an initial zoom to fit the whole graph in view —
    // the user can then pinch-zoom to explore detail.
    const MIN_PW = 820;
    const pw = Math.max(W - ML - MR, MIN_PW);
    const ph = H - MT - MB;

    arcMids.current.clear();
    nodePositions.current.clear();
    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el);

    const zb = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', ev => zoomRoot.attr('transform', ev.transform))
      .on('end', () => setPositionKey(k => k + 1));
    zoomBehRef.current = zb;
    svg.call(zb);

    const zoomRoot = svg.append('g').attr('class', 'zoom-root');

    svg.on('click', ev => {
      if ((ev.target as Element).tagName === 'svg') {
        setSelection(null);
        setHoverTip(null);
      }
    });

    const g = zoomRoot.append('g').attr('transform', `translate(${ML},${MT})`);

    // X scale
    const minYear = d3.min(musicians, d => d.born)! - 6;
    const maxYear = d3.max(musicians, d => d.born)! + 14;
    const xScale  = d3.scaleLinear().domain([minYear, maxYear]).range([0, pw]);

    // Force sim
    const nodes: SimNode[] = musicians.map(m => ({
      id: m.id, musician: m,
      x: xScale(m.born),
      y: ph / 2 + (Math.random() - 0.5) * 40,
    }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const rawLinks = musicians.flatMap(m =>
      m.heroes
        .filter(h => nodeById.has(h.heroId))
        .map(h => ({ source: m.id, target: h.heroId, studentId: m.id, heroId: h.heroId, ref: h }))
    );

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link',
        d3.forceLink<SimNode, typeof rawLinks[number]>(rawLinks)
          .id(d => d.id).strength(0.3).distance(80))
      .force('collide', d3.forceCollide(24))
      .force('y', d3.forceY(ph / 2).strength(0.05));

    nodes.forEach(n => { n.fx = xScale(n.musician.born); });
    sim.stop();
    for (let i = 0; i < 500; i++) sim.tick();
    nodes.forEach(n => {
      n.y = Math.max(18, Math.min(ph - 18, n.y ?? ph / 2));
      nodePositions.current.set(n.id, { x: n.x!, y: n.y });
    });

    const resolvedLinks = (
      (sim.force('link') as d3.ForceLink<SimNode, d3.SimulationLinkDatum<SimNode>>).links()
    ) as unknown as ResolvedLink[];

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${ph})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}`).tickSize(-ph))
      .call(ax => {
        ax.select('.domain').attr('stroke', theme.outlineVariant);
        ax.selectAll('.tick line').attr('stroke', theme.outlineVariant).attr('stroke-dasharray', '3 4');
        ax.selectAll('.tick text')
          .attr('fill', theme.onSurfaceMuted).attr('font-size', 10)
          .attr('font-family', theme.fontMono).attr('dy', '1.4em');
      });

    // Arrow markers
    const defs = svg.append('defs');
    const mkArr = (id: string, col: string) =>
      defs.append('marker').attr('id', id)
        .attr('viewBox', '0 -4 8 8').attr('refX', 19).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', col);
    mkArr('arr-dim',     theme.edgeDimmedArrow);
    mkArr('arr-default', theme.nodeOutline);
    mkArr('arr-out',     theme.outgoing);
    mkArr('arr-in',      theme.incoming);

    // Edges
    const edgeG = g.append('g').attr('class', 'edges');
    resolvedLinks.forEach(link => {
      const x1 = link.target.x!, y1 = link.target.y!;
      const x2 = link.source.x!, y2 = link.source.y!;
      const span = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
      const arc  = Math.max(35, span * 0.22);
      const cx   = (x1+x2)/2, cy = (y1+y2)/2 - arc;
      // Path runs student→hero (right→left) so marker-end lands at the source/hero
      const pathD = `M${x2},${y2} Q${cx},${cy} ${x1},${y1}`;

      // Anchor at the arc's control point (peak of curve) — gives maximum clearance
      arcMids.current.set(`${link.studentId}-${link.heroId}`, {
        mx: cx,
        my: cy - 6,
      });

      // Visible path (no pointer events — all handled by hit area)
      edgeG.append('path')
        .attr('class', `edge-path edge-${link.studentId}-${link.heroId}`)
        .attr('d', pathD).attr('fill', 'none')
        .attr('stroke', theme.edgeDefault).attr('stroke-width', 1.5)
        .attr('opacity', 0.55).attr('marker-end', 'url(#arr-default)')
        .attr('pointer-events', 'none');

      // Hit area
      edgeG.append('path')
        .attr('class', `edge-hit edge-hit-${link.studentId}-${link.heroId}`)
        .attr('d', pathD).attr('fill', 'none')
        .attr('stroke', 'transparent').attr('stroke-width', 22)
        .attr('cursor', 'pointer')
        .on('mousemove', function(ev) {
          // Only show tooltip if this edge belongs to the context musician
          const sel = selRef.current;
          if (sel) {
            const ctxId = sel.kind === 'musician' ? sel.id : sel.contextId;
            if (link.studentId !== ctxId && link.heroId !== ctxId) return;
          }
          const [x, y] = d3.pointer(ev, containerRef.current!);
          setHoverTip({ x, y, studentName: link.source.musician.name, heroName: link.target.musician.name, quote: link.ref.quote });
        })
        .on('mouseleave', () => setHoverTip(null))
        .on('click', function(ev) {
          ev.stopPropagation();
          const sel = selRef.current;
          // Block click if not the context musician's edge
          if (sel) {
            const ctxId = sel.kind === 'musician' ? sel.id : sel.contextId;
            if (link.studentId !== ctxId && link.heroId !== ctxId) return;
          }
          // Determine context: prefer the currently-selected musician
          const ctxId = sel
            ? (sel.kind === 'musician' ? sel.id : sel.contextId)
            : (link.studentId); // default to student when no context

          // Toggle off if same edge already selected
          if (sel?.kind === 'edge' && sel.studentId === link.studentId && sel.heroId === link.heroId) {
            setSelection({ kind: 'musician', id: ctxId });
            return;
          }
          setHoverTip(null);
          setSelection({ kind: 'edge', studentId: link.studentId, heroId: link.heroId, contextId: ctxId });
        });
    });

    // Nodes
    const nodeG = g.append('g').attr('class', 'nodes');
    nodes.forEach(n => {
      const m = n.musician;
      const color = ERA_COLORS[m.eras[0]] ?? '#9ca3af';
      const ng = nodeG.append('g')
        .attr('class', `node-group node-${m.id}`)
        .attr('transform', `translate(${n.x},${n.y})`)
        .attr('cursor', 'pointer');

      ng.append('circle').attr('r', 20).attr('fill', 'transparent');
      ng.append('circle').attr('class', 'node-circle').attr('r', 9)
        .attr('fill', theme.nodeSurface).attr('stroke', color).attr('stroke-width', 2);
      ng.append('circle').attr('class', 'node-dot').attr('r', 3).attr('fill', color);
      ng.append('text').attr('class', 'node-label')
        .attr('y', -14).attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('font-family', theme.fontMono)
        .attr('fill', theme.onSurfaceMuted).attr('pointer-events', 'none')
        .text(m.name.split(' ').pop()!);

      ng.on('click', ev => {
        ev.stopPropagation();
        setHoverTip(null);
        setSelection(
          selection?.kind === 'musician' && selection.id === m.id
            ? null
            : { kind: 'musician', id: m.id }
        );
      });
    });

    // Era legend
    const usedEras = [...new Set(musicians.flatMap(m => m.eras))];
    const legG = svg.append('g').attr('transform', `translate(${ML},${H - 10})`);
    usedEras.forEach((era, i) => {
      legG.append('circle').attr('cx', i*108).attr('r', 4).attr('fill', ERA_COLORS[era] ?? '#9ca3af');
      legG.append('text').attr('x', i*108+9).attr('y', 4)
        .attr('fill', theme.onSurfaceMuted).attr('font-size', 9).attr('font-family', theme.fontMono).text(era);
    });

    // Narrow viewport: fit horizontally and vertically center the content
    if (pw > W - ML - MR) {
      const k  = (W - ML - MR) / pw;
      const ty = H / 2 - (MT + ph / 2) * k; // center graph vertically
      svg.call(zb.transform, d3.zoomIdentity.translate(ML * (1 - k), ty).scale(k));
    }

    return () => { sim.stop(); };
  }, [musicians, theme, setSelection]);

  // ── EFFECT 2: highlight update ─────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const svg = d3.select(el);

    // Reset
    svg.selectAll('.edge-path')
      .attr('stroke', theme.edgeDefault).attr('opacity', 0.55)
      .attr('stroke-width', 1.5).attr('marker-end', 'url(#arr-default)');
    svg.selectAll('.edge-hit').attr('pointer-events', 'auto').attr('cursor', 'pointer');
    svg.selectAll('.node-circle').attr('opacity', 1).attr('stroke-width', 2);
    svg.selectAll('.node-dot').attr('opacity', 1);
    svg.selectAll('.node-label').attr('opacity', 1).attr('fill', theme.onSurfaceMuted);

    if (!selection) return;

    // Determine context musician for this selection
    const ctxId = selection.kind === 'musician' ? selection.id : selection.contextId;
    const ctxMusician = musicians.find(m => m.id === ctxId)!;
    const students = heroToStudents.get(ctxId) ?? [];

    // IDs of edges connected to context musician
    const contextEdgeKeys = new Set([
      ...ctxMusician.heroes.map(h => `${ctxId}-${h.heroId}`),
      ...students.map(s => `${s.id}-${ctxId}`),
    ]);

    // Dim everything
    svg.selectAll('.edge-path')
      .attr('opacity', 0.04).attr('stroke', theme.edgeDimmed).attr('marker-end', 'url(#arr-dim)');
    svg.selectAll('.edge-hit').attr('pointer-events', 'none');
    svg.selectAll('.node-circle').attr('opacity', 0.1);
    svg.selectAll('.node-dot').attr('opacity', 0.1);
    svg.selectAll('.node-label').attr('opacity', 0.1);

    const brightenNode = (id: string, labelColor: string, sw = 2.5) => {
      svg.select(`.node-${id} .node-circle`).attr('opacity', 1).attr('stroke-width', sw);
      svg.select(`.node-${id} .node-dot`).attr('opacity', 1);
      svg.select(`.node-${id} .node-label`).attr('opacity', 1).attr('fill', labelColor);
    };
    const softenNode = (id: string) => {
      svg.select(`.node-${id} .node-circle`).attr('opacity', 0.4);
      svg.select(`.node-${id} .node-dot`).attr('opacity', 0.4);
      svg.select(`.node-${id} .node-label`).attr('opacity', 0.4).attr('fill', theme.onSurfaceMuted);
    };
    const softenEdge = (key: string, color: string, marker: string) => {
      svg.select(`.edge-path.edge-${key}`)
        .attr('stroke', color).attr('opacity', 0.25).attr('stroke-width', 1.5)
        .attr('marker-end', `url(#${marker})`);
      svg.select(`.edge-hit.edge-hit-${key}`).attr('pointer-events', 'auto');
    };
    const brightenEdge = (key: string, color: string, marker: string) => {
      svg.select(`.edge-path.edge-${key}`)
        .attr('stroke', color).attr('opacity', 1).attr('stroke-width', 2.5)
        .attr('marker-end', `url(#${marker})`);
      svg.select(`.edge-hit.edge-hit-${key}`).attr('pointer-events', 'auto');
    };

    // Medium brightness for connections when artist is selected (not full 1.0)
    const medNode = (id: string, labelColor: string) => {
      svg.select(`.node-${id} .node-circle`).attr('opacity', 0.7).attr('stroke-width', 2);
      svg.select(`.node-${id} .node-dot`).attr('opacity', 0.7);
      svg.select(`.node-${id} .node-label`).attr('opacity', 0.7).attr('fill', labelColor);
    };
    const medEdge = (key: string, color: string, marker: string) => {
      svg.select(`.edge-path.edge-${key}`)
        .attr('stroke', color).attr('opacity', 0.55).attr('stroke-width', 1.8)
        .attr('marker-end', `url(#${marker})`);
      svg.select(`.edge-hit.edge-hit-${key}`).attr('pointer-events', 'auto');
    };

    if (selection.kind === 'musician') {
      // Context musician — full brightness
      brightenNode(ctxId, '#ffffff', 3);

      // Outgoing (amber): musician studied these heroes — medium brightness
      ctxMusician.heroes.forEach(h => {
        medEdge(`${ctxId}-${h.heroId}`, theme.outgoing, 'arr-out');
        medNode(h.heroId, theme.outgoing);
      });
      // Incoming (purple): these students cited this musician — medium brightness
      students.forEach(s => {
        medEdge(`${s.id}-${ctxId}`, theme.incoming, 'arr-in');
        medNode(s.id, theme.incoming);
      });
    } else {
      // Edge focused — determine direction relative to context
      const { studentId, heroId } = selection;
      const isIncoming = ctxId === heroId; // context is the hero (student → context)
      const isOutgoing = ctxId === studentId; // context is the student (context → hero)

      // Context node stays visible
      brightenNode(ctxId, '#ffffff', 3);

      // The focused edge — full brightness
      const focusedColor = isIncoming ? theme.incoming : theme.outgoing;
      const focusedMarker = isIncoming ? 'arr-in' : 'arr-out';
      brightenEdge(`${studentId}-${heroId}`, focusedColor, focusedMarker);

      // The destination node — full brightness
      const destId = isIncoming ? studentId : heroId;
      brightenNode(destId, focusedColor);

      // Context's other edges in the same direction — soft/tappable
      if (isIncoming) {
        students
          .filter(s => s.id !== studentId)
          .forEach(s => {
            softenEdge(`${s.id}-${ctxId}`, theme.incoming, 'arr-in');
            softenNode(s.id);
          });
      } else if (isOutgoing) {
        ctxMusician.heroes
          .filter(h => h.heroId !== heroId)
          .forEach(h => {
            softenEdge(`${ctxId}-${h.heroId}`, theme.outgoing, 'arr-out');
            softenNode(h.heroId);
          });
      }
    }

    // All non-context edges remain blocked
    svg.selectAll('.edge-hit').each(function() {
      const cls = (this as Element).getAttribute('class') ?? '';
      const keyMatch = cls.match(/edge-hit-([^-]+(?:-[^-]+)*)-([^-]+(?:-[^-]+)*)$/);
      if (!keyMatch) return;
      // If this edge is in contextEdgeKeys it was explicitly re-enabled above; else block
      const edgeKey = `${keyMatch[1]}-${keyMatch[2]}`;
      if (!contextEdgeKeys.has(edgeKey)) {
        d3.select(this).attr('pointer-events', 'none');
      }
    });
  }, [selection, musicians, heroToStudents, theme]);

  // ── EFFECT 3: auto-pan on selection change ─────────────────────────────────
  useEffect(() => {
    if (!selection) return;

    if (selection.kind === 'musician') {
      // Center the artist in the viewport at a fixed scale
      const el = svgRef.current;
      const zb = zoomBehRef.current;
      if (!el || !zb) return;
      const pos = nodePositions.current.get(selection.id);
      if (!pos) return;
      const W = el.clientWidth, H = el.clientHeight;
      // Sit the node at 58% of height so the bio card above it has room
      const k = 1.8;
      const target = d3.zoomIdentity
        .translate(W * 0.5, H * 0.58)
        .scale(k)
        .translate(-(pos.x + ML), -(pos.y + MT));
      d3.select(el)
        .transition().duration(650).ease(d3.easeCubicOut)
        .call(zb.transform, target);
    } else {
      fitNodes([selection.studentId, selection.heroId]);
    }
  }, [selection, fitNodes]);

  // ── EFFECT 4: keyboard navigation ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const sel = selRef.current;
      if (!sel) return;

      if (sel.kind === 'musician') {
        const m = musicians.find(x => x.id === sel.id)!;
        const studentsOfM = heroToStudents.get(sel.id) ?? [];

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Cycle through all musicians in birth-year order, then alpha within same year
          e.preventDefault();
          const ordered = [...musicians].sort(
            (a, b) => a.born - b.born || a.name.localeCompare(b.name)
          );
          const idx = ordered.findIndex(x => x.id === sel.id);
          const next = e.key === 'ArrowDown'
            ? (idx + 1) % ordered.length
            : (idx - 1 + ordered.length) % ordered.length;
          setSelection({ kind: 'musician', id: ordered[next].id });
        } else if (e.key === 'ArrowLeft' && m.heroes.length > 0) {
          e.preventDefault();
          // Restore last-visited outgoing edge if remembered, else use first
          const remembered = lastEdgeRef.current.get(`${sel.id}-out`);
          const heroId = (remembered && m.heroes.find(h => h.heroId === remembered))
            ? remembered : m.heroes[0].heroId;
          setSelection({ kind: 'edge', studentId: sel.id, heroId, contextId: sel.id });
        } else if (e.key === 'ArrowRight' && studentsOfM.length > 0) {
          e.preventDefault();
          // Restore last-visited incoming edge if remembered, else use first
          const remembered = lastEdgeRef.current.get(`${sel.id}-in`);
          const studentId = (remembered && studentsOfM.find(s => s.id === remembered))
            ? remembered : studentsOfM[0].id;
          setSelection({ kind: 'edge', studentId, heroId: sel.id, contextId: sel.id });
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelection(null);
        }
      } else {
        const { studentId, heroId, contextId } = sel;
        const ctxM = musicians.find(x => x.id === contextId)!;
        const studentsOfCtx = heroToStudents.get(contextId) ?? [];
        const isIncoming = contextId === heroId;
        const isOutgoing = contextId === studentId;

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          // Sort siblings by their visual Y position so ↑/↓ matches on-screen order
          const nodeY = (id: string) => nodePositions.current.get(id)?.y ?? 0;
          if (isIncoming) {
            const sorted = [...studentsOfCtx].sort((a, b) => nodeY(a.id) - nodeY(b.id));
            const idx = sorted.findIndex(s => s.id === studentId);
            const next = e.key === 'ArrowDown'
              ? (idx + 1) % sorted.length
              : (idx - 1 + sorted.length) % sorted.length;
            setSelection({ kind: 'edge', studentId: sorted[next].id, heroId: contextId, contextId });
          } else if (isOutgoing) {
            const sorted = [...ctxM.heroes].sort((a, b) => nodeY(a.heroId) - nodeY(b.heroId));
            const idx = sorted.findIndex(h => h.heroId === heroId);
            const next = e.key === 'ArrowDown'
              ? (idx + 1) % sorted.length
              : (idx - 1 + sorted.length) % sorted.length;
            setSelection({ kind: 'edge', studentId: contextId, heroId: sorted[next].heroId, contextId });
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (isIncoming) {
            // Incoming edge: student is to the RIGHT in timeline → go to student
            if (musicians.find(x => x.id === studentId)) {
              setSelection({ kind: 'musician', id: studentId });
            }
          } else {
            // Outgoing edge: hero is to the LEFT, so right = back to context
            setSelection({ kind: 'musician', id: contextId });
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (isOutgoing) {
            // Outgoing edge: hero is to the LEFT in timeline → go to hero
            if (musicians.find(x => x.id === heroId)) {
              setSelection({ kind: 'musician', id: heroId });
            }
          } else {
            // Incoming edge: context (hero) is to the LEFT → back to context
            setSelection({ kind: 'musician', id: contextId });
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelection(null);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [musicians, heroToStudents, setSelection]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const getMusician = (id: string) => musicians.find(m => m.id === id);

  const clearAll = useCallback(() => {
    setSelection(null);
    setHoverTip(null);
  }, [setSelection]);

  // Compute arc midpoint in container px for the edge popover
  const getEdgePopoverPos = (studentId: string, heroId: string): { x: number; y: number } | null => {
    const el = svgRef.current;
    if (!el) return null;
    const ad = arcMids.current.get(`${studentId}-${heroId}`);
    if (!ad) return null;
    const t = d3.zoomTransform(el);
    const [px, py] = t.apply([ad.mx + ML, ad.my + MT]);
    return { x: px, y: py };
  };

  // Compute node position in container px (re-reads zoom transform live)
  const getNodePos = (id: string): { x: number; y: number } | null => {
    const el = svgRef.current;
    if (!el) return null;
    const pos = nodePositions.current.get(id);
    if (!pos) return null;
    const t = d3.zoomTransform(el);
    const [px, py] = t.apply([pos.x + ML, pos.y + MT]);
    return { x: px, y: py };
  };

  // Keyboard nav hint based on current selection
  const navHint = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'musician') {
      const m = musicians.find(x => x.id === selection.id)!;
      const hasStudied = m.heroes.length > 0;
      const hasCitedBy = (heroToStudents.get(selection.id) ?? []).length > 0;
      return (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <><KeyHint k="↑↓" /><span>all</span></>
          {hasStudied && <><KeyHint k="←" /><span>studied</span></>}
          {hasCitedBy && <><KeyHint k="→" /><span>cited by</span></>}
          <KeyHint k="Esc" />
        </span>
      );
    }
    const { studentId, heroId, contextId } = selection;
    const isIncoming = contextId === heroId;
    const ctxM = musicians.find(x => x.id === contextId)!;
    const studentsOfCtx = heroToStudents.get(contextId) ?? [];
    const sibCount = isIncoming ? studentsOfCtx.length : ctxM.heroes.length;
    // Spatially: left = older/hero, right = newer/student
    const leftName  = isIncoming ? getMusician(contextId)?.name.split(' ').pop() : getMusician(heroId)?.name.split(' ').pop();
    const rightName = isIncoming ? getMusician(studentId)?.name.split(' ').pop() : getMusician(contextId)?.name.split(' ').pop();

    return (
      <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {sibCount > 1 && <><KeyHint k="↑↓" /><span>siblings</span></>}
        <KeyHint k="←" /><span>{leftName}</span>
        <KeyHint k="→" /><span>{rightName}</span>
        <KeyHint k="Esc" />
      </span>
    );
  }, [selection, musicians, heroToStudents]);

  // ── render ─────────────────────────────────────────────────────────────────

  // Positions recomputed each render — positionKey bumped on zoom end keeps them in sync
  void positionKey;
  const edgePopoverPos = selection?.kind === 'edge'
    ? getEdgePopoverPos(selection.studentId, selection.heroId)
    : null;
  const musicianCardPos = selection?.kind === 'musician'
    ? getNodePos(selection.id)
    : null;

  const selectedMusician = selection?.kind === 'musician' ? getMusician(selection.id) : null;

  const focusedEdgeData = selection?.kind === 'edge'
    ? {
        student: getMusician(selection.studentId)!,
        hero:    getMusician(selection.heroId)!,
        ref:     getMusician(selection.studentId)?.heroes.find(h => h.heroId === selection.heroId)
              ?? (heroToStudents.get(selection.heroId) ?? [])
                   .find(s => s.id === selection.studentId)
                   ?.heroes.find(h => h.heroId === selection.heroId),
        contextId: selection.contextId,
      }
    : null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: '100%', background: theme.surface, overflow: 'hidden' }}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Keyboard nav hint — desktop only */}
      {selection && !isMobile && (
        <div style={{
          position: 'absolute',
          bottom: selectedMusician ? 52 : 12,
          left: '50%', transform: 'translateX(-50%)',
          color: theme.scrim, fontSize: 10, fontFamily: theme.fontMono,
          pointerEvents: 'none', userSelect: 'none',
          display: 'flex', gap: 8, alignItems: 'center',
          zIndex: 5, whiteSpace: 'nowrap',
        }}>
          {navHint}
        </div>
      )}

      {/* Mobile floating nav controls */}
      {selection && isMobile && (
        <MobileNavControls
          selection={selection}
          musicians={musicians}
          heroToStudents={heroToStudents}
          lastEdge={lastEdgeRef.current}
          nodePositions={nodePositions.current}
          theme={theme}
          onSetSelection={setSelection}
          onClear={clearAll}
        />
      )}

      {/* Hover tooltip */}
      {hoverTip && selection?.kind !== 'edge' && (
        <HoverTooltip tip={hoverTip} theme={theme} />
      )}

      {/* Floating musician bio card — key forces full remount on navigation */}
      {selectedMusician && musicianCardPos && (
        <MusicianBioCard
          key={selectedMusician.id}
          musician={selectedMusician}
          pos={musicianCardPos}
          theme={theme}
          headerHeight={headerHeight}
          onClose={clearAll}
        />
      )}

      {/* Edge popover — key forces full remount on navigation */}
      {focusedEdgeData && focusedEdgeData.ref && edgePopoverPos && (
        <EdgePopover
          key={`${focusedEdgeData.student.id}-${focusedEdgeData.hero.id}`}
          pos={edgePopoverPos}
          student={focusedEdgeData.student}
          hero={focusedEdgeData.hero}
          ref_={focusedEdgeData.ref}
          theme={theme}
          headerHeight={headerHeight}
          onClose={() => setSelection({ kind: 'musician', id: focusedEdgeData.contextId })}
        />
      )}

      {/* Compact connections strip — bottom, no quotes */}
      {selectedMusician && (
        <ConnectionsStrip
          musician={selectedMusician}
          musicians={musicians}
          heroToStudents={heroToStudents}
          theme={theme}
          onClose={clearAll}
        />
      )}
    </div>
  );
}

// ── Mobile floating nav controls ─────────────────────────────────────────────

function MobileNavControls({
  selection,
  musicians,
  heroToStudents,
  lastEdge,
  nodePositions,
  theme,
  onSetSelection,
  onClear,
}: {
  selection: Selection;
  musicians: Musician[];
  heroToStudents: Map<string, Musician[]>;
  lastEdge: Map<string, string>;
  nodePositions: Map<string, { x: number; y: number }>;
  theme: Theme;
  onSetSelection: (s: Selection | null) => void;
  onClear: () => void;
}) {
  let leftFn: (() => void) | null = null;
  let leftLabel = '';
  let rightFn: (() => void) | null = null;
  let rightLabel = '';
  let upFn: (() => void) | null = null;
  let downFn: (() => void) | null = null;
  let centerLabel = '';

  if (selection.kind === 'musician') {
    const m = musicians.find(x => x.id === selection.id)!;
    const students = heroToStudents.get(selection.id) ?? [];
    const ordered = [...musicians].sort((a, b) => a.born - b.born || a.name.localeCompare(b.name));
    const idx = ordered.findIndex(x => x.id === selection.id);

    if (m.heroes.length > 0) {
      const remOut = lastEdge.get(`${selection.id}-out`);
      const heroId = (remOut && m.heroes.find(h => h.heroId === remOut)) ? remOut : m.heroes[0].heroId;
      leftFn = () => onSetSelection({ kind: 'edge', studentId: selection.id, heroId, contextId: selection.id });
      leftLabel = m.heroes.length === 1
        ? (musicians.find(x => x.id === heroId)?.name.split(' ').pop() ?? 'Studied')
        : `Studied (${m.heroes.length})`;
    }
    if (students.length > 0) {
      const remIn = lastEdge.get(`${selection.id}-in`);
      const stuId = (remIn && students.find(s => s.id === remIn)) ? remIn : students[0].id;
      const stuM = musicians.find(x => x.id === stuId)!;
      rightFn = () => onSetSelection({ kind: 'edge', studentId: stuId, heroId: selection.id, contextId: selection.id });
      rightLabel = students.length === 1
        ? (stuM?.name.split(' ').pop() ?? 'Cited By')
        : `Cited By (${students.length})`;
    }
    upFn = () => {
      const prev = (idx - 1 + ordered.length) % ordered.length;
      onSetSelection({ kind: 'musician', id: ordered[prev].id });
    };
    downFn = () => {
      const next = (idx + 1) % ordered.length;
      onSetSelection({ kind: 'musician', id: ordered[next].id });
    };
    centerLabel = `${idx + 1} / ${ordered.length}`;

  } else {
    const { studentId, heroId, contextId } = selection;
    const ctxM = musicians.find(x => x.id === contextId)!;
    const students = heroToStudents.get(contextId) ?? [];
    const isIncoming = contextId === heroId;
    const isOutgoing = contextId === studentId;

    const heroM  = musicians.find(x => x.id === heroId);
    const stuM   = musicians.find(x => x.id === studentId);

    // Left = the hero (older, left in timeline)
    leftFn = () => onSetSelection({ kind: 'musician', id: heroId });
    leftLabel = heroM?.name.split(' ').pop() ?? '';

    // Right = the student (newer, right in timeline)
    rightFn = () => onSetSelection({ kind: 'musician', id: studentId });
    rightLabel = stuM?.name.split(' ').pop() ?? '';

    // Up/down = siblings sorted by visual Y position
    const nodeY = (id: string) => nodePositions.get(id)?.y ?? 0;
    if (isIncoming) {
      const sorted = [...students].sort((a, b) => nodeY(a.id) - nodeY(b.id));
      const idx = sorted.findIndex(s => s.id === studentId);
      centerLabel = `${idx + 1} / ${sorted.length}`;
      if (sorted.length > 1) {
        upFn = () => {
          const prev = (idx - 1 + sorted.length) % sorted.length;
          onSetSelection({ kind: 'edge', studentId: sorted[prev].id, heroId: contextId, contextId });
        };
        downFn = () => {
          const next = (idx + 1) % sorted.length;
          onSetSelection({ kind: 'edge', studentId: sorted[next].id, heroId: contextId, contextId });
        };
      }
    } else if (isOutgoing) {
      const sortedH = [...ctxM.heroes].sort((a, b) => nodeY(a.heroId) - nodeY(b.heroId));
      const idx = sortedH.findIndex(h => h.heroId === heroId);
      centerLabel = `${idx + 1} / ${sortedH.length}`;
      if (sortedH.length > 1) {
        upFn = () => {
          const prev = (idx - 1 + sortedH.length) % sortedH.length;
          onSetSelection({ kind: 'edge', studentId: contextId, heroId: sortedH[prev].heroId, contextId });
        };
        downFn = () => {
          const next = (idx + 1) % sortedH.length;
          onSetSelection({ kind: 'edge', studentId: contextId, heroId: sortedH[next].heroId, contextId });
        };
      }
    }
  }

  const btn = (label: string, sublabel: string, fn: (() => void) | null, align: 'left' | 'right' | 'center') => (
    <button
      onPointerDown={ev => { ev.stopPropagation(); fn?.(); }}
      disabled={!fn}
      style={{
        flex: align === 'center' ? '0 0 64px' : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '0 10px',
        minHeight: 52,
        background: 'none',
        border: 'none',
        borderRadius: 8,
        cursor: fn ? 'pointer' : 'default',
        opacity: fn ? 1 : 0.2,
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      <span style={{ color: theme.onSurface, fontSize: 16, fontFamily: theme.fontMono, lineHeight: 1 }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ color: theme.onSurfaceMuted, fontSize: 9, fontFamily: theme.fontMono, letterSpacing: '0.03em' }}>
          {sublabel}
        </span>
      )}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10, left: 10, right: 10,
        zIndex: 200,
        background: theme.surfaceContainer,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${theme.outline}`,
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'stretch',
      }}
      onClick={ev => ev.stopPropagation()}
    >
      {/* ← left */}
      {btn('←', leftLabel, leftFn, 'left')}

      {/* divider */}
      <div style={{ width: 1, background: theme.outline, alignSelf: 'stretch', margin: '10px 0' }} />

      {/* ↑ count ↓ center */}
      <div style={{
        flex: '0 0 72px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>
        <button
          onPointerDown={ev => { ev.stopPropagation(); upFn?.(); }}
          disabled={!upFn}
          style={{ background: 'none', border: 'none', color: upFn ? theme.onSurface : theme.scrim, fontSize: 16, padding: '6px 16px', cursor: upFn ? 'pointer' : 'default', fontFamily: theme.fontMono, WebkitTapHighlightColor: 'transparent' }}
        >↑</button>
        {centerLabel && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ color: theme.onSurfaceMuted, fontSize: 9, fontFamily: theme.fontMono }}>{centerLabel}</span>
            <span style={{ color: theme.scrim, fontSize: 8, fontFamily: theme.fontMono, letterSpacing: '0.04em' }}>connections</span>
          </div>
        )}
        <button
          onPointerDown={ev => { ev.stopPropagation(); downFn?.(); }}
          disabled={!downFn}
          style={{ background: 'none', border: 'none', color: downFn ? theme.onSurface : theme.scrim, fontSize: 16, padding: '6px 16px', cursor: downFn ? 'pointer' : 'default', fontFamily: theme.fontMono, WebkitTapHighlightColor: 'transparent' }}
        >↓</button>
      </div>

      {/* divider */}
      <div style={{ width: 1, background: theme.outline, alignSelf: 'stretch', margin: '10px 0' }} />

      {/* right → */}
      {btn('→', rightLabel, rightFn, 'right')}

      {/* × close */}
      <button
        onPointerDown={ev => { ev.stopPropagation(); onClear(); }}
        aria-label="Close"
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none',
          color: theme.scrim, fontSize: 14,
          cursor: 'pointer', padding: '2px 4px',
          fontFamily: theme.fontMono,
          WebkitTapHighlightColor: 'transparent',
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────
// Sized at ~62% of the edge popover (the popover is the "pinned" full version)

function HoverTooltip({ tip, theme }: { tip: HoverTip; theme: Theme }) {
  return (
    <div style={{
      position: 'absolute', left: tip.x + 16, top: tip.y - 12,
      pointerEvents: 'none', zIndex: 20, maxWidth: 300,
    }}>
      <div style={{
        background: theme.surfaceContainer, border: `1px solid ${theme.outline}`,
        borderRadius: 6, padding: '10px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
      }}>
        <div style={{ fontSize: 11, fontFamily: theme.fontMono, marginBottom: 6 }}>
          <span style={{ color: theme.onSurface }}>{tip.studentName}</span>
          <span style={{ color: theme.scrim }}> on </span>
          <span style={{ color: theme.outgoing }}>{tip.heroName}</span>
        </div>
        {tip.quote
          ? <p style={{ margin: 0, color: theme.onSurfaceVariant, fontSize: 12, fontStyle: 'italic', fontFamily: theme.fontSerif, lineHeight: 1.55 }}>
              "{tip.quote.length > 100 ? tip.quote.slice(0, 97) + '…' : tip.quote}"
            </p>
          : <p style={{ margin: 0, color: theme.onSurfaceMuted, fontSize: 11, fontFamily: theme.fontMono }}>
              click to pin
            </p>
        }
        <div style={{ color: theme.scrim, fontSize: 9, fontFamily: theme.fontMono, marginTop: 5 }}>
          click to pin ↑
        </div>
      </div>
    </div>
  );
}

// ── Edge popover (1.61× golden ratio scale, MD font sizes) ───────────────────

function EdgePopover({
  pos, student, hero, ref_, theme, headerHeight, onClose,
}: {
  pos: { x: number; y: number };
  student: Musician;
  hero: Musician;
  ref_: HeroRef;
  theme: Theme;
  headerHeight: number;
  onClose: () => void;
}) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isMob = vw <= 768;
  const W = Math.min(500, vw - 16);
  const left = Math.max(8, Math.min(pos.x - W / 2, vw - W - 8));

  return (
    <div
      style={isMob
        ? { position: 'fixed', top: headerHeight + 10, left: 10, right: 10, zIndex: 30 }
        : { position: 'absolute', left, top: Math.max(8, pos.y - 24), transform: 'translateY(-100%)', width: W, zIndex: 30 }
      }
      onClick={ev => ev.stopPropagation()}
    >
      <div style={{
        background: theme.surfaceContainerHighest, border: `1px solid ${theme.outline}`,
        borderRadius: 8, padding: '20px 22px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        animation: 'cardIn 0.2s ease-out 0.6s both',
      }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: theme.onSurfaceMuted, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <IconClose size={13} />
        </button>

        {/* Downward stem */}
        {!isMob && <>
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${theme.outline}` }} />
          <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${theme.surfaceContainerHighest}` }} />
        </>}

        {/* MD Subtitle1 (16px) title */}
        <div style={{ fontFamily: theme.fontMono, fontSize: 16, fontWeight: 700, marginBottom: 14, paddingRight: 24, lineHeight: 1.4 }}>
          <span style={{ color: theme.onSurface }}>{student.name}</span>
          <span style={{ color: theme.scrim, fontWeight: 400 }}> on </span>
          <span style={{ color: theme.outgoing }}>{hero.name}</span>
        </div>

        {/* MD Body1 (16px) quote */}
        {ref_.quote
          ? <blockquote style={{
              borderLeft: `3px solid ${theme.outgoing}55`,
              margin: '0 0 14px', paddingLeft: 14,
              color: theme.onSurface, fontStyle: 'italic',
              fontSize: 16, lineHeight: 1.7, fontFamily: theme.fontSerif,
            }}>
              "{ref_.quote}"
            </blockquote>
          : <p style={{ color: theme.onSurfaceMuted, fontFamily: theme.fontMono, fontSize: 14, margin: '0 0 14px' }}>
              No direct quote documented.
            </p>
        }

        {/* MD Caption (12px) source link */}
        {ref_.source && <SourceLink ref_={ref_} theme={theme} />}
      </div>
    </div>
  );
}

// ── Floating musician bio card ─────────────────────────────────────────────────
// Sits on the visualization above the selected musician's node.

function MusicianBioCard({
  musician, pos, theme, headerHeight, onClose,
}: {
  musician: Musician;
  pos: { x: number; y: number };
  theme: Theme;
  headerHeight: number;
  onClose: () => void;
}) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isMob = vw <= 768;
  const W = Math.min(420, vw - 16);
  const color = ERA_COLORS[musician.eras[0]] ?? '#9ca3af';

  // Mobile: fixed just below the measured header + 10px gap
  // Desktop: float above the node
  const left = isMob ? 10 : Math.max(8, Math.min(pos.x - W / 2, vw - W - 8));
  const cardEstHeight = 280;
  const showBelow = !isMob && (pos.y - 90 - cardEstHeight < 8 || pos.y < vh * 0.25);

  return (
    <div
      style={{
        position: isMob ? 'fixed' : 'absolute',
        left: isMob ? 10 : left,
        right: isMob ? 10 : 'auto',
        top: isMob ? headerHeight + 10 : (showBelow ? pos.y + 20 : Math.max(8, pos.y - 90)),
        transform: (!isMob && !showBelow) ? 'translateY(-100%)' : 'none',
        width: isMob ? 'auto' : W,
        maxHeight: isMob ? '42vh' : 'none',
        overflowY: isMob ? 'auto' : 'visible',
        zIndex: 28,
      }}
      onClick={ev => ev.stopPropagation()}
    >
      <div style={{
        background: theme.surfaceContainerHighest, border: `1px solid ${theme.outline}`,
        borderRadius: 8, padding: '18px 20px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        animation: 'cardIn 0.2s ease-out 0.6s both',
      }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: theme.onSurfaceMuted, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <IconClose size={13} />
        </button>

        {/* Stem pointing down to node (or up if flipped) */}
        {!showBelow && <>
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${theme.outline}` }} />
          <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${theme.surfaceContainerHighest}` }} />
        </>}
        {showBelow && <>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: `8px solid ${theme.outline}` }} />
          <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: `7px solid ${theme.surfaceContainerHighest}` }} />
        </>}

        {/* MD H6 (20px) name */}
        <div style={{ marginBottom: 10, paddingRight: 24 }}>
          <span style={{ color, fontSize: 20, fontWeight: 700, fontFamily: theme.fontSans, lineHeight: 1.2 }}>
            {musician.name}
          </span>
        </div>

        {/* MD Caption (12px) meta */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ color: theme.onSurfaceMuted, fontSize: 12, fontFamily: theme.fontMono }}>
            b. {musician.born}{musician.died ? ` · d. ${musician.died}` : ''}
          </span>
          {musician.eras.map(e => (
            <span key={e} style={{
              color: ERA_COLORS[e] ?? theme.onSurfaceMuted,
              fontSize: 10, fontFamily: theme.fontMono,
              background: (ERA_COLORS[e] ?? theme.onSurfaceMuted) + '18',
              border: `1px solid ${(ERA_COLORS[e] ?? theme.onSurfaceMuted)}33`,
              borderRadius: 3, padding: '1px 6px',
            }}>{e}</span>
          ))}
        </div>

        {/* MD Body1 (16px) bio */}
        {musician.bio && (
          <p style={{
            color: theme.onSurfaceVariant, fontSize: 14, margin: '0 0 12px',
            fontFamily: theme.fontSerif, lineHeight: 1.65,
          }}>
            {musician.bio}
          </p>
        )}

        {/* Source link */}
        {musician.bioUrl && (
          <a href={musician.bioUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
            <span style={{
              background: theme.surfaceContainer, border: `1px solid ${theme.outline}`,
              borderRadius: 3, padding: '2px 7px',
              fontSize: 10, fontFamily: theme.fontMono, color: theme.onSurfaceMuted,
            }}>
              Wikipedia
            </span>
            <IconExternalLink size={11} style={{ color: theme.onSurfaceMuted }} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Compact connections strip (bottom bar — no quotes, no bio) ────────────────

function ConnectionsStrip({
  musician, musicians, heroToStudents, theme, onClose,
}: {
  musician: Musician;
  musicians: Musician[];
  heroToStudents: Map<string, Musician[]>;
  theme: Theme;
  onClose: () => void;
}) {
  const heroDetails = musician.heroes.map(ref => ({
    ref, hero: musicians.find(m => m.id === ref.heroId),
  }));
  const citedBy = (heroToStudents.get(musician.id) ?? []).map(student => ({
    student,
    ref: student.heroes.find(h => h.heroId === musician.id)!,
  }));

  if (heroDetails.length === 0 && citedBy.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: theme.surfaceContainerHighest,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderTop: `1px solid ${theme.outline}`,
        zIndex: 20,
      }}
      onClick={ev => ev.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 22px', gap: 24, flexWrap: 'wrap', minHeight: 38 }}>
        {heroDetails.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: theme.scrim, fontSize: 9, fontFamily: theme.fontMono, letterSpacing: '0.1em' }}>STUDIED</span>
            {heroDetails.map(({ ref, hero }) => (
              <span key={ref.heroId} style={{ color: theme.outgoing, fontSize: 11, fontFamily: theme.fontMono }}>
                → {hero?.name ?? ref.heroId}
              </span>
            ))}
          </div>
        )}
        {heroDetails.length > 0 && citedBy.length > 0 && (
          <div style={{ width: 1, height: 18, background: theme.outline, flexShrink: 0 }} />
        )}
        {citedBy.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: theme.scrim, fontSize: 9, fontFamily: theme.fontMono, letterSpacing: '0.1em' }}>CITED BY</span>
            {citedBy.map(({ student }) => (
              <span key={student.id} style={{ color: theme.incoming, fontSize: 11, fontFamily: theme.fontMono }}>
                → {student.name}
              </span>
            ))}
          </div>
        )}
        <button onClick={onClose} aria-label="Close"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: theme.scrim, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <IconClose size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Source link chip ──────────────────────────────────────────────────────────

function SourceLink({ ref_, theme }: { ref_: HeroRef; theme: Theme }) {
  const label = SOURCE_LABEL[ref_.sourceType] ?? ref_.sourceType;
  const display = ref_.sourceYear ? `${ref_.source} · ${ref_.sourceYear}` : ref_.source!;

  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        background: theme.surfaceContainer,
        border: `1px solid ${theme.outline}`,
        borderRadius: 3,
        padding: '2px 6px',
        fontSize: 9, fontFamily: theme.fontMono, letterSpacing: '0.05em',
        color: theme.onSurfaceMuted,
      }}>
        {label}
      </span>
      <span style={{ color: theme.onSurfaceMuted, fontSize: 10, fontFamily: theme.fontMono, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {display}
      </span>
      {ref_.sourceUrl && <IconExternalLink size={10} style={{ color: theme.onSurfaceMuted }} />}
    </span>
  );

  if (ref_.sourceUrl) {
    return (
      <a href={ref_.sourceUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </a>
    );
  }
  return <span>{inner}</span>;
}

