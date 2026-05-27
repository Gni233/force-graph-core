export interface ThemeConfig {
  canvasBackground: string;
  nodeDefaultColor: string;
  labelColor: string;
  uiPanelBackground: string;
  uiButtonBackground: string;
  uiButtonTextColor: string;
  uiInputBackground: string;
  uiInputTextColor: string;
  uiInputBorder: string;
}

export const THEMES: Record<string, ThemeConfig> = {
  "atom-light": {
    canvasBackground: "#fafafa",
    nodeDefaultColor: "#383a42",
    labelColor: "#383a42",
    uiPanelBackground: "#ededed",
    uiButtonBackground: "#dad8d8",
    uiButtonTextColor: "#383a42",
    uiInputBackground: "#ededed",
    uiInputTextColor: "#383a42",
    uiInputBorder: "#aeadb3",
  },
  "amoled-dark": {
    canvasBackground: "#0a0a0a",
    nodeDefaultColor: "#ffffff",
    labelColor: "#ffffff",
    uiPanelBackground: "#1e1e1e",
    uiButtonBackground: "#323232",
    uiButtonTextColor: "#ffffff",
    uiInputBackground: "#1e1e1e",
    uiInputTextColor: "#ffffff",
    uiInputBorder: "#7e7e7e",
  },
  "atom-dark": {
    canvasBackground: "#272b34",
    nodeDefaultColor: "#dddedf",
    labelColor: "#dddedf",
    uiPanelBackground: "#303540",
    uiButtonBackground: "#393f4c",
    uiButtonTextColor: "#dddedf",
    uiInputBackground: "#303540",
    uiInputTextColor: "#dddedf",
    uiInputBorder: "#505562",
  },
  "biscuit-dark": {
    canvasBackground: "#453636",
    nodeDefaultColor: "#ffe9c7",
    labelColor: "#ffe9c7",
    uiPanelBackground: "#534141",
    uiButtonBackground: "#644f4f",
    uiButtonTextColor: "#ffe9c7",
    uiInputBackground: "#534141",
    uiInputTextColor: "#ffe9c7",
    uiInputBorder: "#8c6e6e",
  },
  "coffee-dark": {
    canvasBackground: "#3a3845",
    nodeDefaultColor: "#fadac3",
    labelColor: "#fadac3",
    uiPanelBackground: "#4c464e",
    uiButtonBackground: "#554d52",
    uiButtonTextColor: "#fadac3",
    uiInputBackground: "#4c464e",
    uiInputTextColor: "#fadac3",
    uiInputBorder: "#786660",
  },
  "dracula": {
    canvasBackground: "#282a36",
    nodeDefaultColor: "#f8f8f2",
    labelColor: "#f8f8f2",
    uiPanelBackground: "#303241",
    uiButtonBackground: "#383b4c",
    uiButtonTextColor: "#f8f8f2",
    uiInputBackground: "#303241",
    uiInputTextColor: "#f8f8f2",
    uiInputBorder: "#585c74",
  },
  "everforest-light": {
    canvasBackground: "#fdf6e3",
    nodeDefaultColor: "#5c6a72",
    labelColor: "#5c6a72",
    uiPanelBackground: "#f3efda",
    uiButtonBackground: "#edead5",
    uiButtonTextColor: "#5c6a72",
    uiInputBackground: "#f3efda",
    uiInputTextColor: "#5c6a72",
    uiInputBorder: "#dfdbc8",
  },
  "everforest-dark": {
    canvasBackground: "#2f383e",
    nodeDefaultColor: "#d3c6aa",
    labelColor: "#d3c6aa",
    uiPanelBackground: "#374247",
    uiButtonBackground: "#404c51",
    uiButtonTextColor: "#d3c6aa",
    uiInputBackground: "#374247",
    uiInputTextColor: "#d3c6aa",
    uiInputBorder: "#515b61",
  },
  "flexoki-dark": {
    canvasBackground: "#1c1b1a",
    nodeDefaultColor: "#cfcec4",
    labelColor: "#cfcec4",
    uiPanelBackground: "#343331",
    uiButtonBackground: "#403e3c",
    uiButtonTextColor: "#cfcec4",
    uiInputBackground: "#343331",
    uiInputTextColor: "#cfcec4",
    uiInputBorder: "#6f6e69",
  },
  "generic-dark": {
    canvasBackground: "#2a2a2a",
    nodeDefaultColor: "#ffffff",
    labelColor: "#ffffff",
    uiPanelBackground: "#3f3f3f",
    uiButtonBackground: "#545454",
    uiButtonTextColor: "#ffffff",
    uiInputBackground: "#3f3f3f",
    uiInputTextColor: "#ffffff",
    uiInputBorder: "#7e7e7e",
  },
  "gruvbox-dark": {
    canvasBackground: "#282828",
    nodeDefaultColor: "#fbf1c7",
    labelColor: "#fbf1c7",
    uiPanelBackground: "#32302f",
    uiButtonBackground: "#3c3836",
    uiButtonTextColor: "#fbf1c7",
    uiInputBackground: "#32302f",
    uiInputTextColor: "#fbf1c7",
    uiInputBorder: "#665c54",
  },
  "gruvbox-light": {
    canvasBackground: "#f9f5d7",
    nodeDefaultColor: "#282828",
    labelColor: "#282828",
    uiPanelBackground: "#f2e5bc",
    uiButtonBackground: "#ebdbb3",
    uiButtonTextColor: "#282828",
    uiInputBackground: "#f2e5bc",
    uiInputTextColor: "#282828",
    uiInputBorder: "#bdae93",
  },
  "kanagawa-dark": {
    canvasBackground: "#1f1f28",
    nodeDefaultColor: "#dcd7ba",
    labelColor: "#dcd7ba",
    uiPanelBackground: "#2a2a37",
    uiButtonBackground: "#363645",
    uiButtonTextColor: "#dcd7ba",
    uiInputBackground: "#2a2a37",
    uiInputTextColor: "#dcd7ba",
    uiInputBorder: "#49495f",
  },
  "luminescence-light": {
    canvasBackground: "#f2eee8",
    nodeDefaultColor: "#654941",
    labelColor: "#654941",
    uiPanelBackground: "#cdb7b1",
    uiButtonBackground: "#e1d4d0",
    uiButtonTextColor: "#654941",
    uiInputBackground: "#cdb7b1",
    uiInputTextColor: "#654941",
    uiInputBorder: "#dfdbc8",
  },
  "material-mint-light": {
    canvasBackground: "#bdd6db",
    nodeDefaultColor: "#05090a",
    labelColor: "#05090a",
    uiPanelBackground: "#6da5b0",
    uiButtonBackground: "#56939f",
    uiButtonTextColor: "#05090a",
    uiInputBackground: "#6da5b0",
    uiInputTextColor: "#05090a",
    uiInputBorder: "#39626a",
  },
  "material-mint-dark": {
    canvasBackground: "#121f21",
    nodeDefaultColor: "#bdd6db",
    labelColor: "#bdd6db",
    uiPanelBackground: "#1d3135",
    uiButtonBackground: "#2b4950",
    uiButtonTextColor: "#bdd6db",
    uiInputBackground: "#1d3135",
    uiInputTextColor: "#bdd6db",
    uiInputBorder: "#477a85",
  },
  "nord-dark": {
    canvasBackground: "#434c5e",
    nodeDefaultColor: "#eceff4",
    labelColor: "#eceff4",
    uiPanelBackground: "#4d576a",
    uiButtonBackground: "#67748e",
    uiButtonTextColor: "#eceff4",
    uiInputBackground: "#4d576a",
    uiInputTextColor: "#eceff4",
    uiInputBorder: "#959eb2",
  },
  "nord-darker": {
    canvasBackground: "#2e3440",
    nodeDefaultColor: "#eceff4",
    labelColor: "#eceff4",
    uiPanelBackground: "#3b4252",
    uiButtonBackground: "#434c5e",
    uiButtonTextColor: "#eceff4",
    uiInputBackground: "#3b4252",
    uiInputTextColor: "#eceff4",
    uiInputBorder: "#959eb2",
  },
  "nord-light": {
    canvasBackground: "#eceff4",
    nodeDefaultColor: "#2e3440",
    labelColor: "#2e3440",
    uiPanelBackground: "#e5e9f0",
    uiButtonBackground: "#d8dee9",
    uiButtonTextColor: "#2e3440",
    uiInputBackground: "#e5e9f0",
    uiInputTextColor: "#2e3440",
    uiInputBorder: "#8fbcbb",
  },
  "notion-light": {
    canvasBackground: "#ffffff",
    nodeDefaultColor: "#37352f",
    labelColor: "#37352f",
    uiPanelBackground: "#d0d4d7",
    uiButtonBackground: "#bdc3c7",
    uiButtonTextColor: "#37352f",
    uiInputBackground: "#d0d4d7",
    uiInputTextColor: "#37352f",
    uiInputBorder: "#919ba1",
  },
  "notion-dark": {
    canvasBackground: "#3d4448",
    nodeDefaultColor: "#e3e6e8",
    labelColor: "#e3e6e8",
    uiPanelBackground: "#4b5358",
    uiButtonBackground: "#5e686e",
    uiButtonTextColor: "#e3e6e8",
    uiInputBackground: "#4b5358",
    uiInputTextColor: "#e3e6e8",
    uiInputBorder: "#869198",
  },
  "rosebox": {
    canvasBackground: "#232323",
    nodeDefaultColor: "#a3a5aa",
    labelColor: "#a3a5aa",
    uiPanelBackground: "#282828",
    uiButtonBackground: "#333333",
    uiButtonTextColor: "#a3a5aa",
    uiInputBackground: "#282828",
    uiInputTextColor: "#a3a5aa",
    uiInputBorder: "#474747",
  },
  "rosepine-dark": {
    canvasBackground: "#191724",
    nodeDefaultColor: "#e0def4",
    labelColor: "#e0def4",
    uiPanelBackground: "#1f1d2e",
    uiButtonBackground: "#21202e",
    uiButtonTextColor: "#e0def4",
    uiInputBackground: "#1f1d2e",
    uiInputTextColor: "#e0def4",
    uiInputBorder: "#363253",
  },
  "royal-velvet": {
    canvasBackground: "#1e1e24",
    nodeDefaultColor: "#f8f8f2",
    labelColor: "#f8f8f2",
    uiPanelBackground: "#303241",
    uiButtonBackground: "#383b4c",
    uiButtonTextColor: "#f8f8f2",
    uiInputBackground: "#303241",
    uiInputTextColor: "#f8f8f2",
    uiInputBorder: "#585c74",
  },
  "sandy-beaches-light": {
    canvasBackground: "#f0eae2",
    nodeDefaultColor: "#685850",
    labelColor: "#685850",
    uiPanelBackground: "#ded8d1",
    uiButtonBackground: "#d4cdc8",
    uiButtonTextColor: "#685850",
    uiInputBackground: "#ded8d1",
    uiInputTextColor: "#685850",
    uiInputBorder: "#82756e",
  },
  "solarized-dark": {
    canvasBackground: "#073642",
    nodeDefaultColor: "#fdf6e3",
    labelColor: "#fdf6e3",
    uiPanelBackground: "#0a4c5c",
    uiButtonBackground: "#266173",
    uiButtonTextColor: "#fdf6e3",
    uiInputBackground: "#0a4c5c",
    uiInputTextColor: "#fdf6e3",
    uiInputBorder: "#6aa8af",
  },
  "solarized-light": {
    canvasBackground: "#fdf6e3",
    nodeDefaultColor: "#002b36",
    labelColor: "#002b36",
    uiPanelBackground: "#adb8b8",
    uiButtonBackground: "#91a0a1",
    uiButtonTextColor: "#002b36",
    uiInputBackground: "#adb8b8",
    uiInputTextColor: "#002b36",
    uiInputBorder: "#657b83",
  },
  "thorns": {
    canvasBackground: "#151515",
    nodeDefaultColor: "#d8d0d5",
    labelColor: "#d8d0d5",
    uiPanelBackground: "#2e2e2e",
    uiButtonBackground: "#3b3b3b",
    uiButtonTextColor: "#d8d0d5",
    uiInputBackground: "#2e2e2e",
    uiInputTextColor: "#d8d0d5",
    uiInputBorder: "#505050",
  },
};

export const THEME_LABELS: Record<string, string> = {
  "amoled-dark": "AMOLED 暗色",
  "atom-dark": "Atom 暗色",
  "atom-light": "Atom 亮色",
  "biscuit-dark": "Biscuit 暗色",
  "coffee-dark": "Coffee 暗色",
  "dracula": "Dracula",
  "everforest-dark": "Everforest 暗色",
  "everforest-light": "Everforest 亮色",
  "flexoki-dark": "Flexoki 暗色",
  "generic-dark": "通用暗色",
  "gruvbox-dark": "Gruvbox 暗色",
  "gruvbox-light": "Gruvbox 亮色",
  "kanagawa-dark": "Kanagawa 暗色",
  "luminescence-light": "Luminescence 亮色",
  "material-mint-dark": "Material Mint 暗色",
  "material-mint-light": "Material Mint 亮色",
  "nord-dark": "Nord 暗色",
  "nord-darker": "Nord 深暗",
  "nord-light": "Nord 亮色",
  "notion-dark": "Notion 暗色",
  "notion-light": "Notion 亮色",
  "rosebox": "Rosebox",
  "rosepine-dark": "Rosé Pine 暗色",
  "royal-velvet": "Royal Velvet",
  "sandy-beaches-light": "Sandy Beaches 亮色",
  "solarized-dark": "Solarized 暗色",
  "solarized-light": "Solarized 亮色",
  "thorns": "Thorns",
};

export function getTheme(name: string): ThemeConfig {
  return THEMES[name] || THEMES["generic-dark"];
}

export function getThemeLabel(name: string): string {
  return THEME_LABELS[name] || name;
}

// ---- CSS Custom Properties System ----
// Derives a complete set of CSS variables from a ThemeConfig.
// All UI components reference these variables instead of hardcoded colors.

export interface ThemeVars {
  [key: string]: string;
}

export function isThemeDark(t: ThemeConfig): boolean {
  const bg = t.canvasBackground;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bg);
  if (!m) return true;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.5;
}

function hexToRgbNum(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [40, 42, 48];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Lighten/darken a hex color by a ratio. Positive = lighter, negative = darker. */
function adjustHex(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgbNum(hex);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, c + (255 - c) * ratio)));
  const g2 = (c: number) => Math.round(Math.min(255, Math.max(0, c * (1 + ratio))));
  // For lightening, use f(); for darkening, use g2()
  if (ratio >= 0) {
    return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join("");
  } else {
    return "#" + [g2(r), g2(g), g2(b)].map(v => v.toString(16).padStart(2, "0")).join("");
  }
}

export function deriveThemeVars(t: ThemeConfig): ThemeVars {
  const dark = isThemeDark(t);
  const [sr, sg, sb] = hexToRgbNum(t.uiPanelBackground);

  // Glassmorphism: use the panel background with transparency
  const glassAlpha = dark ? "0.65" : "0.55";
  const glassBorderAlpha = dark ? "0.08" : "0.12";

  // Elevated surface (modals, dialogs) — slightly more opaque
  const elevatedAlpha = dark ? "0.85" : "0.80";

  // Hover state — slightly lighter/darker
  const hoverAmount = dark ? 0.08 : -0.06;

  // Text colors
  const textMuted = adjustHex(t.uiButtonTextColor, dark ? -0.35 : 0.35);
  const textDim = adjustHex(t.uiButtonTextColor, dark ? -0.55 : 0.50);

  return {
    // Canvas
    "--fg-canvas-bg": t.canvasBackground,

    // Surfaces
    "--fg-surface": t.uiPanelBackground,
    "--fg-surface-glass": `rgba(${sr},${sg},${sb},${glassAlpha})`,
    "--fg-surface-elevated": `rgba(${sr},${sg},${sb},${elevatedAlpha})`,

    // Text
    "--fg-text": t.uiButtonTextColor,
    "--fg-text-muted": textMuted,
    "--fg-text-dim": textDim,

    // Borders
    "--fg-border": t.uiInputBorder,
    "--fg-border-light": dark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)",

    // Inputs
    "--fg-input-bg": t.uiInputBackground,
    "--fg-input-text": t.uiInputTextColor,
    "--fg-input-border": t.uiInputBorder,

    // Buttons
    "--fg-button-bg": t.uiButtonBackground,
    "--fg-button-text": t.uiButtonTextColor,
    "--fg-button-hover": adjustHex(t.uiButtonBackground, hoverAmount),

    // Accent (primary action color)
    "--fg-accent": "#5B8FF9",
    "--fg-accent-hover": "#4a7ce0",
    "--fg-accent-text": "#ffffff",

    // Danger (destructive action color)
    "--fg-danger": "#e03030",
    "--fg-danger-hover": "#c52828",

    // Shadows (adapt to theme brightness)
    "--fg-shadow-sm": dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.08)",
    "--fg-shadow-md": dark
      ? "0 4px 16px rgba(0,0,0,0.4)"
      : "0 4px 16px rgba(0,0,0,0.12)",
    "--fg-shadow-lg": dark
      ? "0 8px 32px rgba(0,0,0,0.5)"
      : "0 8px 32px rgba(0,0,0,0.15)",

    // Glass effect
    "--fg-glass-blur": "12px",
    "--fg-glass-blur-sm": "4px",
    "--fg-glass-blur-md": "10px",
    "--fg-glass-blur-lg": "16px",
    "--fg-glass-border": dark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)",

    // Border radii
    "--fg-radius-sm": "4px",
    "--fg-radius-md": "8px",
    "--fg-radius-lg": "12px",

    // Layout
    "--fg-label-width": "110px",
    "--fg-input-number-width": "55px",
    "--fg-line-height": "1.5",

    // Font sizes
    "--fg-font-xxs": "0.65em",
    "--fg-font-xs": "0.72em",
    "--fg-font-sm": "0.8em",
    "--fg-font-md": "0.85em",
    "--fg-font-lg": "0.92em",
    "--fg-font-xl": "1.1em",

    // Transitions
    "--fg-transition-fast": "0.15s ease",
    "--fg-transition": "0.25s ease",

    // Scrollbar
    "--fg-scrollbar-thumb": dark
      ? "rgba(255,255,255,0.15)"
      : "rgba(0,0,0,0.15)",
    "--fg-scrollbar-thumb-hover": dark
      ? "rgba(255,255,255,0.3)"
      : "rgba(0,0,0,0.25)",

    // Sidebar specific
    "--fg-sidebar-bg": t.uiPanelBackground,
    "--fg-sidebar-border": t.uiInputBorder,
    "--fg-sidebar-header-text": t.uiButtonTextColor,
    "--fg-sidebar-item-hover": adjustHex(t.uiPanelBackground, dark ? 0.08 : -0.06),
    "--fg-sidebar-item-active": adjustHex(t.uiPanelBackground, dark ? 0.14 : -0.10),

    // Tab bar
    "--fg-tab-inactive": textMuted,
    "--fg-tab-active-bg": t.uiInputBackground,
    "--fg-tab-active-border": t.uiInputBorder,
  };
}

/** Apply theme CSS variables to a DOM element (usually :root / document.documentElement). */
export function applyThemeVars(el: HTMLElement, t: ThemeConfig): void {
  const vars = deriveThemeVars(t);
  const style = el.style;
  for (const [key, val] of Object.entries(vars)) {
    style.setProperty(key, val);
  }
}

/** Default CSS variable values (generic-dark), for use as fallback in CSS. */
export const CSS_VAR_DEFAULTS = deriveThemeVars(THEMES["generic-dark"]);
