import { Container, Graphics, Text } from 'pixi.js';

export interface NodeSprite {
  container: Container;
  circle: Graphics;
  label: Text;
  radius: number;
}

export interface NodeVisualState {
  selected: boolean;
  boxSelected: boolean;
  searchMatch: boolean;
  fixed: boolean;
  collapsed: boolean;
  inFocus: boolean;
  groupColor?: number;
  groupEdgeOnly?: boolean;
  fluidMode?: boolean;
  pieColors?: number[];
  mediaType?: string;
  mediaExpanded?: boolean;
}

const TEXT_RESOLUTION = Math.max(3, (window.devicePixelRatio || 1) * 2);

export function createNodeSprite(
  id: string,
  labelStr: string,
  x: number, y: number,
  radius: number,
  color: number,
  labelColor: number,
  labelSize: number
): NodeSprite {
  const container = new Container({ label: `node-${id}` });
  container.position.set(x, y);

  const circle = new Graphics()
    .circle(0, 0, radius)
    .fill({ color, alpha: 0.85 });

  container.addChild(circle);

  const text = new Text({
    text: labelStr,
    resolution: TEXT_RESOLUTION,
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: labelSize,
      fill: labelColor,
      align: 'center',
    } as any,
  });
  text.anchor.set(0.5, 0);
  text.y = radius + 3;
  container.addChild(text);

  return { container, circle, label: text, radius };
}

export function updateNodePosition(sprite: NodeSprite, x: number, y: number) {
  sprite.container.position.set(x, y);
}

export function applyNodeVisual(
  sprite: NodeSprite,
  baseColor: number,
  labelColor: number,
  labelSize: number,
  state: NodeVisualState
) {
  const { circle, container, radius } = sprite;
  const r = radius;
  const alpha = state.inFocus ? 1 : 0.15;

  // 多媒体节点图标（Feather Icons 风格）
  const oldIcon = (sprite as any)._mediaIcon as Graphics | undefined;
  if (oldIcon) { oldIcon.visible = false; sprite.container.removeChild(oldIcon); (sprite as any)._mediaIcon = null; }
  if (state.mediaType && !state.mediaExpanded) {
    const g = new Graphics();
    const s = r * 0.4;
    const w = 1.4;
    const a = 0.5;
    g.setStrokeStyle({ color: 0xffffff, width: w, alpha: a, cap: 'round', join: 'round' });
    if (state.mediaType === 'image') {
      // rect + circle (sun) + mountain
      g.roundRect(-s * 1.2, -s * 0.9, s * 2.4, s * 1.8, s * 0.2).stroke();
      g.circle(-s * 0.2, -s * 0.2, s * 0.35).stroke();
      g.moveTo(-s * 0.8, s * 0.6).lineTo(-s * 0.1, s * 0.0).lineTo(s * 0.4, s * 0.6).stroke();
    } else if (state.mediaType === 'audio') {
      // four vertical bars, varying heights
      const gap = s * 0.6;
      const h1 = s * 0.6, h2 = s * 1.4, h3 = s * 0.9, h4 = s * 1.1;
      g.moveTo(-gap * 1.5, -h1 / 2).lineTo(-gap * 1.5, h1 / 2);
      g.moveTo(-gap * 0.5, -h2 / 2).lineTo(-gap * 0.5, h2 / 2);
      g.moveTo(gap * 0.5, -h3 / 2).lineTo(gap * 0.5, h3 / 2);
      g.moveTo(gap * 1.5, -h4 / 2).lineTo(gap * 1.5, h4 / 2);
      g.stroke();
    } else if (state.mediaType === 'video') {
      // play triangle
      g.moveTo(-s * 0.7, -s * 0.9).lineTo(s * 1.0, 0).lineTo(-s * 0.7, s * 0.9).closePath().stroke();
    } else if (state.mediaType === 'md') {
      // document with folded corner
      g.moveTo(-s, -s * 1.1).lineTo(s * 0.4, -s * 1.1).lineTo(s * 1.0, -s * 0.5).lineTo(s * 1.0, s * 1.1).lineTo(-s, s * 1.1).closePath().stroke();
      g.moveTo(s * 0.4, -s * 1.1).lineTo(s * 0.4, -s * 0.5).lineTo(s * 1.0, -s * 0.5).stroke();
      for (let i = 0; i < 3; i++) {
        g.moveTo(-s * 0.5, -s * 0.3 + i * s * 0.5).lineTo(s * 0.4, -s * 0.3 + i * s * 0.5).stroke();
      }
    }
    g.alpha = 0.75;
    (sprite as any)._mediaIcon = g;
    sprite.container.addChild(g);
  }

  circle.clear();

  // 填充色
  let fillColor = baseColor;
  if (state.groupColor && !state.groupEdgeOnly) fillColor = state.groupColor;

  // --- 发光（6步同心圆 + 二次衰减模拟平滑渐变）---
  const drawSmoothGlow = (color: number, maxAlpha: number) => {
    for (let i = 5; i >= 0; i--) {
      const t = (5 - i) / 5;
      const offset = (i + 0.5);
      const alpha = maxAlpha * (1 - t) * (1 - t);
      circle.circle(0, 0, r + offset).fill({ color, alpha });
    }
  };

  const goldGlow = (state.selected && !state.boxSelected);
  const blueGlow = state.searchMatch;
  const cyanGlow = state.boxSelected;

  if (blueGlow) drawSmoothGlow(0x3B82F6, 0.12);
  if (goldGlow) drawSmoothGlow(0xFFD700, 0.16);
  if (cyanGlow) drawSmoothGlow(0x44CCFF, 0.12);

  // --- 节点实体 ---
  const fillAlpha = alpha * 0.85;
  // 冲突节点饼状设色
  if (state.pieColors && state.pieColors.length >= 2) {
    const colors = state.pieColors;
    const anglePer = (2 * Math.PI) / colors.length;
    for (let i = 0; i < colors.length; i++) {
      circle.moveTo(0, 0).arc(0, 0, r, i * anglePer, (i + 1) * anglePer).closePath()
        .fill({ color: colors[i], alpha: fillAlpha });
    }
  } else if (state.fixed) {
    const ringThickness = Math.max(1.5, r * 0.25);
    const innerR = Math.max(r * 0.3, 1.5);
    circle.circle(0, 0, r).fill({ color: fillColor, alpha: Math.max(0.15, fillAlpha) });
    circle.circle(0, 0, r - ringThickness).cut();
    circle.circle(0, 0, innerR).fill({ color: fillColor, alpha: Math.max(0.3, fillAlpha) });
  } else {
    circle.circle(0, 0, r).fill({ color: fillColor, alpha: fillAlpha });
    if (state.groupEdgeOnly) {
      circle.stroke({ color: state.groupColor!, width: 2, alpha });
    }
  }

  // 选中描边（金色） vs 框选描边（青色）
  if (state.selected && !state.boxSelected) {
    circle.circle(0, 0, r + 1).stroke({ color: 0xFFD700, width: 2, alpha });
  }
  if (state.boxSelected) {
    circle.circle(0, 0, r + 1).stroke({ color: 0x44CCFF, width: 2, alpha });
  }

  // 搜索高亮 蓝环
  if (state.searchMatch) {
    circle.circle(0, 0, r).stroke({ color: 0x3B82F6, width: 1.5, alpha: 0.5 });
  }

  // 折叠标记
  if (state.collapsed) {
    const cx = r * 0.7, cy = -r * 0.7, sz = r * 0.35;
    circle.circle(cx, cy, r * 0.4).fill({ color: 0xffffff, alpha }).stroke({ color: 0x333333, width: 1, alpha });
    circle.moveTo(cx - sz, cy).lineTo(cx + sz, cy).stroke({ color: 0x333333, width: 1.5, alpha });
    circle.moveTo(cx, cy - sz).lineTo(cx, cy + sz).stroke({ color: 0x333333, width: 1.5, alpha });
  }

  container.alpha = alpha;
  sprite.label.style.fontSize = labelSize;
  sprite.label.style.fill = labelColor;
  sprite.label.y = r + 3;
}
