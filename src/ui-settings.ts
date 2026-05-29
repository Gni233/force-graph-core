import { THEMES, getThemeLabel } from "./theme";

const V = (name: string, fallback: string) => `var(${name},${fallback})`;

interface SliderHandle {
  set: (v: number) => void;
}

function makeSlider(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  val: number,
  step: number,
  onChange: (v: number) => void
): SliderHandle {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;align-items:center;margin:2px 0;";
  const lb = document.createElement("span");
  lb.style.cssText = "font-size:" + V('--fg-font-md', '0.85em') + ";width:" + V('--fg-label-width', '110px') + ";flex-shrink:0;text-align:right;";
  lb.textContent = label;
  row.appendChild(lb);
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(val);
  range.style.cssText = "flex:1;";
  const num = document.createElement("input");
  num.type = "number";
  num.min = String(min);
  num.max = String(max);
  num.step = String(step);
  num.value = String(val);
  num.style.cssText = "width:" + V('--fg-input-number-width', '55px') + ";font-size:" + V('--fg-font-md', '0.85em') + ";text-align:right;";
  const round = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  range.addEventListener("input", () => {
    const v = parseFloat(range.value);
    num.value = round > 0 ? v.toFixed(round) : String(Math.round(v));
    onChange(v);
  });
  num.addEventListener("change", () => {
    const v = parseFloat(num.value);
    if (!isNaN(v)) { range.value = String(v); onChange(v); }
  });
  row.appendChild(range);
  row.appendChild(num);
  parent.appendChild(row);
  return { set: (v: number) => { range.value = String(v); num.value = round > 0 ? v.toFixed(round) : String(Math.round(v)); } };
}

function makeCheckbox(
  parent: HTMLElement,
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void
): { set: (v: boolean) => void } {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:6px;align-items:center;margin:2px 0;";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  row.appendChild(cb);
  const lb = document.createElement("span");
  lb.style.cssText = "font-size:" + V('--fg-font-md', '0.85em') + ";";
  lb.textContent = label;
  row.appendChild(lb);
  parent.appendChild(row);
  return { set: (v: boolean) => { cb.checked = v; } };
}

export function buildSettings(
  container: HTMLElement,
  params: {
    getLinkDist: () => number; setLinkDist: (v: number) => void;
    getLabelSize: () => number; setLabelSize: (v: number) => void;
    getCharge: () => number; setCharge: (v: number) => void;
    getLinkStr: () => number; setLinkStr: (v: number) => void;
    getCollideR: () => number; setCollideR: (v: number) => void;
    getCenterS: () => number; setCenterS: (v: number) => void;
    getGroupBound: () => number; setGroupBound: (v: number) => void;
    getHeatingTime: () => number; setHeatingTime: (v: number) => void;
    getAlphaTarget: () => number; setAlphaTarget: (v: number) => void;
    getEditPanelOpacity: () => number; setEditPanelOpacity: (v: number) => void;
    getUseRAFL: () => boolean; setUseRAFL: (v: boolean) => void;
    getNodeExpand: () => number; setNodeExpand: (v: number) => void;
    getLineExpand: () => number; setLineExpand: (v: number) => void;
    getShowGLabels: () => boolean; setShowGLabels: (v: boolean) => void;
    getGlMin: () => number; setGlMin: (v: number) => void;
    getGlMax: () => number; setGlMax: (v: number) => void;
    getGridVis: () => boolean; setGridVis: (v: boolean) => void;
    getAxisVis: () => boolean; setAxisVis: (v: boolean) => void;
    getAxisTicks: () => boolean; setAxisTicks: (v: boolean) => void;
    getGridSp: () => number; setGridSp: (v: number) => void;
    getAr: () => number; setAr: (v: number) => void;
    getSimulation: () => any;
    getGw: () => number;
    getGh: () => number;
    draw: () => void;
    getInitSim: () => () => void;
    getSaveData: () => () => Promise<void>;
    graph: any;
    getGraphTheme: () => string;
    setGraphTheme: (v: string) => void;
    getDefaultValues: () => Record<string, number | boolean | string>;
    getFocusMode: () => boolean;
    setFocusMode: (v: boolean) => void;
    getFluidAppearance: () => boolean;
    setFluidAppearance: (v: boolean) => void;
    getGlowAppearance: () => boolean;
    setGlowAppearance: (v: boolean) => void;
    getGravityGrid: () => boolean;
    setGravityGrid: (v: boolean) => void;
    getGridWidth: () => number;
    setGridWidth: (v: number) => void;
  }
) {
  const {
    getLinkDist, setLinkDist, getLabelSize, setLabelSize,
    getCharge, setCharge, getLinkStr, setLinkStr,
    getCollideR, setCollideR, getCenterS, setCenterS,
    getGroupBound, setGroupBound, getHeatingTime, setHeatingTime,
    getAlphaTarget, setAlphaTarget, getEditPanelOpacity, setEditPanelOpacity,
    getUseRAFL, setUseRAFL,
    getNodeExpand, setNodeExpand, getLineExpand, setLineExpand,
    getShowGLabels, setShowGLabels, getGlMin, setGlMin,
    getGlMax, setGlMax, getGridVis, setGridVis,
    getAxisVis, setAxisVis, getAxisTicks, setAxisTicks,
    getGridSp, setGridSp, getAr, setAr,
    getSimulation, getGw, getGh,
    draw, getInitSim, getSaveData, graph,
    getGraphTheme, setGraphTheme, getFocusMode, setFocusMode,
    getFluidAppearance, setFluidAppearance, getGlowAppearance, setGlowAppearance, getGravityGrid, setGravityGrid, getGridWidth, setGridWidth, getDefaultValues
  } = params;

  // 主题下拉菜单
  const themeRow = document.createElement("div");
  themeRow.style.cssText = "margin-bottom:12px;";
  const themeLabel = document.createElement("span");
  themeLabel.textContent = "图区主题：";
  themeLabel.style.cssText = "margin-right:8px;";
  themeRow.appendChild(themeLabel);
  const themeSelect = document.createElement("select");
  Object.keys(THEMES).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key; opt.textContent = getThemeLabel(key);
    themeSelect.appendChild(opt);
  });
  themeSelect.value = getGraphTheme() || 'default';
  themeSelect.addEventListener('change', () => {
    setGraphTheme(themeSelect.value);
    getSaveData()();
    draw();
  });
  themeRow.appendChild(themeSelect);
  container.appendChild(themeRow);

  // 区块标题辅助函数
  const addSection = (title: string) => {
    const hdr = document.createElement("div");
    hdr.textContent = title;
    hdr.style.cssText = "font-weight:bold;margin:10px 0 4px;padding-top:8px;border-top:1px solid " + V('--fg-border-light', 'rgba(255,255,255,0.08)') + ";font-size:" + V('--fg-font-sm', '0.8em') + ";color:" + V('--fg-text-muted', '#999') + ";";
    container.appendChild(hdr);
  };

  // === 力学参数 ===
  addSection("力学参数");
  const linkDistSlider = makeSlider(container, "连线距离", 30, 300, getLinkDist(), 1, v => { setLinkDist(v); getInitSim()(); getSaveData()(); });
  const chargeSlider = makeSlider(container, "斥力", -500, -10, getCharge(), 10, v => { setCharge(v); getInitSim()(); getSaveData()(); });
  const linkStrSlider = makeSlider(container, "连线强度", 0, 1, getLinkStr(), 0.05, v => { setLinkStr(v); getInitSim()(); getSaveData()(); });
  const collideRSlider = makeSlider(container, "碰撞半径", 0, 50, getCollideR(), 1, v => { setCollideR(v); getInitSim()(); getSaveData()(); });
  const centerSSlider = makeSlider(container, "向心强度", 0, 0.2, getCenterS(), 0.01, v => { setCenterS(v); getInitSim()(); getSaveData()(); });
  const groupBoundSlider = makeSlider(container, "集合边界", 0, 2, getGroupBound(), 0.1, v => { setGroupBound(v); getInitSim()(); getSaveData()(); });
  const heatingTimeSlider = makeSlider(container, "加热时间(秒)", 0, 10, getHeatingTime(), 0.5, v => { setHeatingTime(v); getSaveData()(); });
  const alphaTargetSlider = makeSlider(container, "目标活跃度", 0, 1, getAlphaTarget(), 0.05, v => { setAlphaTarget(v); getInitSim()(); getSaveData()(); });

  // === 文字与外观 ===
  addSection("文字与外观");
  const labelSizeSlider = makeSlider(container, "文字大小", 8, 40, getLabelSize(), 1, v => { setLabelSize(v); getSaveData()(); });
  const editPanelOpacitySlider = makeSlider(container, "编辑面板透明度", 0, 1, getEditPanelOpacity(), 0.05, v => { setEditPanelOpacity(v); getSaveData()(); });
  const nodeExpandSlider = makeSlider(container, "节点点击扩展", 0, 20, getNodeExpand(), 1, v => { setNodeExpand(v); getSaveData()(); });
  const lineExpandSlider = makeSlider(container, "边点击扩展", 0, 20, getLineExpand(), 1, v => { setLineExpand(v); getSaveData()(); });
  const glChk = makeCheckbox(container, "显示集合标签", getShowGLabels(), v => { setShowGLabels(v); getSaveData()(); });
  const glMinSlider = makeSlider(container, "最小集合标签", 5, 20, getGlMin(), 1, v => { setGlMin(v); getSaveData()(); });
  const glMaxSlider = makeSlider(container, "最大集合标签", 10, 50, getGlMax(), 1, v => { setGlMax(v); getSaveData()(); });

  // === 显示效果 ===
  addSection("显示效果");
  const focusChk = makeCheckbox(container, "聚焦", getFocusMode(), v => { setFocusMode(v); draw(); getSaveData()(); });
  const fluidChk = makeCheckbox(container, "流体节点", getFluidAppearance(), v => { setFluidAppearance(v); draw(); getSaveData()(); });
  const glowChk = makeCheckbox(container, "节点光晕", getGlowAppearance(), v => { setGlowAppearance(v); draw(); getSaveData()(); });
  const gravityChk = makeCheckbox(container, "引力网", getGravityGrid(), v => { setGravityGrid(v); draw(); getSaveData()(); });

  // === 网格 ===
  addSection("网格");
  const gridChk = makeCheckbox(container, "显示网格", getGridVis(), v => { setGridVis(v); getSaveData()(); });
  const axisChk = makeCheckbox(container, "显示坐标轴", getAxisVis(), v => { setAxisVis(v); getSaveData()(); });
  const ticksChk = makeCheckbox(container, "坐标轴刻度", getAxisTicks(), v => { setAxisTicks(v); getSaveData()(); });
  const gridSpSlider = makeSlider(container, "网格间距", 10, 100, getGridSp(), 5, v => { setGridSp(v); getSaveData()(); });
  const arSlider = makeSlider(container, "图区高宽比", 0.3, 1.5, getAr(), 0.05, v => { setAr(v); getSaveData()(); });
  const gridWidthSlider = makeSlider(container, "网格线宽", 0.2, 4, getGridWidth(), 0.1, v => { setGridWidth(v); getSaveData()(); });

  // === 性能 ===
  addSection("性能");
  const raflChk = makeCheckbox(container, "性能模式 (RAF 节流)", getUseRAFL(), v => { setUseRAFL(v); if (getSimulation()) getSimulation()!.alpha(0.3).restart(); getSaveData()(); });

  // 恢复默认按钮
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "恢复默认";
  resetBtn.style.cssText = "margin-top:8px;";
  resetBtn.onclick = () => {
    const defs = getDefaultValues();
    setLinkDist(defs.defaultLinkDistance as number); linkDistSlider.set(defs.defaultLinkDistance as number);
    setLabelSize(defs.defaultFontSize as number); labelSizeSlider.set(defs.defaultFontSize as number);
    setCharge(defs.defaultCharge as number); chargeSlider.set(defs.defaultCharge as number);
    setLinkStr(defs.defaultLinkStrength as number); linkStrSlider.set(defs.defaultLinkStrength as number);
    setCollideR(defs.defaultCollideRadius as number); collideRSlider.set(defs.defaultCollideRadius as number);
    setCenterS(defs.defaultCenterStrength as number); centerSSlider.set(defs.defaultCenterStrength as number);
    setGroupBound(defs.defaultGroupBound as number); groupBoundSlider.set(defs.defaultGroupBound as number);
    setHeatingTime(defs.defaultHeatingTime as number); heatingTimeSlider.set(defs.defaultHeatingTime as number);
    setAlphaTarget(defs.defaultAlphaTarget as number); alphaTargetSlider.set(defs.defaultAlphaTarget as number);
    setEditPanelOpacity(defs.defaultEditPanelOpacity as number); editPanelOpacitySlider.set(defs.defaultEditPanelOpacity as number);
    setUseRAFL(defs.defaultUseRAFL as boolean); raflChk.set(defs.defaultUseRAFL as boolean);
    setFocusMode(defs.defaultFocusMode as boolean); focusChk.set(defs.defaultFocusMode as boolean);
    setFluidAppearance(defs.defaultFluidAppearance as boolean); fluidChk.set(defs.defaultFluidAppearance as boolean);
    setGlowAppearance(defs.defaultGlowAppearance as boolean); glowChk.set(defs.defaultGlowAppearance as boolean);
    setGravityGrid(defs.defaultGravityGrid as boolean); gravityChk.set(defs.defaultGravityGrid as boolean);
    setGridWidth(defs.defaultGridWidth as number); gridWidthSlider.set(defs.defaultGridWidth as number);
    setNodeExpand(defs.defaultNodeExpand as number); nodeExpandSlider.set(defs.defaultNodeExpand as number);
    setLineExpand(defs.defaultLineExpand as number); lineExpandSlider.set(defs.defaultLineExpand as number);
    setShowGLabels(defs.defaultShowGLabels as boolean); glChk.set(defs.defaultShowGLabels as boolean);
    setGlMin(defs.defaultGlMin as number); glMinSlider.set(defs.defaultGlMin as number);
    setGlMax(defs.defaultGlMax as number); glMaxSlider.set(defs.defaultGlMax as number);
    setGridVis(defs.defaultGridVis as boolean); gridChk.set(defs.defaultGridVis as boolean);
    setAxisVis(defs.defaultAxisVis as boolean); axisChk.set(defs.defaultAxisVis as boolean);
    setAxisTicks(defs.defaultAxisTicks as boolean); ticksChk.set(defs.defaultAxisTicks as boolean);
    setGridSp(defs.defaultGridSpacing as number); gridSpSlider.set(defs.defaultGridSpacing as number);
    setAr(defs.defaultAr as number); arSlider.set(defs.defaultAr as number);
    setGraphTheme(defs.defaultGraphTheme as string); themeSelect.value = defs.defaultGraphTheme as string;
    getInitSim()(); getSaveData()(); draw();
  };
  container.appendChild(resetBtn);

  return {
    updateInfo: () => {
      linkDistSlider.set(getLinkDist());
      labelSizeSlider.set(getLabelSize());
      chargeSlider.set(getCharge());
      linkStrSlider.set(getLinkStr());
      collideRSlider.set(getCollideR());
      centerSSlider.set(getCenterS());
      groupBoundSlider.set(getGroupBound());
      heatingTimeSlider.set(getHeatingTime());
      alphaTargetSlider.set(getAlphaTarget());
      editPanelOpacitySlider.set(getEditPanelOpacity());
      nodeExpandSlider.set(getNodeExpand());
      lineExpandSlider.set(getLineExpand());
      glMinSlider.set(getGlMin());
      glMaxSlider.set(getGlMax());
      gridSpSlider.set(getGridSp());
      arSlider.set(getAr());
      raflChk.set(getUseRAFL());
      focusChk.set(getFocusMode());
      fluidChk.set(getFluidAppearance());
      glowChk.set(getGlowAppearance());
      gravityChk.set(getGravityGrid());
      gridWidthSlider.set(getGridWidth());
      glChk.set(getShowGLabels());
      gridChk.set(getGridVis());
      axisChk.set(getAxisVis());
      ticksChk.set(getAxisTicks());
      themeSelect.value = getGraphTheme();
    }
  };
}
