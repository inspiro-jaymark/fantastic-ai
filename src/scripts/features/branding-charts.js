const THEMES = [
  { p: "#0e7c7b", a: "#f4c542" },
  { p: "#a4248f", a: "#f4c542" },
  { p: "#7c1f2e", a: "#e2c044" },
  { p: "#4c1d95", a: "#f43f5e" },
  { p: "#0f172a", a: "#38bdf8" },
  { p: "#065f46", a: "#a3e635" },
];
const swEl = document.getElementById("themeSwatches");
THEMES.forEach((t) => {
  const d = document.createElement("div");
  d.className = "sw";
  d.style.background =
    "linear-gradient(135deg," + t.p + " 50%," + t.a + " 50%)";
  d.onclick = () => {
    document.getElementById("colPrimary").value = t.p;
    document.getElementById("colAccent").value = t.a;
    applyBranding();
  };
  swEl.appendChild(d);
});
function shade(h, p) {
  const n = parseInt(h.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.round(r * (1 - p));
  g = Math.round(g * (1 - p));
  b = Math.round(b * (1 - p));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
function tint(h, p) {
  const n = parseInt(h.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.round(r + (255 - r) * p);
  g = Math.round(g + (255 - g) * p);
  b = Math.round(b + (255 - b) * p);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
function applyBranding() {
  const p = document.getElementById("colPrimary").value,
    a = document.getElementById("colAccent").value,
    rs = document.documentElement.style;
  rs.setProperty("--teal", p);
  rs.setProperty("--teal-dark", shade(p, 0.28));
  rs.setProperty("--teal-light", tint(p, 0.25));
  rs.setProperty("--yellow", a);
  rs.setProperty("--yellow-dark", shade(a, 0.22));
  document.getElementById("brandLogo").textContent =
    document.getElementById("brandInit").value || "FT";
  const nm = document.getElementById("brandName").value || "FANTASTIC TOOL";
  document.getElementById("brandTitle").innerHTML =
    nm + ' <span class="badge">v3.2</span>';
  document.getElementById("brandTag").textContent =
    document.getElementById("brandTagIn").value;
}
["colPrimary", "colAccent", "brandName", "brandInit", "brandTagIn"].forEach(
  (id) => {
    const el = document.getElementById(id);
    if (el) el.oninput = applyBranding;
  },
);
document.getElementById("agInput").oninput = (e) =>
  (document.getElementById("agName").textContent = e.target.value);
function hbars(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  if (!rows.length) {
    el.innerHTML = '<div class="note">No data yet.</div>';
    return;
  }
  const max = Math.max(...rows.map((r) => r.v));
  rows.forEach((r) => {
    const d = document.createElement("div");
    d.className = "hbar-row";
    d.innerHTML =
      '<span class="name">' +
      r.n +
      '</span><div class="track"><span data-style-width="' +
      Math.max(12, (r.v / max) * 100) +
      '%">' +
      r.v +
      "</span></div>";
    el.appendChild(d);
  });
}
function sparkline(id, vals, max) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  vals.forEach((v) => {
    const c = document.createElement("div");
    c.className = "col";
    c.style.height = Math.max(4, (v / max) * 100) + "%";
    el.appendChild(c);
  });
}
