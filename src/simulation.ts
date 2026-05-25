import * as d3 from 'd3';
import { GraphData } from "./data/storage";
import { getGroupRegion } from "./geometry/hit";

export function initSimulation(
  graph: GraphData,
  params: {
    gw: number;
    gh: number;
    linkDist: number;
    linkStr: number;
    charge: number;
    centerS: number;
    collideR: number;
    groupBound: number;
    fluidMode?: boolean;
    onTick: () => void;
  }
) {
  const { gw, gh, linkDist, linkStr, charge, centerS, collideR, groupBound, fluidMode, onTick } = params;

  // 克隆节点，并强制应用固定坐标
  const nodes = graph.nodes.map(n => {
    const node = { ...n };
    if (n.fixed && n.x != null && n.y != null) {
      node.x = n.x;
      node.y = n.y;
      node.fx = n.x;
      node.fy = n.y;
    }
    return node;
  });

  // 虚线和冲突边不参与力学计算
  const edges = graph.edges
    .filter(e => (e.lineStyle || 'solid') === 'solid' && !(e as any)._conflict)
    .map(e => ({ ...e, lineStyle: 'solid' }));

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(linkDist).strength(linkStr))
    .force("charge", d3.forceManyBody().strength(charge))
    .force("center", d3.forceCenter(0, 0))
    .force("collide", d3.forceCollide(collideR))
    .force("radial", d3.forceRadial(0).x(0).y(0).strength(centerS))
    .alpha(1)
    .on("tick", onTick);

  // 流体力：不可压缩 + 粘性
  if (fluidMode) {
    simulation.force("fluid", () => {
      const ns = simulation.nodes();
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ar = (a.radius || 9) * 1.5;
          const br = (b.radius || 9) * 1.5;
          const sumR = ar + br;
          const contactDist = Math.max(sumR, 30);
          // 压力：重叠时强力排斥
          if (dist < sumR && dist > 0.01) {
            const overlap = sumR - dist;
            const force = overlap * 0.5; // 弹性系数
            const nx = dx / dist, ny = dy / dist;
            if (!a.fx) { a.vx -= nx * force; a.vy -= ny * force; }
            if (!b.fx) { b.vx += nx * force; b.vy += ny * force; }
          }
          // 粘性：近距离速度平均化
          if (dist < contactDist) {
            const viscosity = 0.03;
            const vx = (a.vx + b.vx) * 0.5;
            const vy = (a.vy + b.vy) * 0.5;
            if (!a.fx) { a.vx += (vx - a.vx) * viscosity; a.vy += (vy - a.vy) * viscosity; }
            if (!b.fx) { b.vx += (vx - b.vx) * viscosity; b.vy += (vy - b.vy) * viscosity; }
          }
        }
      }
    });
  }

  // 集合边界力
  simulation.nodes().forEach((n: any) => {
    const gs = graph.groups.filter(g => g.displayMode !== 'none' && (n.tags || []).includes(g.label));
    for (const g of gs) {
      const members = simulation.nodes().filter((sn: any) => (sn.tags || []).includes(g.label));
      if (members.length > 1) {
        const region = getGroupRegion(members, g.displayMode);
        if (region) {
          const [cx, cy] = region.closest(n.x, n.y);
          const dx = n.x - cx, dy = n.y - cy;
          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) continue;
            n.vx -= (dx / dist) * groupBound * 0.01;
            n.vy -= (dy / dist) * groupBound * 0.01;
          }
        }
      }
    }
  });

  return simulation;
}

export function createGroupForce(
  simulation: any,
  graph: GraphData,
  groupBound: number
) {
  // 已集成在 initSimulation 中
}
