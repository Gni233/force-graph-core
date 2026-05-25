/**
 * 共享状态模块 — 替代原 Obsidian 插件中的 window.__fg_* 全局变量
 */
let _focusModeFn: (() => boolean) | null = null;
let _hoverNodeId: string | null = null;
let _selectedNodeIdsFn: (() => string[]) | null = null;
let _clearSelectionFn: (() => void) | null = null;

export const sharedState = {
  /** 直接绘制函数（绕过 RAF 节流） */
  directDraw: null as (() => void) | null,

  get focusMode() { return _focusModeFn?.() ?? false; },
  /** 设置 focusMode 查询函数 */
  setFocusModeFn(fn: () => boolean) { _focusModeFn = fn; },

  get hoverNodeId() { return _hoverNodeId; },
  set hoverNodeId(id: string | null) { _hoverNodeId = id; },

  get selectedNodeIds() { return _selectedNodeIdsFn?.() ?? []; },
  /** 设置 selectedNodeIds 查询函数 */
  setSelectedNodeIdsFn(fn: () => string[]) { _selectedNodeIdsFn = fn; },

  get clearSelection() { return _clearSelectionFn; },
  set clearSelection(fn: (() => void) | null) { _clearSelectionFn = fn; },

  /** 禁止 Markdown 写回（独立版暂无用，保留兼容） */
  disableMdSync: null as (() => void) | null,
};
