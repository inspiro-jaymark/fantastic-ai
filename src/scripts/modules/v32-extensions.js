/* FANTASTIC TOOL v3.3 feature module — QA form + KB edit/history + Insights gap + FeeBe URL fetch */
(function () {
  "use strict";
  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return (s == null ? "" : "" + s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
  function A() {
    try {
      return logAudit;
    } catch (e) {
      return function () {};
    }
  }
  function me() {
    return typeof currentUser === "object" && currentUser
      ? currentUser.user
      : "system";
  }
  function INT() {
    try {
      return loadInteractions();
    } catch (e) {
      return read("ft_interactions", []);
    }
  }
  function saveINT(a) {
    try {
      saveInteractionsArr(a);
    } catch (e) {
      store("ft_interactions", a);
    }
  }
  function heat(v) {
    return v >= 85 ? "#16a34a" : v >= 70 ? "#f59e0b" : "#dc2626";
  }
  function txtOf(rec) {
    return (rec.transcript || []).map((m) => m.text || "").join("  ");
  }
  (function css() {
    if ($("ftV32css")) return;
    const s = document.createElement("style");
    s.id = "ftV32css";
    s.textContent =
      ".qarow{display:grid;grid-template-columns:1.5fr 2.3fr 66px 54px 38px;gap:8px;align-items:center;margin-bottom:8px}@media(max-width:760px){.qarow{grid-template-columns:1fr 1fr}}.qarow input,.qarow select{width:100%}.recx{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--line)}.recx:last-child{border-bottom:none}.recx .ic2{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;color:#fff;font-size:15px}.recx b{font-size:13.5px}.recx p{font-size:12.5px;color:var(--slate);margin-top:2px}";
    document.head.appendChild(s);
  })();

  /* ===== 1) CUSTOMIZABLE QA FORM ===== */
  const QA_DEFAULT = [
    {
      id: "greet",
      label: "Branded Greeting",
      weight: 10,
      critical: false,
      rx: "hello|hi|good|welcome|thank you for calling|salamat|magandang|kumusta|maayong|naimbag|maupay",
    },
    {
      id: "empathy",
      label: "Empathy & Apology",
      weight: 15,
      critical: false,
      rx: "sorry|apolog|understand|pasensya|pasaylo|nasabtan|dispensar|maawatak|nabatyagan",
    },
    {
      id: "verify",
      label: "Identity Verification",
      weight: 20,
      critical: true,
      rx: "verify|otp|account number|i-verify|verificar",
    },
    {
      id: "resolve",
      label: "Resolution Provided",
      weight: 25,
      critical: true,
      rx: "i'll|let me|i can|process|file|resolve|fix|refund|credit|gagawin|ayusin|tabang|bulig",
    },
    {
      id: "compliance",
      label: "No sensitive data over voice (PCI)",
      weight: 20,
      critical: true,
      rx: "__NEG__cvv|full card number|card number|otp is|password is|security code",
    },
    {
      id: "close",
      label: "Proper Closing",
      weight: 10,
      critical: false,
      rx: "anything else|glad to help|thank you for calling|may iba pa|paalam|salamat po|babay|agyaman",
    },
  ];
  function loadQAForm() {
    const f = read("ft_qaform", null);
    if (f && f.length) return f;
    store("ft_qaform", QA_DEFAULT);
    return QA_DEFAULT.map((x) => ({ ...x }));
  }
  function saveQAForm(a) {
    store("ft_qaform", a);
  }
  window.loadQAForm = loadQAForm;
  function qaScore(text) {
    text = (text || "").toLowerCase();
    const form = loadQAForm();
    let earned = 0,
      total = 0;
    const rows = [];
    form.forEach((c) => {
      total += +c.weight || 0;
      let ok;
      if ((c.rx || "").indexOf("__NEG__") === 0) {
        let re;
        try {
          re = new RegExp(c.rx.slice(7), "i");
        } catch (e) {
          re = /.^/;
        }
        ok = !re.test(text);
      } else {
        let re;
        try {
          re = new RegExp(c.rx || ".^", "i");
        } catch (e) {
          re = /.^/;
        }
        ok = re.test(text);
      }
      if (ok) earned += +c.weight || 0;
      rows.push({
        id: c.id,
        label: c.label,
        weight: +c.weight || 0,
        ok,
        critical: !!c.critical,
      });
    });
    return { pct: total ? Math.round((earned / total) * 100) : 0, rows };
  }
  window.qaScore = qaScore;
  if (typeof evalConvoText === "function") {
    window.evalConvoText = function (raw) {
      return qaScore(raw).pct;
    };
  }
  if (typeof batchProcess === "function") {
    const _bp = batchProcess;
    window.batchProcess = function (o) {
      const rec = _bp(o);
      try {
        const q = qaScore(txtOf(rec));
        rec.gapPct = q.pct;
        rec.qaRows = q.rows;
        rec.resolved = q.pct >= 70;
        const ia = INT();
        const i = ia.findIndex((x) => x.id === rec.id);
        if (i >= 0) {
          ia[i].gapPct = q.pct;
          ia[i].qaRows = q.rows;
          ia[i].resolved = rec.resolved;
          saveINT(ia);
        }
        const ba = read("ft_batch", []);
        const j = ba.findIndex((x) => x.id === rec.id);
        if (j >= 0) {
          ba[j].gapPct = q.pct;
          ba[j].qaRows = q.rows;
          ba[j].resolved = rec.resolved;
          store("ft_batch", ba);
        }
      } catch (e) {
        console.warn("qa batch", e);
      }
      return rec;
    };
  }
  if (typeof acEvalTranscript === "function") {
    window.acEvalTranscript = function () {
      const raw = ($("acTaInput") || {}).value || "";
      if (!raw.trim()) {
        alert("Paste a transcript first.");
        return 0;
      }
      const q = qaScore(raw);
      const box = $("acEvalResult");
      if (box)
        box.innerHTML =
          '<div class="u-score-large" data-style-color="' +
          heat(q.pct) +
          '">' +
          q.pct +
          '<span class="u-fs-15">/100</span></div>' +
          q.rows
            .map(
              (r) =>
                '<div class="check-item ' +
                (r.ok ? "pass" : "fail") +
                '"><div class="cx">' +
                (r.ok ? "✓" : "✕") +
                "</div><div>" +
                esc(r.label) +
                (r.critical
                  ? ' <span class="tag r u-m-0">critical</span>'
                  : "") +
                '</div><span class="u-right-strong">' +
                (r.ok ? r.weight : 0) +
                "/" +
                r.weight +
                "</span></div>",
            )
            .join("");
      window._acLastQA = q;
      return q.pct;
    };
  }
  function injectQAFormUI() {
    const set = $("settings");
    if (!set || $("qaFormCard")) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "qaFormCard";
    card.style.marginTop = "20px";
    card.innerHTML =
      '<h3><span class="ic">📋</span> Customizable QA Form <span class="note u-m-0">— scores Batch Upload &amp; Live Agent Convo</span></h3><div class="note u-mb-8">Each criterion: <b>label</b>, <b>keywords</b> (regex; <span class="mono">|</span> = OR; prefix <span class="mono">__NEG__</span> = "must NOT contain"), <b>weight</b>, <b>critical</b>. Total weight auto-normalizes to 100%.</div><div id="qaFormRows"></div><div class="row u-mt-10"><button class="btn ghost" onclick="qaAddRow()">➕ Add criterion</button><button class="btn" onclick="qaSaveForm()">💾 Save form</button><button class="btn ghost" onclick="qaResetForm()">↺ Reset default</button><button class="btn ghost" onclick="qaExportForm()">⬇️ Export</button><label class="btn ghost u-cursor-pointer">⬆️ Import<input class="hidden" type="file" id="qaImp" accept=".json" onchange="qaImportForm(event)"></label><span class="note u-m-0" id="qaFormMsg"></span></div>';
    set.insertBefore(card, set.children[1] || null);
    renderQAFormRows();
  }
  function renderQAFormRows() {
    const wrap = $("qaFormRows");
    if (!wrap) return;
    const form = loadQAForm();
    wrap.innerHTML =
      '<div class="qarow"><b class="u-fs-11 u-color-muted">LABEL</b><b class="u-fs-11 u-color-muted">KEYWORDS / REGEX</b><b class="u-fs-11 u-color-muted">WEIGHT</b><b class="u-fs-11 u-color-muted">CRIT</b><b></b></div>' +
      form
        .map(
          (c, i) =>
	            '<div class="qarow"><input class="inp qf-l" aria-label="Criterion label" data-i="' +
            i +
            '" value="' +
            esc(c.label) +
	            '"><input class="inp qf-r" aria-label="Criterion keywords or regex" data-i="' +
            i +
            '" value="' +
            esc(c.rx) +
	            '"><input class="inp qf-w" aria-label="Criterion weight" type="number" min="0" max="100" data-i="' +
            i +
            '" value="' +
            (+c.weight || 0) +
	            '"><label class="switch u-m-auto"><input type="checkbox" class="qf-c" aria-label="Critical criterion" data-i="' +
            i +
            '" ' +
            (c.critical ? "checked" : "") +
            '><span class="slider"></span></label><button class="btn ghost u-btn-icon-pad" onclick="qaDelRow(' +
            i +
            ')">🗑</button></div>',
        )
        .join("");
  }
  function collectForm() {
    const form = [];
    [...document.querySelectorAll(".qf-l")].forEach((el) => {
      const i = el.dataset.i;
      const label = el.value.trim();
      if (!label) return;
      form.push({
        id: "c" + i + Date.now().toString(36).slice(-3),
        label,
        rx:
          (document.querySelector('.qf-r[data-i="' + i + '"]') || {}).value ||
          "",
        weight: +(
          (document.querySelector('.qf-w[data-i="' + i + '"]') || {}).value || 0
        ),
        critical: (document.querySelector('.qf-c[data-i="' + i + '"]') || {})
          .checked,
      });
    });
    return form;
  }
  window.qaAddRow = function () {
    const f = collectForm();
    f.push({
      id: "c" + Date.now(),
      label: "New criterion",
      rx: "keyword1|keyword2",
      weight: 10,
      critical: false,
    });
    saveQAForm(f);
    renderQAFormRows();
  };
  window.qaDelRow = function (i) {
    appConfirm(
      {
        title: "Delete QA criterion?",
        message: "Delete this QA criterion? This cannot be undone.",
        confirmText: "Delete",
        danger: true,
      },
      () => {
        const f = collectForm();
        f.splice(i, 1);
        saveQAForm(f);
        renderQAFormRows();
      },
    );
  };
  window.qaSaveForm = function () {
    const f = collectForm();
    const m = $("qaFormMsg");
    if (!f.length) {
      m.style.color = "var(--red)";
      m.textContent = "⚠️ Add at least one criterion.";
      return;
    }
    saveQAForm(f);
    m.style.color = "var(--green)";
    m.textContent =
      "✅ Saved " +
      f.length +
      " criteria (total weight " +
      f.reduce((a, c) => a + (+c.weight || 0), 0) +
      ").";
    A()("QA form saved", f.length + " criteria", "config");
    setTimeout(() => (m.textContent = ""), 3500);
  };
  window.qaResetForm = function () {
    appConfirm(
      {
        title: "Reset QA form?",
        message: "Reset the QA form to defaults? Current criteria will be replaced.",
        confirmText: "Reset",
        danger: true,
      },
      () => {
        store("ft_qaform", QA_DEFAULT);
        renderQAFormRows();
        A()("QA form reset", "defaults", "config");
      },
    );
  };
  window.qaExportForm = function () {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(loadQAForm(), null, 2)], {
        type: "application/json",
      }),
    );
    a.download = "FANTASTIC_qa_form.json";
    a.click();
  };
  window.qaImportForm = function (ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const arr = JSON.parse(r.result);
        if (Array.isArray(arr) && arr.length) {
          saveQAForm(
            arr.map((x) => ({
              id: x.id || "c" + Math.random().toString(36).slice(2),
              label: x.label || "Criterion",
              rx: x.rx || "",
              weight: +x.weight || 10,
              critical: !!x.critical,
            })),
          );
          renderQAFormRows();
          alert("✅ Imported " + arr.length + " criteria.");
          A()("QA form imported", arr.length + " criteria", "config");
        }
      } catch (e) {
        alert("Invalid JSON.");
      }
    };
    r.readAsText(f);
    ev.target.value = "";
  };

  /* ===== 2) KB EDIT / DELETE + HISTORY ===== */
  function kbHist() {
    return read("ft_kb_history", []);
  }
  function kbHistAdd(action, title, detail) {
    const h = kbHist();
    h.unshift({
      ts: new Date().toISOString(),
      by: me(),
      action,
      title: title || "",
      detail: detail || "",
    });
    store("ft_kb_history", h.slice(0, 1000));
    try {
      A()(
        "KB " + action,
        (title || "") + (detail ? " — " + detail : ""),
        "data",
      );
    } catch (e) {}
    renderKBHistory();
  }
  window.kbEditModule = function (i) {
    let arr;
    try {
      arr = KB_CUSTOM;
    } catch (e) {
      arr = read("ft_kb", []);
    }
    const it = arr[i];
    if (!it) return;
    const before = JSON.stringify({ q: it.q, a: it.a });
    const q = prompt("Edit title:", it.q);
    if (q === null) return;
    const a = prompt("Edit answer:", it.a);
    if (a === null) return;
    const k = prompt(
      "Edit keywords (comma-separated):",
      (it.k || []).join(", "),
    );
    const link = prompt("Edit reference link:", it.link || "");
    it.q = q.trim() || it.q;
    it.a = a.trim() || it.a;
    it.k = (k || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    it.link = (link || "").trim();
    try {
      KB_CUSTOM = arr;
      saveCustomKB(KB_CUSTOM);
    } catch (e) {
      store("ft_kb", arr);
    }
    kbHistAdd("edited", it.q, "was: " + before.slice(0, 140));
    try {
      renderKB(($("kbSearch") || {}).value || "");
    } catch (e) {}
  };
  window.kbDeleteModule = function (i) {
    let arr;
    try {
      arr = KB_CUSTOM;
    } catch (e) {
      arr = read("ft_kb", []);
    }
    const it = arr[i];
    if (!it) return;
    appConfirm(
      {
        title: "Delete KB module?",
        message: 'Delete KB module "' + it.q + '"? This cannot be undone.',
        confirmText: "Delete",
        danger: true,
      },
      () => {
        arr.splice(i, 1);
        try {
          KB_CUSTOM = arr;
          saveCustomKB(KB_CUSTOM);
        } catch (e) {
          store("ft_kb", arr);
        }
        kbHistAdd("deleted", it.q, "");
        try {
          renderKB(($("kbSearch") || {}).value || "");
        } catch (e) {}
      },
    );
  };
  if (typeof renderKB === "function") {
    const _rk = renderKB;
    window.renderKB = function (f) {
      _rk(f);
      try {
        rebuildCustomKBList();
      } catch (e) {}
    };
  }
  function rebuildCustomKBList() {
    const kbSec = $("kb");
    if (!kbSec) return;
    let host = $("kbCustomMgr");
    if (!host) {
      host = document.createElement("div");
      host.id = "kbCustomMgr";
      host.className = "card";
      host.style.marginTop = "16px";
      const c = kbSec.querySelector(".card");
      if (c) c.appendChild(host);
      else return;
    }
    const arr = (function () {
      try {
        return KB_CUSTOM;
      } catch (e) {
        return read("ft_kb", []);
      }
    })();
    host.innerHTML =
      '<h3><span class="ic">✏️</span> Manage Trainer Modules (edit / delete) <span class="badge">' +
      arr.length +
      "</span></h3>" +
      (arr.length
        ? arr
            .map(
              (it, i) =>
                '<div class="sum-line"><div><b>' +
                esc(it.q) +
                '</b> <span class="note u-m-0">' +
                esc(it.cat || "") +
                '</span></div><span><button class="btn ghost u-btn-small" onclick="kbEditModule(' +
                i +
                ')">✏️ Edit</button> <button class="btn ghost u-btn-small u-color-red" onclick="kbDeleteModule(' +
                i +
                ')">🗑 Delete</button></span></div>',
            )
            .join("")
        : '<div class="note">No trainer modules yet. Add one above.</div>') +
      '<div class="u-mt-14"><div class="folder-head u-mb-8"><h3 class="u-m-0 u-fs-14"><span class="ic">🕘</span> KB History Log</h3><div class="row"><button class="btn ghost u-btn-small" onclick="kbExportHistory()">⬇️ Export</button><button class="btn ghost u-btn-small u-color-red" onclick="kbClearHistory()">🗑 Clear</button></div></div><div id="kbHistList"></div></div>';
    renderKBHistory();
  }
  function renderKBHistory() {
    const el = $("kbHistList");
    if (!el) return;
    const h = kbHist();
    el.innerHTML = h.length
      ? '<div class="u-overflow-x-auto"><table><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Detail</th></tr>' +
        h
          .slice(0, 200)
          .map(
            (x) =>
              "<tr><td>" +
              new Date(x.ts).toLocaleString() +
              "</td><td>" +
              esc(x.by) +
              '</td><td><span class="tag u-m-0 ' + (x.action === "deleted"
                ? "r"
                : x.action === "edited"
                  ? "y"
                  : "") +
              '">' +
              x.action +
              "</span></td><td>" +
              esc(x.title) +
              "</td><td>" +
              esc(x.detail) +
              "</td></tr>",
          )
          .join("") +
        "</table></div>"
      : '<div class="note">No history yet.</div>';
  }
  window.renderKBHistory = renderKBHistory;
  window.kbExportHistory = function () {
    const h = kbHist();
    let out = "Timestamp,User,Action,Module,Detail\n";
    h.forEach(
      (x) =>
        (out +=
          [x.ts, x.by, x.action, x.title, x.detail]
            .map((s) => {
              s = s == null ? "" : "" + s;
              return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            })
            .join(",") + "\n"),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = "FANTASTIC_kb_history.csv";
    a.click();
  };
  window.kbClearHistory = function () {
    appConfirm(
      {
        title: "Clear KB history?",
        message: "Clear the KB history log? This cannot be undone.",
        confirmText: "Clear",
        danger: true,
      },
      () => {
        store("ft_kb_history", []);
        renderKBHistory();
      },
    );
  };
  if (typeof addModule === "function") {
    const _am = addModule;
    window.addModule = function () {
      const b = (function () {
        try {
          return KB_CUSTOM.length;
        } catch (e) {
          return 0;
        }
      })();
      _am();
      const a = (function () {
        try {
          return KB_CUSTOM.length;
        } catch (e) {
          return 0;
        }
      })();
      if (a > b) {
        const it = (function () {
          try {
            return KB_CUSTOM[KB_CUSTOM.length - 1];
          } catch (e) {
            return null;
          }
        })();
        kbHistAdd("added", it ? it.q : "(module)", "");
      }
      rebuildCustomKBList();
    };
  }

  /* ===== 3) INSIGHTS → GAP ANALYSIS (custom QA form) ===== */
  function injectInsightsGap() {
    const sec = $("insights");
    if (!sec || $("inQAGapCard")) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "inQAGapCard";
    card.style.marginTop = "20px";
    card.innerHTML =
      '<div class="folder-head"><h3 class="u-m-0"><span class="ic">🧩</span> Gap Analysis (Custom QA Form)</h3><span class="note u-m-0" id="inGapNote"></span></div><div id="inQAGap"></div><div class="u-mt-10" id="inGapRecs"></div>';
    const kpi = $("inKpis");
    if (kpi && kpi.parentNode)
      kpi.parentNode.insertBefore(card, kpi.nextSibling);
    else sec.appendChild(card);
  }
  function renderInsightsGap() {
    const el = $("inQAGap");
    if (!el) return;
    let ia = INT();
    const site = ($("inSite") || {}).value;
    if (site && site !== "all") ia = ia.filter((r) => r.site === site);
    const form = loadQAForm();
    const tot = ia.length || 1;
    const pass = {};
    form.forEach((c) => (pass[c.id] = 0));
    ia.forEach((r) => {
      qaScore(txtOf(r)).rows.forEach((row) => {
        if (row.ok) pass[row.id] = (pass[row.id] || 0) + 1;
      });
    });
    const rows = form
      .map((c) => ({
        label: c.label,
        critical: c.critical,
        pct: Math.round(((pass[c.id] || 0) / tot) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);
    $("inGapNote").textContent =
      ia.length + " interactions · " + form.length + " criteria";
    el.innerHTML =
      rows
        .map(
          (r) =>
            '<div class="hbar-row"><span class="name">' +
            esc(r.label) +
            (r.critical ? " 🔴" : "") +
            '</span><div class="track"><span data-style-width="' +
            Math.max(10, r.pct) +
            '%" data-style-background="' +
            heat(r.pct) +
            '">' +
            r.pct +
            "%</span></div></div>",
        )
        .join("") || '<div class="note">No data yet.</div>';
    const gaps = rows.filter((r) => r.pct < 75);
    $("inGapRecs").innerHTML = gaps.length
      ? '<div class="note u-mb-6"><b>Priority fixes:</b></div>' +
        gaps
          .slice(0, 4)
          .map((g) => {
            const sev =
              g.pct < 50 || g.critical
                ? "critical"
                : g.pct < 65
                  ? "high"
                  : "med";
            const ic = {
              critical: ["🚨", "var(--red)"],
              high: ["⚠️", "#ea580c"],
              med: ["💡", "var(--amber)"],
            }[sev];
            return (
              '<div class="recx"><div class="ic2" data-style-background="' +
              ic[1] +
              '">' +
              ic[0] +
              "</div><div><b>" +
              esc(g.label) +
              " — " +
              g.pct +
              "% compliance" +
              (g.critical ? " (critical)" : "") +
              "</b><p>Coach this criterion, weight it in the scorecard, and enroll low performers to the matching topic.</p></div></div>"
            );
          })
          .join("")
      : '<div class="note">🎉 All criteria ≥75% compliance.</div>';
  }
  window.renderInsightsGap = renderInsightsGap;
  if (typeof renderInsights === "function") {
    const _ri = renderInsights;
    window.renderInsights = function () {
      _ri();
      try {
        injectInsightsGap();
        renderInsightsGap();
      } catch (e) {
        console.warn("insights gap", e);
      }
    };
  }

  /* ===== 4) FeeBe fetches public URLs on demand ===== */
  function feebeSay(who, html) {
    const body = $("kbbotBody");
    if (!body) return null;
    const m = document.createElement("div");
    m.className = "msg " + (who === "bot" ? "ai" : "cust");
    m.style.maxWidth = "92%";
    m.innerHTML =
      '<div class="who">' +
      (who === "bot" ? "🤖 FeeBe" : "You") +
      '</div><span class="txt">' +
      html +
      "</span>";
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }
  async function feebeFetchURL(url) {
    try {
      let txt;
      try {
        const r = await fetch(url);
        txt = await r.text();
      } catch (e) {
        const r = await fetch("https://r.jina.ai/" + url);
        txt = await r.text();
      }
      return txt
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch (e) {
      return null;
    }
  }
  if (typeof botAnswer === "function") {
    const _ba = botAnswer;
    window.botAnswer = async function (q) {
      const um = (q || "").match(/https?:\/\/[^\s]+/);
      if (um) {
        const url = um[0];
        feebeSay("user", esc(q));
        const el = feebeSay(
          "bot",
          "🌐 Fetching <b>" + esc(url) + '</b> … <span class="spin"></span>',
        );
        const text = await feebeFetchURL(url);
        if (!text) {
          if (el)
            el.querySelector(".txt").innerHTML =
              "❌ Couldn\u2019t fetch that URL (the site may block cross-origin requests). Open it and paste the text into a KB module instead.";
          return;
        }
        try {
          const arr = read("ft_kb_assets", []);
          arr.unshift({
            id: "WEB" + Date.now(),
            name: url,
            type: "website",
            kind: "web",
            url,
            content: text.slice(0, 20000),
            added: new Date().toISOString(),
            by: me(),
          });
          store("ft_kb_assets", arr);
          if (typeof renderKBAssets === "function") renderKBAssets();
        } catch (e) {}
        const q2 = q.replace(url, "").trim() || "Summarize the key points.";
        let ans = null,
          useClaude = false;
        try {
          useClaude =
            aiCfg.provider === "claude" &&
            aiCfg.claudeKey &&
            typeof callClaude === "function";
        } catch (e) {}
        if (useClaude) {
          try {
            ans = await callClaude(
              "Source page content:\n" +
                text.slice(0, 8000) +
                "\n\nQuestion: " +
                q2,
              "You are FeeBe. Answer ONLY from the page content. Concise; reply in the user\u2019s language.",
            );
          } catch (e) {
            ans = null;
          }
        }
        if (!ans)
          ans =
            "Fetched ~" +
            text.length +
            " chars. Top excerpt:\n\n" +
            text.slice(0, 600) +
            "…\n\n(Saved to the Knowledge Base as a web source — ask me follow-ups.)";
        if (el)
          el.querySelector(".txt").innerHTML =
            esc(ans).replace(/\n/g, "<br>") +
            '<div class="note u-mt-6">🌐 fetched live &amp; saved to KB' +
            (useClaude
              ? ' · <span class="ai-badge claude">Claude</span>'
              : "") +
            "</div>";
        try {
          A()("FeeBe URL fetch", url.slice(0, 80), "data");
        } catch (e) {}
        return;
      }
      return _ba(q);
    };
  }
  window.botSend = function () {
    const inp = $("kbbotInput");
    if (!inp) return;
    const q = (inp.value || "").trim();
    if (!q) return;
    inp.value = "";
    window.botAnswer(q);
  };

  /* lifecycle */
  if (typeof showView === "function") {
    const _sv = showView;
    window.showView = function (id) {
      _sv(id);
      try {
        if (id === "settings") injectQAFormUI();
        if (id === "kb") rebuildCustomKBList();
        if (id === "insights") {
          injectInsightsGap();
          renderInsightsGap();
        }
      } catch (e) {
        console.warn("v32 view", e);
      }
    };
  }
  setTimeout(() => {
    try {
      if ($("settings")) injectQAFormUI();
      if ($("kb")) rebuildCustomKBList();
    } catch (e) {}
  }, 600);
  console.log(
    "✅ v3.3 module baked: custom QA form + KB edit/history + insights gap + FeeBe URL fetch.",
  );
})();
