import { canvasPoint, hitTestNode, hitTestEdge, hitTestGroup } from "./geometry/hit";
import { closeContextMenu, showContextMenu } from "./ui-contextmenu";
import { GraphData } from "./data/storage";
import { sharedState } from "./shared-state";
import { Z_TOOLTIP } from "./layout-constants";

const DRAG_THRESHOLD = 3;
const TOUCH_DRAG_THRESHOLD = 10;
const LONG_PRESS_DURATION = 500;

export interface EventsContext {
  graph: GraphData;
  getSelNode: () => string | null;  setSelNode: (v: string | null) => void;
  getSelEdge: () => number | null;  setSelEdge: (v: number | null) => void;
  getSelGroup: () => string | null; setSelGroup: (v: string | null) => void;
  getSimulation: () => any;
  getTransform: () => any;
  getCanvas: () => HTMLCanvasElement;
  getNodeExpand: () => number;
  getLineExpand: () => number;
  getDraggingNode: () => any;       setDraggingNode: (n: any) => void;
  getWasDragged: () => boolean;     setWasDragged: (v: boolean) => void;
  draw: () => void;
  onContextMenu?: (type: 'blank'|'node'|'edge'|'group', id: string|null, x: number, y: number) => void;
  onTap?: (x: number, y: number) => void;
  fixNode?: (id: string) => void;
  isFixedNode?: (id: string) => boolean;
  selectionBox?: HTMLDivElement;
  fixNodes?: (ids: string[]) => void;
  unfixNodes?: (ids: string[]) => void;
  triggerSave?: () => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  appShell?: HTMLElement;
  viewport?: any;
  getLinkMode?: () => boolean;
  getLinkSrc?: () => string | null;
  onLinkCursorMove?: (x: number, y: number) => void;
  initSim?: () => void;
  clearEd?: () => void;
  fillNode?: (id: string) => void;
}

export function setupCanvasEvents(
  canvas: HTMLCanvasElement,
  ctx: EventsContext
) {
  const {
    graph, getSelNode, setSelNode, getSelEdge, setSelEdge, getSelGroup, setSelGroup,
    getSimulation, getTransform,
    getNodeExpand, getLineExpand,
    getDraggingNode, setDraggingNode, getWasDragged, setWasDragged,
    draw, onContextMenu, fixNode, isFixedNode
  } = ctx;

  // 坐标转换：统一用 canvas 偏移校正
  const toWorldPos = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (ctx.viewport) {
      const p = ctx.viewport.toWorld(sx, sy);
      return [p.x, p.y];
    }
    const t = getTransform();
    return [(sx - t.x) / t.k, (sy - t.y) / t.k];
  };
  const worldToScreen = (wx: number, wy: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    if (ctx.viewport) {
      const p = ctx.viewport.toScreen(wx, wy);
      return [p.x + rect.left, p.y + rect.top];
    }
    const t = getTransform();
    return [wx * t.k + t.x + rect.left, wy * t.k + t.y + rect.top];
  };

  // 创建 tooltip
  const tooltip = document.createElement("div");
  tooltip.style.cssText = `position:absolute;z-index:${Z_TOOLTIP};background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;max-width:200px;pointer-events:none;display:none;white-space:pre-wrap;word-break:break-word;`;
  ctx.appShell!.appendChild(tooltip);
  let hoveredNodeNote: string | null = null;
  const hideTooltip = () => { tooltip.style.display = 'none'; hoveredNodeNote = null; };
  const updateTooltip = (content: string, x: number, y: number) => {
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = ctx.appShell!.getBoundingClientRect();
    tooltip.style.left = (canvasRect.left - parentRect.left + x + 15) + 'px';
    tooltip.style.top = (canvasRect.top - parentRect.top + y + 15) + 'px';
  };

  let downPoint: [number, number] | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  const clearLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
  let lastTapTime = 0;

  // --- 框选状态 ---
  const BOX_MIN_SIZE = 5;
  let isRightButtonDown = false;
  let isBoxSelecting = false;
  let boxStart: [number, number] | null = null;
  let lastBoxUpTime = 0;
  let selectedNodeIds: string[] = [];

  const getNodesInRect = (x1: number, y1: number, x2: number, y2: number) => {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const nodes = getSimulation()?.nodes() || [];
    return nodes.filter((n: any) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY);
  };

  const showBoxMenu = (selNodes: any[], clientX: number, clientY: number) => {
    if (selNodes.length === 0) return;
    const ids = selNodes.map((n: any) => n.id);
    selectedNodeIds = ids;
    draw();
    const items: { label: string; action: () => void }[] = [];
    items.push({ label: `固定 (${ids.length})`, action: () => { ctx.fixNodes?.(ids); selectedNodeIds = []; draw(); } });
    items.push({ label: `解除固定 (${ids.length})`, action: () => { ctx.unfixNodes?.(ids); selectedNodeIds = []; draw(); } });
    items.push({ label: `删除 (${ids.length})`, action: () => {
      ctx.graph.nodes = ctx.graph.nodes.filter((n: any) => !ids.includes(n.id));
      ctx.graph.edges = ctx.graph.edges.filter((e: any) => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        return !ids.includes(src) && !ids.includes(tgt);
      });
      selectedNodeIds = [];
      ctx.triggerSave?.();
      ctx.initSim?.();
      ctx.clearEd?.();
      draw();
    }});
    items.push({ label: '批量标签...', action: () => {
      const tag = prompt('添加标签：');
      if (!tag) return;
      for (const id of ids) {
        const n = ctx.graph.nodes.find((n: any) => n.id === id);
        if (n) { if (!n.tags) n.tags = []; if (!n.tags.includes(tag)) n.tags.push(tag); }
      }
      selectedNodeIds = [];
      ctx.triggerSave?.();
      draw();
    }});
    items.push({ label: '批量颜色...', action: () => {
      const color = prompt('颜色 (#hex)：');
      if (!color) return;
      for (const id of ids) {
        const n = ctx.graph.nodes.find((n: any) => n.id === id);
        if (n) n.color = color;
      }
      selectedNodeIds = [];
      ctx.triggerSave?.();
      draw();
    }});
    const canvasRect = canvas.getBoundingClientRect();
    showContextMenu(ctx.appShell!, clientX - canvasRect.left, clientY - canvasRect.top, items);
  };

  // 连接到 sharedState
  sharedState.setSelectedNodeIdsFn(() => selectedNodeIds);
  sharedState.clearSelection = () => { selectedNodeIds = []; draw(); };
  sharedState.setSelectedNodeIds = (ids: string[]) => { selectedNodeIds = ids; draw(); };

  const triggerContextMenu = (screenX: number, screenY: number) => {
    // 非框选的右键菜单：清除框选高亮
    selectedNodeIds = [];
    const [cx, cy] = toWorldPos({ clientX: screenX, clientY: screenY });
    const nodes = getSimulation()?.nodes() || [];
    const n = hitTestNode(cx, cy, nodes, getNodeExpand());
    if (n) { setSelNode(n.id); setSelEdge(null); setSelGroup(null); draw(); onContextMenu?.('node', n.id, screenX, screenY); return; }
    const eIdx = hitTestEdge(cx, cy, graph.edges, nodes, getLineExpand());
    if (eIdx !== null) { setSelNode(null); setSelEdge(eIdx); setSelGroup(null); draw(); onContextMenu?.('edge', String(eIdx), screenX, screenY); return; }
    const g = hitTestGroup(cx, cy, graph.groups, nodes);
    if (g) { setSelNode(null); setSelEdge(null); setSelGroup(g.id); draw(); onContextMenu?.('group', g.id, screenX, screenY); return; }
    onContextMenu?.('blank', null, screenX, screenY);
  };

  const handleTap = (x: number, y: number) => {
    selectedNodeIds = [];
    // 如果外部提供了 onTap 回调，使用它（集成编辑面板等）
    if (ctx.onTap) { ctx.onTap(x, y); return; }
    const nodes = getSimulation()?.nodes() || [];
    const n = hitTestNode(x, y, nodes, getNodeExpand());
    if (n) { setSelNode(n.id); setSelEdge(null); setSelGroup(null); draw(); return; }
    const eIdx = hitTestEdge(x, y, graph.edges, nodes, getLineExpand());
    if (eIdx !== null) { setSelNode(null); setSelEdge(eIdx); setSelGroup(null); draw(); return; }
    const g = hitTestGroup(x, y, graph.groups, nodes);
    if (g) { setSelNode(null); setSelEdge(null); setSelGroup(g.id); draw(); return; }
    setSelNode(null); setSelEdge(null); setSelGroup(null); draw();
  };

  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    closeContextMenu(); hideTooltip();
    const [x, y] = toWorldPos(e);
    downPoint = [x, y];
    if (e.button === 2) {
      e.preventDefault(); e.stopImmediatePropagation();
      isRightButtonDown = true;
      isBoxSelecting = false;
      boxStart = [x, y];
      if (ctx.viewport) ctx.viewport.pause = true;
      return;
    }
    const nodes = getSimulation()?.nodes();
    const n = hitTestNode(x, y, nodes, getNodeExpand());
    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (!getDraggingNode() && !getWasDragged()) triggerContextMenu(e.clientX, e.clientY);
      clearLongPress();
    }, LONG_PRESS_DURATION);
    if (n && e.button === 0) {
      e.stopImmediatePropagation(); e.preventDefault();
      setDraggingNode(n); n.fx = n.x; n.fy = n.y; setWasDragged(false); canvas.style.cursor = "grabbing";
      getSimulation()?.alphaTarget(0.3).restart();
      ctx.onDragStart?.(n.id);
      if (ctx.viewport) ctx.viewport.pause = true;
    }
  });

  let pendingTouchNode: any = null; // 触摸到的节点，等拖动超过阈值才正式"抓"

  // --- 触屏事件（Android/HarmonyOS 兼容）---
  canvas.addEventListener("touchstart", (e: TouchEvent) => {
    closeContextMenu(); hideTooltip();
    if (!e.touches[0]) return;
    const touch = e.touches[0];
    const [x, y] = toWorldPos({ clientX: touch.clientX, clientY: touch.clientY });
    downPoint = [x, y];
    const nodes = getSimulation()?.nodes();
    const n = hitTestNode(x, y, nodes, getNodeExpand());
    pendingTouchNode = n || null;
    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (!getDraggingNode() && !getWasDragged()) triggerContextMenu(touch.clientX, touch.clientY);
      clearLongPress();
    }, LONG_PRESS_DURATION);
    if (n) e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const touch = e.touches[0];
    const [mx, my] = toWorldPos({ clientX: touch.clientX, clientY: touch.clientY });
    const nodes = getSimulation()?.nodes();
    const hoverNode = nodes ? hitTestNode(mx, my, nodes, getNodeExpand()) : null;
    sharedState.hoverNodeId = hoverNode ? hoverNode.id : null;
    if (sharedState.focusMode && sharedState.directDraw) sharedState.directDraw();
    // 超过长按阈值 → 正式抓节点开始拖拽
    if (!getDraggingNode() && pendingTouchNode) {
      if (downPoint && Math.hypot(mx - downPoint[0], my - downPoint[1]) >= TOUCH_DRAG_THRESHOLD) {
        setDraggingNode(pendingTouchNode); pendingTouchNode = null;
        const dn = getDraggingNode(); dn.fx = dn.x; dn.fy = dn.y;
        getSimulation()?.alphaTarget(0.3).restart();
        ctx.onDragStart?.(dn.id);
        if (ctx.viewport) ctx.viewport.pause = true;
      }
    }
    if (getDraggingNode()) {
      if (downPoint) { if (Math.hypot(mx - downPoint[0], my - downPoint[1]) >= TOUCH_DRAG_THRESHOLD) setWasDragged(true); }
      getDraggingNode().fx = mx; getDraggingNode().fy = my; getSimulation()?.alpha(0.3).restart();
    }
    if (!getDraggingNode() && hoverNode && hoverNode.note?.trim()) {
      if (hoveredNodeNote !== hoverNode.note) { hoveredNodeNote = hoverNode.note; updateTooltip(hoverNode.note, touch.clientX, touch.clientY); }
    } else hideTooltip();
  }, { passive: false });

  canvas.addEventListener("touchend", (e: TouchEvent) => {
    clearLongPress();
    pendingTouchNode = null;
    // 先处理拖拽结束
    if (getDraggingNode()) {
      const node = getDraggingNode();
      if (getWasDragged() && isFixedNode && isFixedNode(node.id)) {
        const gn = ctx.graph.nodes.find((gn: any) => gn.id === node.id);
        if (gn) { gn.fx = node.fx; gn.fy = node.fy; gn.x = node.x; gn.y = node.y; }
        ctx.triggerSave?.();
      } else {
        node.fx = null; node.fy = null;
      }
      setDraggingNode(null); getSimulation()?.alphaTarget(0);
      ctx.onDragEnd?.();
      if (ctx.viewport) ctx.viewport.pause = false;
      downPoint = null;
      draw();
      return;
    }
    // 无拖拽→处理tap选择
    if (Date.now() - lastTapTime < 300) return;
    lastTapTime = Date.now();
    e.preventDefault();
    if (getWasDragged()) { setWasDragged(false); return; }
    if (!e.changedTouches[0]) return;
    const touch = e.changedTouches[0];
    handleTap(...toWorldPos({ clientX: touch.clientX, clientY: touch.clientY }));
  });

  canvas.addEventListener("touchcancel", () => {
    clearLongPress(); pendingTouchNode = null;
    if (getDraggingNode()) {
      const node = getDraggingNode();
      node.fx = null; node.fy = null;
      setDraggingNode(null); getSimulation()?.alphaTarget(0);
      ctx.onDragEnd?.();
      if (ctx.viewport) ctx.viewport.pause = false;
    }
    downPoint = null;
    draw();
  });

  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    const [mx, my] = toWorldPos(e);
    const nodes = getSimulation()?.nodes();
    const hoverNode = nodes ? hitTestNode(mx, my, nodes, getNodeExpand()) : null;
    sharedState.hoverNodeId = hoverNode ? hoverNode.id : null;
    if (sharedState.focusMode && sharedState.directDraw) sharedState.directDraw();
    const inLinkMode = ctx.getLinkMode?.() && ctx.getLinkSrc?.();
    if (getDraggingNode()) { canvas.style.cursor = "grabbing"; }
    else if (inLinkMode && hoverNode) { canvas.style.cursor = "crosshair"; }
    else if (inLinkMode) { canvas.style.cursor = "crosshair"; }
    else if (hoverNode) { canvas.style.cursor = "pointer"; }
    else { canvas.style.cursor = "grab"; }
    if (getDraggingNode()) {
      if (downPoint) { if (Math.hypot(mx - downPoint[0], my - downPoint[1]) >= DRAG_THRESHOLD) setWasDragged(true); }
      getDraggingNode().fx = mx; getDraggingNode().fy = my; getSimulation()?.alpha(0.3).restart();
    }
    if (ctx.onLinkCursorMove && ctx.getLinkMode?.() && ctx.getLinkSrc?.()) {
      ctx.onLinkCursorMove(mx, my);
    }
    if (!getDraggingNode() && hoverNode && hoverNode.note?.trim()) {
      if (hoveredNodeNote !== hoverNode.note) { hoveredNodeNote = hoverNode.note; updateTooltip(hoverNode.note, e.offsetX, e.offsetY); }
    } else hideTooltip();

    // --- 右键框选 ---
    if (isRightButtonDown && !isBoxSelecting && boxStart) {
      const [sx1, sy1] = worldToScreen(boxStart[0], boxStart[1]);
      const [sx2, sy2] = worldToScreen(mx, my);
      if (Math.hypot(sx2 - sx1, sy2 - sy1) >= BOX_MIN_SIZE) {
        isBoxSelecting = true;
        if (ctx.selectionBox) ctx.selectionBox.style.display = 'block';
      }
    }
    if (isBoxSelecting && ctx.selectionBox && boxStart) {
      const parentRect = ctx.appShell!.getBoundingClientRect();
      const [sx1, sy1] = worldToScreen(boxStart[0], boxStart[1]);
      const [sx2, sy2] = worldToScreen(mx, my);
      ctx.selectionBox.style.left = (Math.min(sx1, sx2) - parentRect.left) + 'px';
      ctx.selectionBox.style.top = (Math.min(sy1, sy2) - parentRect.top) + 'px';
      ctx.selectionBox.style.width = Math.abs(sx2 - sx1) + 'px';
      ctx.selectionBox.style.height = Math.abs(sy2 - sy1) + 'px';
      return;
    }
  });

  canvas.addEventListener("pointerup", (e: PointerEvent) => {
    if (e.button === 2) {
      if (isRightButtonDown) {
        isRightButtonDown = false;
        if (ctx.viewport) ctx.viewport.pause = false;
        if (isBoxSelecting) {
          isBoxSelecting = false;
          if (ctx.selectionBox) ctx.selectionBox.style.display = 'none';
                    if (boxStart) {
            const [mx, my] = toWorldPos(e);
            showBoxMenu(getNodesInRect(boxStart[0], boxStart[1], mx, my), e.clientX, e.clientY);
          }
          boxStart = null;
          lastBoxUpTime = Date.now();
        } else {
                    triggerContextMenu(e.clientX, e.clientY);
        }
      }
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    clearLongPress();
    if (getDraggingNode()) {
      const node = getDraggingNode();
      // 固定节点拖拽后保持 fx/fy（已在 pointermove 中设置）
      if (getWasDragged() && isFixedNode && isFixedNode(node.id)) {
        // 将模拟位置写回 graph（否则刷新后丢失）
        const gn = ctx.graph.nodes.find((gn: any) => gn.id === node.id);
        if (gn) { gn.fx = node.fx; gn.fy = node.fy; gn.x = node.x; gn.y = node.y; }
        ctx.triggerSave?.();
      } else {
        node.fx = null; node.fy = null;
      }
      setDraggingNode(null); getSimulation()?.alphaTarget(0); canvas.style.cursor = "grab"; draw();
      ctx.onDragEnd?.();
      if (ctx.viewport) ctx.viewport.pause = false;
    }
    downPoint = null;
  });

  canvas.addEventListener("click", (e: MouseEvent) => {
    if (getWasDragged()) { setWasDragged(false); return; }
    // 若 touchend 刚刚处理过 tap（300ms 内），跳过避免双击
    if (Date.now() - lastTapTime < 500) return;
    handleTap(...toWorldPos(e));
  });

  canvas.addEventListener("pointerleave", () => {
    sharedState.hoverNodeId = null;
    if (sharedState.focusMode && sharedState.directDraw) sharedState.directDraw();
  });

  canvas.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault(); hideTooltip();
    if (Date.now() - lastBoxUpTime < 200) return; // 框选刚完成，跳过右键菜单
    triggerContextMenu(e.clientX, e.clientY);
  });
}
