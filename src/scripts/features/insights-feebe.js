/* ===== INSIGHTS DASHBOARD ===== */
function inData() {
  const site = (document.getElementById("inSite") || {}).value || "all";
  let ia = loadInteractions();
  if (site !== "all") ia = ia.filter((r) => r.site === site);
  return ia;
}
function inSites() {
  const sel = document.getElementById("inSite");
  if (!sel) return;
  const sites = [
    ...new Set(
      loadInteractions()
        .map((r) => r.site)
        .filter(Boolean),
    ),
  ];
  const cur = sel.value;
  sel.innerHTML =
    '<option value="all">All sites</option>' +
    sites.map((s) => "<option>" + esc(s) + "</option>").join("");
  if (cur) sel.value = cur;
}
const IN_STOP = new Set(
  "the a an and or to of in on for is are was were be been i you he she it we they my your our their me him her them this that these those with as at by from up down out so no yes not do does did have has had will would can could should po opo na ng sa ang ako ikaw okay hello hi thank thanks please just get got very really then into about".split(
    /\s+/,
  ),
);
function inWordCloud(ia) {
  const freq = {};
  ia.forEach((r) => {
    (r.transcript || []).forEach((m) => {
      if (m.role === "agent") return;
      (m.text || "")
        .toLowerCase()
        .replace(/[^a-z0-9ñ'\s-]/g, " ")
        .split(/\s+/)
        .forEach((w) => {
          w = w.replace(/^['-]+|['-]+$/g, "");
          if (w.length < 3 || IN_STOP.has(w) || /^\d+$/.test(w)) return;
          freq[w] = (freq[w] || 0) + 1;
        });
    });
  });
  const arr = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 45);
  const el = document.getElementById("inWordCloud");
  if (!el) return;
  if (!arr.length) {
    el.innerHTML =
      '<div class="note">No customer text yet — run or upload interactions.</div>';
    document.getElementById("inWCnote").textContent = "";
    return;
  }
  const max = arr[0][1],
    min = arr[arr.length - 1][1];
  const pal = [
    "#0e7c7b",
    "#a4248f",
    "#2563eb",
    "#ea580c",
    "#16a34a",
    "#7c3aed",
    "#0a5c5b",
  ];
  el.innerHTML = arr
    .map(([w, c], i) => {
      const sz = 13 + Math.round(((c - min) / (max - min || 1)) * 30);
      return (
        '<span title="' +
        c +
        ' mentions" style="font-size:' +
        sz +
        "px;font-weight:" +
        (sz > 28 ? 800 : 600) +
        ";color:" +
        pal[i % pal.length] +
        '">' +
        esc(w) +
        "</span>"
      );
    })
    .join("");
  document.getElementById("inWCnote").textContent =
    "top " + arr.length + " terms";
}
const IN_GAP = [
  {
    id: "greet",
    label: "Branded Greeting",
    re: /(hello|hi|good|welcome|thank you for calling|salamat|magandang|kumusta|maayong|naimbag|maupay)/i,
  },
  {
    id: "empathy",
    label: "Empathy & Apology",
    re: /(sorry|apolog|understand|pasensya|pasaylo|nasabtan|dispensar|maawatak|nabatyagan)/i,
  },
  {
    id: "verify",
    label: "Identity Verification",
    re: /(verify|otp|account number|i-verify)/i,
  },
  {
    id: "resolve",
    label: "Resolution",
    re: /(i'll|let me|i can|process|file|resolve|fix|refund|credit|gagawin|ayusin|tabang|bulig)/i,
  },
  { id: "compliance", label: "Compliance (no sensitive data)", re: null },
  {
    id: "close",
    label: "Proper Closing",
    re: /(anything else|glad to help|thank you for calling|may iba pa|paalam|salamat po|babay|agyaman)/i,
  },
];
function inGapAgg(ia) {
  const tot = ia.length || 1;
  const pass = {};
  IN_GAP.forEach((d) => (pass[d.id] = 0));
  ia.forEach((r) => {
    const ag = (r.transcript || [])
      .filter((m) => m.role === "agent")
      .map((m) => (m.text || "").toLowerCase())
      .join(" ");
    const all = (r.transcript || [])
      .map((m) => (m.text || "").toLowerCase())
      .join(" ");
    IN_GAP.forEach((d) => {
      let ok;
      if (d.id === "compliance")
        ok = !/(cvv|full card number|otp is|password is)/.test(all);
      else if (d.id === "empathy")
        ok = d.re.test(ag) || (r.transcript || []).some((m) => m.empathized);
      else ok = d.re.test(ag);
      if (ok) pass[d.id]++;
    });
  });
  return IN_GAP.map((d) => ({
    id: d.id,
    label: d.label,
    pct: Math.round((pass[d.id] / tot) * 100),
  }));
}
function inAgents(ia) {
  const g = {};
  ia.forEach((r) => {
    const n = r.agent || "Unknown";
    if (!g[n]) g[n] = { name: n, n: 0, sum: 0, site: r.site || "" };
    g[n].n++;
    g[n].sum += r.gapPct || 0;
  });
  return Object.values(g)
    .map((x) => ({ ...x, avg: Math.round(x.sum / x.n) }))
    .sort((a, b) => b.avg - a.avg);
}
function inRecs(ia, gaps, agents) {
  const recs = [];
  const scored = ia.filter((r) => r.gapPct != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.gapPct, 0) / scored.length)
    : 0;
  gaps
    .slice()
    .sort((a, b) => a.pct - b.pct)
    .forEach((g) => {
      if (g.pct < 75)
        recs.push({
          sev: g.pct < 50 ? "critical" : g.pct < 65 ? "high" : "med",
          t: 'Improve "' + g.label + '" (' + g.pct + "% compliance)",
          p:
            "Only " +
            g.pct +
            "% of calls show " +
            g.label.toLowerCase() +
            ". Run a focused refresher, weight it in the QA scorecard, and enroll low performers to the matching topic.",
        });
    });
  let neg = 0,
    moodS = 0,
    moodN = 0;
  ia.forEach((r) => {
    const s = r.sentiment || {};
    const t = (s.pos || 0) + (s.neu || 0) + (s.neg || 0);
    if (t) neg += (s.neg || 0) / t;
    if (r.mood != null) {
      moodS += r.mood;
      moodN++;
    }
  });
  const negShare = ia.length ? Math.round((neg / ia.length) * 100) : 0;
  if (negShare >= 25)
    recs.push({
      sev: "high",
      t: "High negative sentiment (" + negShare + "%)",
      p: "A quarter+ of interactions trend negative. Coach earlier apology + empathy and de-escalation; mine the word-cloud for root causes.",
    });
  if (moodN && Math.round(moodS / moodN) < 50)
    recs.push({
      sev: "med",
      t: "Agent mood is strained (avg " + Math.round(moodS / moodN) + "/100)",
      p: "Camera mood trends low — review schedule adherence, breaks, and workload to protect CX and reduce burnout.",
    });
  const low = agents
    .filter((a) => a.n >= 1)
    .slice(-3)
    .reverse()
    .filter((a) => a.avg < 70);
  if (low.length)
    recs.push({
      sev: "high",
      t: "Targeted coaching: " + low.map((a) => a.name).join(", "),
      p: "Below 70% avg quality. Send QA evaluations to their supervisor and recommend enrollment to the weakest topic above.",
    });
  const fraud = ia.filter((r) => (r.fraudScore || 0) > 0).length;
  if (fraud)
    recs.push({
      sev: "critical",
      t: fraud + " interaction(s) with fraud signals",
      p: "Run a PCI/RA-10173 refresher; ensure masking is on and never collect card/OTP over voice.",
    });
  if (avg >= 85 && !recs.length)
    recs.push({
      sev: "med",
      t: "Strong performance — sustain it",
      p:
        "Avg quality " +
        avg +
        "%. Capture top-performer recordings as coaching exemplars in the Knowledge Base.",
    });
  if (!recs.length)
    recs.push({
      sev: "med",
      t: "Not enough data yet",
      p: "Run or upload more interactions to unlock trend-based recommendations.",
    });
  return { recs, avg, negShare };
}
function renderInsights() {
  inSites();
  const ia = inData();
  const scored = ia.filter((r) => r.gapPct != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.gapPct, 0) / scored.length)
    : "—";
  const resolved = ia.length
    ? Math.round((ia.filter((r) => r.resolved).length / ia.length) * 100)
    : 0;
  document.getElementById("inKpis").innerHTML = [
    ["Interactions", ia.length],
    ["Avg Quality", avg + (avg === "—" ? "" : "%")],
    ["Resolved", resolved + "%"],
    ["Agents", inAgents(ia).length],
  ]
    .map(
      (k) =>
        '<div class="stat"><div class="n">' +
        k[1] +
        '</div><div class="l">' +
        k[0] +
        "</div></div>",
    )
    .join("");
  inWordCloud(ia);
  const gaps = inGapAgg(ia);
  hbars(
    "inGap",
    gaps.map((g) => ({ n: g.label, v: g.pct })),
  );
  const el = document.getElementById("inGap");
  if (el)
    [...el.querySelectorAll(".hbar-row .track>span")].forEach((sp, i) => {
      sp.style.background = heatColor(gaps[i].pct);
      sp.textContent = gaps[i].pct + "%";
    });
  const agents = inAgents(ia);
  document.getElementById("inTop").innerHTML =
    agents
      .slice(0, 5)
      .map(
        (a, i) =>
          '<div class="lb-row"><div class="lb-rank">' +
          (i + 1) +
          '</div><div class="lb-av">' +
          esc(a.name).substring(0, 2).toUpperCase() +
          '</div><div class="lb-info"><b>' +
          esc(a.name) +
          '</b><div class="sub">' +
          (a.site ? esc(a.site) + " · " : "") +
          a.n +
          ' interactions</div></div><div class="lb-pts" style="color:' +
          heatColor(a.avg) +
          '">' +
          a.avg +
          "%</div></div>",
      )
      .join("") || '<div class="note">No agents yet.</div>';
  document.getElementById("inLow").innerHTML =
    agents
      .slice()
      .reverse()
      .slice(0, 5)
      .map(
        (a) =>
          '<div class="hbar-row"><span class="name">' +
          esc(a.name) +
          '</span><div class="track"><span style="width:' +
          Math.max(10, a.avg) +
          "%;background:" +
          heatColor(a.avg) +
          '">' +
          a.avg +
          "%</span></div></div>",
      )
      .join("") || '<div class="note">No agents yet.</div>';
  let pos = 0,
    neu = 0,
    neg = 0;
  ia.forEach((r) => {
    const s = r.sentiment || {};
    pos += s.pos || 0;
    neu += s.neu || 0;
    neg += s.neg || 0;
  });
  const stt = pos + neu + neg || 1;
  document.getElementById("inSent").innerHTML =
    '<div class="senti-bar"><div class="pos" style="width:' +
    Math.round((pos / stt) * 100) +
    '%">' +
    Math.round((pos / stt) * 100) +
    '%</div><div class="neu" style="width:' +
    Math.round((neu / stt) * 100) +
    '%">' +
    Math.round((neu / stt) * 100) +
    '%</div><div class="neg" style="width:' +
    Math.round((neg / stt) * 100) +
    '%">' +
    Math.round((neg / stt) * 100) +
    '%</div></div><div class="note">Positive · Neutral · Negative across ' +
    ia.length +
    " interactions.</div>";
  const langs = {};
  ia.forEach((r) => {
    if (r.lang) langs[r.lang] = (langs[r.lang] || 0) + 1;
  });
  hbars(
    "inLang",
    Object.entries(langs)
      .map(([n, v]) => ({ n, v }))
      .sort((a, b) => b.v - a.v),
  );
  const R = inRecs(ia, gaps, agents);
  const sevIc = {
    critical: ["🚨", "var(--red)"],
    high: ["⚠️", "#ea580c"],
    med: ["💡", "var(--amber)"],
  };
  document.getElementById("inRecs").innerHTML = R.recs
    .map((r) => {
      const s = sevIc[r.sev] || sevIc.med;
      return (
        '<div class="rec"><div class="ic2" style="background:' +
        s[1] +
        '">' +
        s[0] +
        "</div><div><b>" +
        esc(r.t) +
        "</b><p>" +
        esc(r.p) +
        "</p></div></div>"
      );
    })
    .join("");
  window._inSnap = {
    count: ia.length,
    avg,
    resolved,
    gaps,
    agents,
    recs: R.recs,
  };
}
window.renderInsights = renderInsights;
function exportInsights() {
  const s = window._inSnap;
  if (!s) {
    renderInsights();
    return;
  }
  let out =
    "FANTASTIC — Insights Snapshot\n" +
    new Date().toLocaleString() +
    "\n\nInteractions: " +
    s.count +
    "\nAvg Quality: " +
    s.avg +
    "%\nResolved: " +
    s.resolved +
    "%\n\n== Aggregate Gap Analysis ==\n";
  s.gaps.forEach((g) => (out += g.label + ": " + g.pct + "%\n"));
  out += "\n== Agent Performance ==\n";
  s.agents.forEach((a) => (out += a.name + ": " + a.avg + "% (" + a.n + ")\n"));
  out += "\n== Recommendations ==\n";
  s.recs.forEach(
    (r, i) =>
      (out +=
        i + 1 + ". [" + r.sev.toUpperCase() + "] " + r.t + " — " + r.p + "\n"),
  );
  dl(out, "FANTASTIC_insights.txt", "text/plain");
  logAudit("Exported insights", "", "export");
}
window.exportInsights = exportInsights;
async function aiInsights() {
  const box = document.getElementById("inAI");
  const ia = inData();
  if (!ia.length) {
    box.innerHTML = '<div class="note">No interactions to analyze yet.</div>';
    return;
  }
  if (!(aiCfg.provider === "claude" && aiCfg.claudeKey)) {
    box.innerHTML =
      '<div class="conn err" style="display:block">⚠️ Connect Claude in Setup (paste key + Test) for deep AI insights. Rule-based recommendations are shown above.</div>';
    return;
  }
  box.innerHTML =
    '<span class="thinking"><span class="spin"></span> Claude is analyzing ' +
    ia.length +
    " interactions…</span>";
  const gaps = inGapAgg(ia);
  const agents = inAgents(ia);
  const wc = [
    ...document.getElementById("inWordCloud").querySelectorAll("span"),
  ]
    .slice(0, 15)
    .map((s) => s.textContent)
    .join(", ");
  const summary =
    "Interactions: " +
    ia.length +
    "\nAvg quality: " +
    (window._inSnap ? window._inSnap.avg : "?") +
    "%\nGap compliance: " +
    gaps.map((g) => g.label + " " + g.pct + "%").join(", ") +
    "\nBottom agents: " +
    agents
      .slice(-3)
      .map((a) => a.name + " " + a.avg + "%")
      .join(", ") +
    "\nTop customer terms: " +
    wc;
  const sys =
    "You are a BPO operations analyst for Inspiro/Infocom. From the QA metrics, write DEEP, specific insights and an action plan in short markdown: '## Key Insights' (3-5 bullets), '## Root Causes' (2-4 bullets), '## 30-Day Action Plan' (numbered; owner + metric per step). PH-context aware.";
  try {
    const ans = await callClaude(summary, sys);
    box.innerHTML =
      '<div class="ai-guide-box">' +
      mdToHtml(ans) +
      '</div><div class="ai-badge claude" style="margin-top:8px">Claude deep insights</div>';
    logAudit("AI insights generated", ia.length + " interactions", "config");
  } catch (e) {
    box.innerHTML =
      '<div class="conn err" style="display:block">⚠️ ' +
      esc(e.message) +
      "</div>";
  }
}
window.aiInsights = aiInsights;
/* ===== FeeBe KNOWLEDGE-BASE BOT ===== */
function feebeSearch(q) {
  q = (q || "").toLowerCase();
  const words = q.split(/\W+/).filter((w) => w.length > 2);
  const hits = [];
  getKB().forEach((m) => {
    const hay = (
      (m.q || "") +
      " " +
      (m.a || "") +
      " " +
      (m.k || []).join(" ")
    ).toLowerCase();
    let s = 0;
    words.forEach((w) => {
      if (hay.includes(w)) s++;
    });
    (m.k || []).forEach((k) => {
      if (q.includes(k)) s += 2;
    });
    if (s > 0)
      hits.push({ s, title: m.q, body: m.a, link: m.link || "", src: "KB" });
  });
  loadKBAssets().forEach((a) => {
    if (!a.content) return;
    const hay = (a.name + " " + a.content).toLowerCase();
    let s = 0;
    words.forEach((w) => {
      if (hay.includes(w)) s++;
    });
    if (s > 0) {
      const w0 = words.find((w) => a.content.toLowerCase().includes(w)) || "";
      const idx = a.content.toLowerCase().indexOf(w0);
      hits.push({
        s,
        title: a.name,
        body: a.content.slice(Math.max(0, idx - 60), idx + 240).trim() + "…",
        link: a.url || "",
        src: a.kind === "web" ? "Website" : "File",
      });
    }
  });
  hits.sort((x, y) => y.s - x.s);
  return hits.slice(0, 4);
}
function feebeMsg(who, html) {
  const body = document.getElementById("kbbotBody");
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
async function botAnswer(q) {
  feebeMsg("user", esc(q));
  const hits = feebeSearch(q);
  let base;
  if (hits.length) {
    base = hits
      .map(
        (h) =>
          '<div style="margin-bottom:8px"><b>' +
          esc(h.title) +
          '</b> <span class="tag" style="margin:0">' +
          h.src +
          "</span><br>" +
          esc(h.body) +
          (h.link
            ? '<br><a class="kb-link" href="' +
              h.link +
              '" target="_blank">🔗 Reference</a>'
            : "") +
          "</div>",
      )
      .join("");
  } else {
    base =
      "I couldn\u2019t find that in the Knowledge Base yet. Try different keywords, or add it under 📚 Knowledge Base (files, websites, or a trainer module).";
  }
  const useClaude = aiCfg.provider === "claude" && aiCfg.claudeKey;
  const el = feebeMsg(
    "bot",
    base +
      (useClaude
        ? '<div class="note"><span class="spin"></span> Refining with Claude…</div>'
        : ""),
  );
  if (useClaude && el) {
    try {
      const ctx =
        hits.map((h) => "• " + h.title + ": " + h.body).join("\n") ||
        "(no KB match)";
      const sys =
        "You are FeeBe, the Inspiro/Infocom knowledge-base assistant. Answer ONLY from the provided KB context; if missing, say so and suggest what to add. Concise. Reply in the user's language (English/Tagalog/Cebuano/Hiligaynon/Ilokano/Waray).";
      const ans = await callClaude(
        "KB context:\n" + ctx + "\n\nQuestion: " + q,
        sys,
      );
      el.querySelector(".txt").innerHTML =
        esc(ans).replace(/\n/g, "<br>") +
        '<div class="note" style="margin-top:6px">📚 grounded in KB · <span class="ai-badge claude">Claude</span></div>';
    } catch (e) {
      el.querySelector(".txt").innerHTML =
        base +
        '<div class="note">(Claude unavailable — showing KB matches. ' +
        esc(e.message || "") +
        ")</div>";
    }
  }
  try {
    logAudit("FeeBe query", q.slice(0, 80), "data");
  } catch (e) {}
}
window.botAnswer = botAnswer;
window.botSend = function () {
  const inp = document.getElementById("kbbotInput");
  if (!inp) return;
  const q = (inp.value || "").trim();
  if (!q) return;
  inp.value = "";
  botAnswer(q);
};
window.toggleKBBot = function () {
  const p = document.getElementById("kbbotPanel");
  if (!p) return;
  const show = p.classList.contains("hidden");
  p.classList.toggle("hidden");
  if (show && !p.dataset.greeted) {
    p.dataset.greeted = "1";
    feebeMsg(
      "bot",
      'Hi! I\u2019m <b>FeeBe</b> 🤖 — ask me anything from the Knowledge Base (billing, outages, refunds, or your uploaded files &amp; connected websites).<br><span class="note">Try: "How do I request a refund?"</span>',
    );
  }
  const i = document.getElementById("kbbotInput");
  if (i && show) setTimeout(() => i.focus(), 100);
};
