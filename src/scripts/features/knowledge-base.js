const KB_DEFAULT = [
  {
    cat: "Billing & Payments",
    q: "How do I check or pay my bill?",
    a: "View and pay your bill anytime in the app or web portal under 'My Account > Billing'. We accept cards, GCash, Maya, and over-the-counter. Want me to email your latest Statement of Account?",
    k: [
      "bill",
      "billing",
      "pay",
      "payment",
      "statement",
      "magkano",
      "bayad",
      "gcash",
      "bayran",
    ],
    link: "https://www.gcash.com/",
  },
  {
    cat: "Billing & Payments",
    q: "Why is my bill higher than usual?",
    a: "A higher bill is usually out-of-plan usage, one-time charges, or a prorated plan change. Let me itemize your charges and, if there's an error, file a dispute.",
    k: ["higher", "expensive", "overcharge", "mataas", "sobra", "mahal"],
    link: "",
  },
  {
    cat: "Technical Support",
    q: "There is a service outage / no signal.",
    a: "I'm sorry for the trouble. Maintenance is ongoing with restoration within a few hours. I'll register your line for a proactive SMS once service is back.",
    k: [
      "outage",
      "down",
      "no signal",
      "walang signal",
      "internet",
      "slow",
      "offline",
      "wala",
      "hinay",
    ],
    link: "https://downdetector.ph/",
  },
  {
    cat: "Technical Support",
    q: "My internet is slow.",
    a: "Let's try: power-cycle your modem 30s, run a speed test, and move closer to the router. If still slow, I'll run a diagnostic and dispatch a technician.",
    k: ["slow", "lag", "speed", "mabagal", "wifi", "router", "hinay"],
    link: "https://www.speedtest.net/",
  },
  {
    cat: "Account & Security",
    q: "How do I reset my password?",
    a: "Tap 'Forgot Password' and we'll send a one-time PIN to your registered number. Never share your OTP with anyone.",
    k: ["password", "reset", "login", "forgot", "otp"],
    link: "",
  },
  {
    cat: "Plans & Upgrades",
    q: "I want to upgrade my plan.",
    a: "Great choice! A higher-tier bundle gives more data for a small difference, effective next cycle. Want me to compare two options?",
    k: ["upgrade", "plan", "promo", "bundle", "data"],
    link: "",
  },
  {
    cat: "Refunds & Disputes",
    q: "How do I request a refund?",
    a: "Verified overcharges are refunded within 7-10 business days. Let me pull up the transaction, confirm the error, and file the refund with a reference number.",
    k: ["refund", "overcharge", "money back", "sobra", "ibalik"],
    link: "",
  },
  {
    cat: "General / Policy",
    q: "How is my data protected?",
    a: "Your data is protected under the Data Privacy Act of 2012 (RA 10173). We collect only what's necessary and never sell it.",
    k: ["privacy", "data", "ra 10173", "protect"],
    link: "https://www.privacy.gov.ph/data-privacy-act/",
  },
];
function loadCustomKB() {
  return read("ft_kb", []);
}
function saveCustomKB(a) {
  store("ft_kb", a);
}
let KB_CUSTOM = loadCustomKB();
function getKB() {
  return KB_DEFAULT.concat(KB_CUSTOM);
}
function loadKBAssets() {
  return read("ft_kb_assets", []);
}
function saveKBAssets(a) {
  store("ft_kb_assets", a);
}
function renderKB(f = "") {
  const list = document.getElementById("kbList");
  if (!list) return;
  list.innerHTML = "";
  const all = getKB().map((i, idx) => ({
    ...i,
    _idx: idx,
    _custom: idx >= KB_DEFAULT.length,
  }));
  const filtered = all.filter((i) =>
    (i.q + i.a + (i.k || []).join() + (i.cat || ""))
      .toLowerCase()
      .includes(f.toLowerCase()),
  );
  document.getElementById("kbCount").textContent =
    getKB().length + loadKBAssets().length + " items";
  [...new Set(filtered.map((i) => i.cat))].forEach((cat) => {
    const h = document.createElement("div");
    h.className = "kb-cat";
    h.textContent = cat;
    list.appendChild(h);
    filtered
      .filter((i) => i.cat === cat)
      .forEach((i) => {
        const d = document.createElement("details");
        d.className = "kb-item";
        const link = i.link
          ? '<a class="kb-link" href="' +
            i.link +
            '" target="_blank">🔗 Reference</a>'
          : "";
        const custom = i._custom
          ? '<span class="kb-custom">Trainer</span>'
          : "";
        const del = i._custom
          ? '<span class="kb-del" onclick="deleteModule(' +
            (i._idx - KB_DEFAULT.length) +
            ')">🗑</span>'
          : "";
        d.innerHTML =
          "<summary>" +
          i.q +
          " " +
          custom +
          "</summary><p>" +
          i.a +
          '</p><div class="kb-meta">' +
          link +
          (i.k || [])
            .slice(0, 6)
            .map((k) => '<span class="kb-key">' + k + "</span>")
            .join("") +
          del +
          "</div>";
        list.appendChild(d);
      });
  });
  if (!filtered.length)
    list.innerHTML =
      '<div class="note" style="text-align:center;margin:20px">No matching articles.</div>';
  renderKBAssets();
}
function addModule() {
  const q = document.getElementById("tTitle").value.trim(),
    a = document.getElementById("tBody").value.trim(),
    cat = document.getElementById("tCat").value,
    k = document
      .getElementById("tKeys")
      .value.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    link = document.getElementById("tLink").value.trim(),
    msg = document.getElementById("tMsg");
  if (!q || !a) {
    msg.style.color = "var(--red)";
    msg.textContent = "⚠️ Title & answer required.";
    return;
  }
  if (!k.length)
    k.push(
      ...q
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5),
    );
  KB_CUSTOM.push({ cat, q, a, k, link });
  saveCustomKB(KB_CUSTOM);
  ["tTitle", "tBody", "tKeys", "tLink"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  msg.style.color = "var(--green)";
  msg.textContent = "✅ Added.";
  renderKB(document.getElementById("kbSearch").value);
  setTimeout(() => (msg.textContent = ""), 3000);
}
function deleteModule(i) {
  if (!confirm("Delete?")) return;
  KB_CUSTOM.splice(i, 1);
  saveCustomKB(KB_CUSTOM);
  renderKB();
}
function exportKB() {
  dl(
    JSON.stringify({ modules: KB_CUSTOM, assets: loadKBAssets() }, null, 2),
    "FANTASTIC_KB.json",
    "application/json",
  );
}
function kbUpload(ev) {
  const files = [...ev.target.files];
  const msg = document.getElementById("ftKBMsg");
  const arr = loadKBAssets();
  let done = 0;
  if (!files.length) return;
  files.forEach((f) => {
    const isText =
      /\.(txt|csv|md|json|html?|log)$/i.test(f.name) ||
      /text|json|csv/.test(f.type);
    const fin = (content) => {
      arr.unshift({
        id: "DOC" + Date.now() + Math.floor(Math.random() * 999),
        name: f.name,
        type: f.type || "file",
        size: f.size,
        kind: isText ? "text" : "binary",
        content: content || "",
        added: new Date().toISOString(),
        by: currentUser ? currentUser.user : "",
      });
      done++;
      if (done === files.length) {
        saveKBAssets(arr);
        renderKBAssets();
        msg.className = "conn ok";
        msg.textContent = "✅ Added " + files.length + " file(s).";
        logAudit(
          "KB files added",
          files
            .map((x) => x.name)
            .join(", ")
            .slice(0, 120),
          "data",
        );
        renderKB((document.getElementById("kbSearch") || {}).value || "");
      }
    };
    if (isText) {
      const r = new FileReader();
      r.onload = () => fin(("" + r.result).slice(0, 20000));
      r.readAsText(f);
    } else fin("");
  });
  ev.target.value = "";
}
window.kbUpload = kbUpload;
async function kbFetch() {
  const url = (document.getElementById("ftKBUrl").value || "").trim();
  const msg = document.getElementById("ftKBMsg");
  if (!/^https?:\/\//i.test(url)) {
    msg.className = "conn err";
    msg.textContent = "⚠️ Enter a full URL (https://…).";
    return;
  }
  msg.className = "conn wait";
  msg.textContent = "⏳ Fetching " + url + " …";
  try {
    let txt;
    try {
      const res = await fetch(url);
      txt = await res.text();
    } catch (e) {
      const res = await fetch("https://r.jina.ai/" + url);
      txt = await res.text();
    }
    const plain = txt
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000);
    const arr = loadKBAssets();
    arr.unshift({
      id: "WEB" + Date.now(),
      name: url,
      type: "website",
      kind: "web",
      url,
      content: plain,
      added: new Date().toISOString(),
      by: currentUser ? currentUser.user : "",
    });
    saveKBAssets(arr);
    renderKBAssets();
    msg.className = "conn ok";
    msg.textContent = "✅ Imported ~" + plain.length + " chars from the site.";
    document.getElementById("ftKBUrl").value = "";
    logAudit("KB website connected", url, "data");
  } catch (e) {
    msg.className = "conn err";
    msg.textContent =
      "❌ Site blocks CORS. Copy the text and add it as a KB module.";
  }
}
window.kbFetch = kbFetch;
function renderKBAssets() {
  const el = document.getElementById("ftKBAssets");
  if (!el) return;
  const a = loadKBAssets();
  if (!a.length) {
    el.innerHTML = '<div class="note">No documents or web sources yet.</div>';
    return;
  }
  el.innerHTML =
    '<div class="note" style="margin-bottom:6px"><b>' +
    a.length +
    "</b> source(s) — searchable by the AI &amp; FeeBe bot:</div>" +
    a
      .slice(0, 40)
      .map((x) => {
        const ic =
          x.kind === "web"
            ? "🌐"
            : /pdf/i.test(x.type)
              ? "📕"
              : /word|doc/i.test(x.type)
                ? "📘"
                : /sheet|excel|csv/i.test(x.type)
                  ? "📗"
                  : /image|png|jpg/i.test(x.type)
                    ? "🖼️"
                    : "📄";
        return (
          '<div class="lib-card" style="margin-bottom:8px"><div class="lib-head"><div><b>' +
          ic +
          " " +
          esc(x.name).slice(0, 70) +
          '</b><div class="lib-meta"><span>' +
          (x.kind === "web" ? "website" : x.type || "file") +
          "</span>" +
          (x.content
            ? "<span>" + x.content.length + " chars</span>"
            : "<span>stored</span>") +
          '</div></div><div class="lib-actions">' +
          (x.content
            ? "<button onclick=\"kbAssetView('" + x.id + "')\">👁</button>"
            : "") +
          '<button class="del" onclick="kbAssetDel(\'' +
          x.id +
          '\')">🗑</button></div></div><div class="replay" id="kba_' +
          x.id +
          '">' +
          esc((x.content || "(no extractable text)").slice(0, 4000)) +
          "</div></div>"
        );
      })
      .join("");
}
window.kbAssetView = function (id) {
  const el = document.getElementById("kba_" + id);
  if (el) el.style.display = el.style.display === "block" ? "none" : "block";
};
window.kbAssetDel = function (id) {
  if (!confirm("Remove source?")) return;
  saveKBAssets(loadKBAssets().filter((x) => x.id !== id));
  renderKBAssets();
};
function kbMatch(text) {
  const t = (text || "").toLowerCase();
  let best = null,
    score = 0;
  getKB().forEach((i) => {
    let s = (i.k || []).reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = i;
    }
  });
  if (best && score > 0) return { best, score };
  const words = t.split(/\W+/).filter((w) => w.length > 3);
  loadKBAssets().forEach((a) => {
    if (!a.content) return;
    const c = a.content.toLowerCase();
    let s = words.reduce((n, w) => n + (c.includes(w) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      const w0 = words.find((w) => c.includes(w)) || "";
      const idx = c.indexOf(w0);
      best = {
        q: a.name,
        a: a.content.slice(Math.max(0, idx - 40), idx + 220).trim() + "…",
        k: [],
        link: a.url || "",
      };
    }
  });
  return { best, score };
}
