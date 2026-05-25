import { Container, Graphics } from 'pixi.js';
import { GraphData } from './data/storage';
import { getGroupRegion } from './geometry/hit';

export function updateGroups(
  groupLayer: Container,
  graph: GraphData,
  nodes: any[],
  showLabels: boolean,
  labelMin: number,
  labelMax: number
) {
  groupLayer.removeChildren();
  const gfx = new Graphics();

  for (const g of graph.groups) {
    if (g.displayMode === 'none') continue;

    const members = nodes.filter((n: any) => (n.tags || []).includes(g.label));
    if (members.length === 0) continue;

    if (g.displayMode === 'fluid') {
      // 色晕模式：每个成员画径向渐变圆
      for (const m of members) {
        const r = (m.radius || 9) * (g.fluidRadius || 3);
        gfx.circle(m.x, m.y, r)
           .fill({ color: g.color || '#5B8FF9', alpha: g.opacity ?? 0.10 });
      }
    } else {
      // 矩形/凸包模式
      const region = getGroupRegion(members, g.displayMode);
      const verts = region!.verts();
      if (!verts || verts.length < 3) continue;

      gfx.moveTo(verts[0][0], verts[0][1]);
      for (let i = 1; i < verts.length; i++) {
        gfx.lineTo(verts[i][0], verts[i][1]);
      }
      gfx.closePath()
         .fill({ color: g.color || '#5B8FF9', alpha: g.opacity ?? 0.10 })
         .stroke({ color: g.borderColor || '#3A6FD8', width: 1, alpha: 0.3 });
    }
  }

  groupLayer.addChild(gfx);
}
