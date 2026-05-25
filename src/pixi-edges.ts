import { Container, Graphics } from 'pixi.js';
import { GraphData } from './data/storage';

const DASH_PATTERNS: Record<string, [number, number]> = {
  solid: [0, 0],
  'dash-2': [2, 5],
  'dash-4': [4, 6],
  'dash-8': [8, 6],
  dot: [2, 8],
  'dot-dense': [2, 4],
};

/** 画虚线 */
function drawDashed(g: Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  let drawn = 0;
  let on = true;
  while (drawn < len) {
    const seg = on ? Math.min(dashLen, len - drawn) : Math.min(gapLen, len - drawn);
    const sx = x1 + ux * drawn, sy = y1 + uy * drawn;
    drawn += seg;
    const ex = x1 + ux * drawn, ey = y1 + uy * drawn;
    if (on) g.moveTo(sx, sy).lineTo(ex, ey);
    on = !on;
  }
}

export function updateEdges(
  edgeLayer: Container,
  graph: GraphData,
  nodes: any[],
  opts: {
    hiddenNodes: Set<string>;
    focusNeighborIds?: Set<string>;
    focusEdgeIndices?: Set<number>;
    alpha?: number;
  }
) {
  edgeLayer.removeChildren();
  const { hiddenNodes, focusNeighborIds, focusEdgeIndices, alpha = 0.6 } = opts;
  const isFocusActive = focusNeighborIds && focusNeighborIds.size > 0;

  const g = new Graphics();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  graph.edges.forEach((e, idx) => {
    const s = nodeMap.get(typeof e.source === 'object' ? e.source.id : e.source);
    const t = nodeMap.get(typeof e.target === 'object' ? e.target.id : e.target);
    if (!s || !t) return;
    if (hiddenNodes.has(s.id) || hiddenNodes.has(t.id)) return;

    let edgeAlpha = alpha;
    if (isFocusActive) {
      edgeAlpha = focusEdgeIndices?.has(idx) ? 0.8 : 0.12;
    }

    const conflict = e._conflict === true;
    const userDashed = (e.lineStyle || 'solid') !== 'solid';
    // 用户自设虚线保持原色，只有冲突实线变橙黄
    const color = (conflict && !userDashed) ? '#DD7733' : (e.color || '#BFBFBF');
    const style: string = conflict ? 'dot' : (userDashed ? e.lineStyle! : 'solid');
    const [dashLen, gapLen] = DASH_PATTERNS[style] || DASH_PATTERNS.solid;

    if (dashLen === 0) {
      g.moveTo(s.x, s.y).lineTo(t.x, t.y).stroke({ color, width: 1.5, alpha: edgeAlpha });
    } else {
      drawDashed(g, s.x, s.y, t.x, t.y, dashLen, gapLen);
      g.stroke({ color, width: 1.5, alpha: edgeAlpha });
    }

    if (e.arrow) {
      const dx = t.x - s.x, dy = t.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const ux = dx / len, uy = dy / len;
      const tr = t.radius || 9;
      const ax = t.x - ux * tr, ay = t.y - uy * tr;
      const size = 6;
      g.moveTo(ax, ay)
       .lineTo(ax - ux * size + uy * size * 0.5, ay - uy * size - ux * size * 0.5)
       .lineTo(ax - ux * size - uy * size * 0.5, ay - uy * size + ux * size * 0.5)
       .closePath()
       .fill({ color, alpha: edgeAlpha });
    }
  });

  edgeLayer.addChild(g);
}
