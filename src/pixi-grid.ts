import { Container, Graphics, Text } from 'pixi.js';
import { Transform, getVisibleBounds } from './geometry/hit';

let gfx: Graphics | null = null;
let lastKey: string = '';

export function updateGrid(
  gridLayer: Container,
  gw: number,
  gh: number,
  opts: {
    gridVis: boolean;
    axisVis: boolean;
    axisTicks: boolean;
    gridSp: number;
    gridWidth: number;
    gravityGrid: boolean;
    nodes: any[];
    transform: Transform;
  }
) {
  const { gridVis, axisVis, axisTicks, gridSp, gridWidth, gravityGrid, nodes, transform } = opts;

  if (!gravityGrid) {
    const key = `${transform.x}|${transform.y}|${transform.k}|${gw}|${gh}|${gridVis}|${axisVis}|${axisTicks}|${gridSp}|${gridWidth}`;
    if (key === lastKey && gfx) return;
    lastKey = key;
  }

  // 复用 Graphics，不清除子节点列表（避免 GC 膨胀）
  if (!gfx) {
    gfx = new Graphics();
    gridLayer.addChild(gfx);
  }
  gfx.clear();

  if (!gridVis && !axisVis) return;

  const bounds = getVisibleBounds(gw, gh, transform);
  const step = gridSp;
  const lineWidth = gridWidth;
  const GRAVITY_STRENGTH = 800;

  // 引力位移：禁止越过节点中心
  const dispX = (px: number, py: number): number => {
    let dx = 0;
    for (const n of nodes) {
      const nx = n.x - px, ny = n.y - py;
      const r = (n.radius || 9);
      const d2 = Math.max(r * r, nx * nx + ny * ny);
      const pull = GRAVITY_STRENGTH * r * r / d2;
      dx += Math.sign(nx) * Math.min(pull, Math.abs(nx));
    }
    return px + dx;
  };
  const dispY = (px: number, py: number): number => {
    let dy = 0;
    for (const n of nodes) {
      const nx = n.x - px, ny = n.y - py;
      const r = (n.radius || 9);
      const d2 = Math.max(r * r, nx * nx + ny * ny);
      const pull = GRAVITY_STRENGTH * r * r / d2;
      dy += Math.sign(ny) * Math.min(pull, Math.abs(ny));
    }
    return py + dy;
  };

  // 网格线
  if (gridVis) {
    const xStart = Math.floor(bounds.minX / step) * step - step;
    const xEnd = bounds.maxX + step * 2;
    const yStart = Math.floor(bounds.minY / step) * step - step;
    const yEnd = bounds.maxY + step * 2;

    if (gravityGrid) {
      const subStep = step / 5;
      // 竖线
      for (let x = xStart; x <= xEnd; x += step) {
        const major = x % (step * 5) === 0;
        let first = true;
        for (let sy = yStart; sy <= yEnd; sy += subStep) {
          const cx = dispX(x, sy);
          if (first) { gfx.moveTo(cx, sy); first = false; }
          else gfx.lineTo(cx, sy);
        }
        gfx.stroke({ color: 0x5566aa, width: major ? lineWidth * 2 : lineWidth, alpha: major ? 0.3 : 0.12 });
      }
      // 横线
      for (let y = yStart; y <= yEnd; y += step) {
        const major = y % (step * 5) === 0;
        let first = true;
        for (let sx = xStart; sx <= xEnd; sx += subStep) {
          const cy = dispY(sx, y);
          if (first) { gfx.moveTo(sx, cy); first = false; }
          else gfx.lineTo(sx, cy);
        }
        gfx.stroke({ color: 0x5566aa, width: major ? lineWidth * 2 : lineWidth, alpha: major ? 0.3 : 0.12 });
      }
    } else {
      for (let x = xStart; x <= xEnd; x += step) {
        const major = x % (step * 5) === 0;
        gfx.moveTo(x, bounds.minY).lineTo(x, bounds.maxY).stroke({ color: 0x888888, width: major ? lineWidth * 1.5 : lineWidth, alpha: major ? 0.15 : 0.05 });
      }
      for (let y = yStart; y <= yEnd; y += step) {
        const major = y % (step * 5) === 0;
        gfx.moveTo(bounds.minX, y).lineTo(bounds.maxX, y).stroke({ color: 0x888888, width: major ? lineWidth * 1.5 : lineWidth, alpha: major ? 0.15 : 0.05 });
      }
    }
  }

  // 坐标轴
  if (axisVis) {
    gfx.moveTo(0, bounds.minY).lineTo(0, bounds.maxY).stroke({ color: 0x666666, width: lineWidth, alpha: 0.4 });
    gfx.moveTo(bounds.minX, 0).lineTo(bounds.maxX, 0).stroke({ color: 0x666666, width: lineWidth, alpha: 0.4 });
  }

  // 刻度标签（单独管理，避免每帧重建）
  if (axisTicks && (!gravityGrid || !lastKey)) {
    // 移除旧标签
    for (let i = gridLayer.children.length - 1; i >= 0; i--) {
      if (gridLayer.children[i] instanceof Text) gridLayer.removeChildAt(i);
    }
    const tickStep = step * 5;
    const tickSize = 4 / transform.k;
    for (let x = Math.floor(bounds.minX / tickStep) * tickStep; x <= bounds.maxX; x += tickStep) {
      if (Math.abs(x) < 1) continue;
      gfx.moveTo(x, -tickSize).lineTo(x, tickSize).stroke({ color: 0x888888, width: lineWidth, alpha: 0.4 });
      const label = new Text({ text: String(x), resolution: 2, style: { fontSize: 9, fill: 0x888888, fontFamily: 'monospace' } as any });
      label.anchor.set(0.5, 0); label.position.set(x, tickSize + 2 / transform.k);
      gridLayer.addChild(label);
    }
    for (let y = Math.floor(bounds.minY / tickStep) * tickStep; y <= bounds.maxY; y += tickStep) {
      if (Math.abs(y) < 1) continue;
      gfx.moveTo(-tickSize, y).lineTo(tickSize, y).stroke({ color: 0x888888, width: lineWidth, alpha: 0.4 });
      const label = new Text({ text: String(y), resolution: 2, style: { fontSize: 9, fill: 0x888888, fontFamily: 'monospace' } as any });
      label.anchor.set(1, 0.5); label.position.set(-tickSize - 2 / transform.k, y);
      gridLayer.addChild(label);
    }
  }
}

export function clearGridCache() {
  gfx = null;
  lastKey = '';
}
