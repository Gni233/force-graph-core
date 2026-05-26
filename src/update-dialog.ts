/**
 * 更新对话框 - 玻璃风格弹窗
 */
import { UpdateInfo, getCurrentVersion } from './update-checker';

export function showUpdateDialog(info: UpdateInfo, onUpdate: () => void): void {
  const existing = document.querySelector('.fg-update-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'fg-update-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);' +
    'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  const panel = document.createElement('div');
  panel.style.cssText =
    'background:rgba(40,42,48,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px 24px;' +
    'min-width:360px;max-width:440px;color:#d0d0d0;box-shadow:0 12px 48px rgba(0,0,0,0.5);';

  // 标题
  const title = document.createElement('div');
  title.style.cssText =
    'font-size:1.15em;font-weight:bold;margin-bottom:12px;color:#fff;display:flex;align-items:center;gap:8px;';
  title.innerHTML = '&#x1F389; 发现新版本';

  // 版本对比
  const verRow = document.createElement('div');
  verRow.style.cssText =
    'display:flex;align-items:center;gap:12px;margin-bottom:14px;font-size:0.9em;';
  verRow.innerHTML = `
    <span style="background:rgba(255,255,255,0.08);padding:3px 10px;border-radius:4px;">${getCurrentVersion()}</span>
    <span style="color:#888;">→</span>
    <span style="background:rgba(74,108,247,0.25);color:#8aafff;padding:3px 10px;border-radius:4px;font-weight:bold;">${info.version}</span>
  `;

  // 更新内容
  const bodyWrap = document.createElement('div');
  bodyWrap.style.cssText =
    'max-height:160px;overflow-y:auto;margin-bottom:16px;font-size:0.82em;line-height:1.5;' +
    'color:#999;white-space:pre-wrap;border-left:2px solid rgba(255,255,255,0.08);padding-left:12px;';
  bodyWrap.textContent = (info.body || '（无更新说明）').slice(0, 1000);

  // 按钮区
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  const laterBtn = document.createElement('button');
  laterBtn.textContent = '稍后';
  laterBtn.style.cssText =
    'padding:6px 18px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;' +
    'background:transparent;color:#aaa;cursor:pointer;font-size:0.85em;';
  laterBtn.onclick = () => overlay.remove();

  const updateBtn = document.createElement('button');
  updateBtn.textContent = '立即更新';
  updateBtn.style.cssText =
    'padding:6px 18px;border:none;border-radius:8px;' +
    'background:linear-gradient(135deg, #4a6cf7, #6c8cff);color:#fff;cursor:pointer;font-size:0.85em;font-weight:bold;';
  updateBtn.onclick = () => { onUpdate(); overlay.remove(); };

  btnRow.appendChild(laterBtn);
  btnRow.appendChild(updateBtn);

  panel.appendChild(title);
  panel.appendChild(verRow);
  panel.appendChild(bodyWrap);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
