function dl(content, name, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
function csvEsc(s) {
  s = s == null ? "" : "" + s;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function esc(s) {
  return (s == null ? "" : "" + s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function parseCSV(text) {
  const rows = [];
  let i = 0,
    f = "",
    row = [],
    q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c == '"') {
        if (text[i + 1] == '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else {
      if (c == '"') q = true;
      else if (c == ",") {
        row.push(f);
        f = "";
      } else if (c == "\n" || c == "\r") {
        if (c == "\r" && text[i + 1] == "\n") i++;
        if (f !== "" || row.length) {
          row.push(f);
          rows.push(row);
          row = [];
          f = "";
        }
      } else f += c;
    }
    i++;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}
function read(k, d) {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "null");
    return v == null ? d : v;
  } catch (e) {
    return d;
  }
}
function store(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}
let appConfirmCallback = null;
function appConfirm(options, onConfirm) {
  const cfg =
    typeof options === "string"
      ? { title: "Confirm action?", message: options }
      : options || {};
  const title = cfg.title || "Confirm action?";
  const message = cfg.message || "Please confirm before continuing.";
  const confirmText = cfg.confirmText || "Continue";
  const modal = document.getElementById("appConfirmModal");

  if (!modal) {
    if (confirm(message || title)) onConfirm?.();
    return;
  }

  appConfirmCallback = typeof onConfirm === "function" ? onConfirm : null;
  const titleEl = document.getElementById("appConfirmTitle");
  const messageEl = document.getElementById("appConfirmMessage");
  const confirmButton = document.getElementById("appConfirmButton");

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (confirmButton) {
    confirmButton.textContent = confirmText;
    confirmButton.className = "btn" + (cfg.danger ? " u-bg-red" : "");
  }

  modal.classList.remove("hidden");
  confirmButton?.focus();
}
function cancelAppConfirm() {
  appConfirmCallback = null;
  document.getElementById("appConfirmModal")?.classList.add("hidden");
}
function confirmAppConfirm() {
  const callback = appConfirmCallback;
  cancelAppConfirm();
  callback?.();
}
window.appConfirm = appConfirm;
window.cancelAppConfirm = cancelAppConfirm;
window.confirmAppConfirm = confirmAppConfirm;
function mdToHtml(md) {
  if (!md) return "";
  let h = esc(md);
  h = h
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, '<h3 class="u-markdown-h2">$1</h3>')
    .replace(/^# (.*)$/gm, '<h3 class="u-markdown-h1">$1</h3>');
  h = h
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>")
    .replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
  h = h.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  h = h.replace(
    /(<li>[\s\S]*?<\/li>)/g,
    '<ul class="u-list-md">$1</ul>',
  );
  h = h.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  return h;
}

function applyDataStyles(root) {
  if (typeof document === "undefined") return;
  const selector = [
    "[data-style-background]",
    "[data-style-color]",
    "[data-style-font-size]",
    "[data-style-max-width]",
    "[data-style-width]",
  ].join(",");
  const nodes = [];
  if (root?.nodeType === 1 && root.matches?.(selector)) nodes.push(root);
  root?.querySelectorAll?.(selector).forEach((node) => nodes.push(node));
  nodes.forEach((node) => {
    const ds = node.dataset;
    if (ds.styleBackground != null)
      node.style.background = ds.styleBackground;
    if (ds.styleColor != null) node.style.color = ds.styleColor;
    if (ds.styleFontSize != null) node.style.fontSize = ds.styleFontSize;
    if (ds.styleMaxWidth != null) node.style.maxWidth = ds.styleMaxWidth;
    if (ds.styleWidth != null) node.style.width = ds.styleWidth;
  });
}

(function initDataStyleObserver() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined")
    return;
  const start = () => {
    applyDataStyles(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => applyDataStyles(node));
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
