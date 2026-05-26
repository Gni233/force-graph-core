/**
 * Android WebView 不支持 window.prompt，用 DOM 弹窗兜底
 * 在 Capacitor/WebView 环境会自动使用自定义弹窗，桌面端仍然用原生 prompt
 */
export function safePrompt(msg: string, defaultValue?: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (typeof prompt !== 'undefined') {
        const r = prompt(msg, defaultValue || '');
        resolve(r);
        return;
      }
    } catch {}

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#2d2d2d;padding:16px;border-radius:10px;min-width:260px;color:#ccc;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
    const label = document.createElement('div');
    label.textContent = msg;
    label.style.cssText = 'margin-bottom:10px;font-size:0.9em;';
    const input = document.createElement('input');
    input.value = defaultValue || '';
    input.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #555;border-radius:6px;background:#1e1e22;color:#ddd;margin-bottom:10px;box-sizing:border-box;';
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    const okBtn = document.createElement('button');
    okBtn.textContent = '确定';
    okBtn.style.cssText = 'padding:4px 16px;border:none;border-radius:6px;background:#4a6cf7;color:#fff;cursor:pointer;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'padding:4px 16px;border:1px solid #555;border-radius:6px;background:transparent;color:#ccc;cursor:pointer;';
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const cleanup = () => overlay.remove();
    okBtn.onclick = () => { cleanup(); resolve(input.value || null); };
    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { cleanup(); resolve(input.value || null); } });
    input.focus();
  });
}
