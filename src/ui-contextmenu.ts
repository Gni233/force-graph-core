import { sharedState } from "./shared-state";

let currentMenu: HTMLElement | null = null;

export function closeContextMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }
  document.removeEventListener("pointerdown", onDocPointerDown);
  window.removeEventListener("keydown", onKeyDown);
}

function onDocPointerDown(e: PointerEvent) {
  if (currentMenu && !currentMenu.contains(e.target as Node)) {
    closeContextMenu();
    if (sharedState.clearSelection) {
      sharedState.clearSelection();
    }
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    closeContextMenu();
    if (sharedState.clearSelection) {
      sharedState.clearSelection();
    }
  }
}

export function showContextMenu(
  container: HTMLElement,
  x: number,
  y: number,
  items: { label: string; action: () => void }[]
) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.style.cssText = `position:absolute;left:${x}px;top:${y}px;z-index:100;background:rgba(40,42,48,0.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.3);padding:4px 0;min-width:120px;color:#d0d0d0;`;

  items.forEach(item => {
    const mi = document.createElement("div");
    mi.textContent = item.label;
    mi.style.cssText = "padding:4px 8px;cursor:pointer;font-size:0.9em;";
    mi.onmouseenter = () => mi.style.background = "rgba(255,255,255,0.12)";
    mi.onmouseleave = () => mi.style.background = "";
    mi.onclick = () => {
      item.action();
      closeContextMenu();
      if (sharedState.clearSelection) {
        sharedState.clearSelection();
      }
    };
    menu.appendChild(mi);
  });

  container.appendChild(menu);
  currentMenu = menu;

  setTimeout(() => {
    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("keydown", onKeyDown);
  }, 0);
}
