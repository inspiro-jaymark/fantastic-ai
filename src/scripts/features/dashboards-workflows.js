function myInteractions() {
  const ia = loadInteractions();
  const emp = (loadUsers().find((u) => u.user === currentUser.user) || {}).emp;
  const nm = currentUser.name.toLowerCase();
  return ia.filter(
    (r) => (emp && r.agentId === emp) || (r.agent || "").toLowerCase() === nm,
  );
}
function coachForMe() {
  const emp = currentUser.user;
  const nm = (currentUser.name || "").toLowerCase();
  return loadCoach().filter(
    (x) => x.toUser === emp || (x.toName || "").toLowerCase() === nm,
  );
}
function renderAgentDash() {
  const mine = myInteractions();
  const sc = mine.filter((r) => r.gapPct != null);
  const avg = sc.length
    ? Math.round(sc.reduce((a, r) => a + r.gapPct, 0) / sc.length)
    : "—";
  const lb = loadLB();
  const emp = (loadUsers().find((u) => u.user === currentUser.user) || {}).emp;
  const me = lb[emp] ||
    Object.values(lb).find(
      (p) => p.name.toLowerCase() === currentUser.name.toLowerCase(),
    ) || { points: 0, bestQuality: 0, sessions: 0, hist: [] };
  document.getElementById("adKpis").innerHTML = [
    ["My Interactions", mine.length],
    ["My Avg Quality", avg + (avg === "—" ? "" : "%")],
    ["My Points", me.points || 0],
    ["My Rank", rankName(levelFor(me.points || 0))],
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
  const hist = (me.hist || []).length
    ? me.hist
    : sc
        .slice(0, 7)
        .reverse()
        .map((r) => r.gapPct || 0);
  sparkline("adSpark", hist.length ? hist : [0], 100);
  document.getElementById("adTrend").textContent = hist.length
    ? "Last " + hist.length + " scores"
    : "Complete a call to see your trend.";
  const ACH = [
    ["🎉", "First Call", mine.length >= 1],
    ["⭐", "Quality Star", (me.bestQuality || 0) >= 90],
    ["🔥", "On Fire", (me.sessions || 0) >= 5],
    ["👑", "Legend", (me.points || 0) >= 1000],
  ];
  document.getElementById("adAch").innerHTML = ACH.map(
    (a) =>
      '<div class="b ' +
      (a[2] ? "earned" : "locked") +
      '"><div class="em">' +
      a[0] +
      '</div><div class="t">' +
      a[1] +
      "</div></div>",
  ).join("");
  const cs = coachForMe();
  document.getElementById("myCoachList").innerHTML = cs.length
    ? cs
        .map(
          (x) =>
            '<div class="lib-card"><div class="lib-head"><div><b>' +
            esc(x.fromName || x.from) +
            "</b>" +
            (x.topic ? ' <span class="tag">' + esc(x.topic) + "</span>" : "") +
            '<div class="lib-meta"><span>' +
            new Date(x.ts).toLocaleString() +
            '</span></div><div class="script-card u-mt-6">' +
            mdToHtml(x.body) +
            '</div></div><div class="lib-actions">' +
            (x.ack
              ? '<span class="tag u-bg-ack">✓ acknowledged</span>'
              : "<button onclick=\"ackCoach('" +
                x.id +
                "')\">✅ Acknowledge</button>") +
            " <button onclick=\"dmOpen('" +
            esc(x.from) +
            "')\">💬 Reply</button></div></div></div>",
        )
        .join("")
    : '<div class="note">No coaching notes yet. Your supervisor\u2019s notes will appear here.</div>';
  document.getElementById("adList").innerHTML = mine.length
    ? mine
        .slice(0, 10)
        .map(
          (r) =>
            '<div class="lib-card"><div class="lib-head"><div><b>' +
            new Date(r.date).toLocaleString() +
            '</b><div class="lib-meta"><span>' +
            r.mode +
            "</span><span>🧩 " +
            (r.gapPct ?? "—") +
            "%</span>" +
            (r.manualRating ? "<span>⭐ " + r.manualRating + "/5</span>" : "") +
            '</div></div><div class="lib-actions"><button onclick="toggleReplay(\'' +
            r.id +
            '\')">👁 View</button></div></div><div class="replay" id="rp_' +
            r.id +
            '">' +
            replayHTML(r) +
            "</div></div>",
        )
        .join("")
    : '<div class="note">No interactions yet.</div>';
}
function ackCoach(id) {
  const c = loadCoach();
  const x = c.find((v) => v.id === id);
  if (x) {
    x.ack = true;
    saveCoach(c);
    renderAgentDash();
    notify(
      "supervisor",
      x.from,
      "✅ " + currentUser.name + " acknowledged your coaching note.",
      "coach",
    );
    logAudit("Coaching acknowledged", "from " + (x.fromName || x.from), "data");
  }
}
window.ackCoach = ackCoach;
function autoGap(rec) {
  const tx = rec.transcript || [];
  const ag = tx
    .filter((m) => m.role === "agent")
    .map((m) => (m.text || "").toLowerCase())
    .join(" ");
  const cu = tx
    .filter((m) => m.role !== "agent")
    .map((m) => (m.text || "").toLowerCase())
    .join(" ");
  const checks = [
    {
      id: "greet",
      label: "Branded greeting",
      topic: "closing",
      ok: /(hello|hi|welcome|thank you for calling|kumusta|magandang|maayong|naimbag|maupay)/.test(
        ag,
      ),
    },
    {
      id: "empathy",
      label: "Empathy & apology",
      topic: "empathy",
      ok:
        /(sorry|apolog|understand|pasensya|pasaylo|nasabtan|dispensar|maawatak)/.test(
          ag,
        ) || tx.some((m) => m.empathized),
    },
    {
      id: "verify",
      label: "Identity verification",
      topic: "verify",
      ok:
        /(verify|otp|account number|i-verify)/.test(ag) ||
        !/(account|refund|billing|charge|cancel|password)/.test(cu),
    },
    {
      id: "resolve",
      label: "Resolution provided",
      topic: "billing",
      ok: /(i'll|let me|i can|process|file|resolve|fix|refund|credit|gagawin|ayusin|tabang|bulig)/.test(
        ag,
      ),
    },
    {
      id: "compliance",
      label: "PCI/compliance",
      topic: "compliance",
      ok: !/(cvv|full card|otp is|password is)/.test(ag + cu),
    },
    {
      id: "close",
      label: "Proper closing",
      topic: "closing",
      ok: /(anything else|glad to help|thank you for calling|may iba pa|paalam|salamat po|babay|agyaman)/.test(
        ag,
      ),
    },
  ];
  const gaps = checks.filter((c) => !c.ok);
  const pct = Math.round(((checks.length - gaps.length) / checks.length) * 100);
  return { pct, gaps, checks, topTopic: gaps[0] ? gaps[0].topic : null };
}
function evalActionsHTML(rec) {
  const topics = loadTopics();
  const sups = loadUsers().filter(
    (u) => roleReceives(u.role, "supervisor") && u.status === "active",
  );
  return (
    '<div class="script-card u-mt-10"><div class="row u-justify-between"><b>🧪 QA action</b><button class="btn ghost u-btn-tiny" onclick="evAutoGap(\'' +
    rec.id +
    '\')">⚡ Auto gap analysis</button></div><div id="gap_' +
    rec.id +
	    '" class="note u-mt-6"></div><div class="tgrid u-mt-8"><div><label class="fld">Recommend enroll to topic</label><select class="inp" aria-label="Recommend enrollment topic" id="etopic_' +
    rec.id +
    '">' +
    topics
      .map((t) => '<option value="' + t.id + '">' + esc(t.name) + "</option>")
      .join("") +
	    '</select></div><div><label class="fld">Send to supervisor</label><select class="inp" aria-label="Send evaluation to supervisor" id="esup_' +
    rec.id +
    '"><option value="">(any supervisor)</option>' +
    sups
      .map((u) => '<option value="' + u.user + '">' + esc(u.name) + "</option>")
      .join("") +
	    '</select></div></div><label class="fld u-mt-6">Evaluation notes (Markdown)</label><textarea aria-label="Evaluation notes" id="enote_' +
    rec.id +
    '" placeholder="## Coaching&#10;- **Empathy:** apologize sooner&#10;- Enroll to *De-escalation*"></textarea><div class="row u-mt-8"><button class="btn" onclick="evSend(\'' +
    rec.id +
    '\')">📤 Send eval to Supervisor</button><button class="btn yellow" onclick="evRecommend(\'' +
    rec.id +
    '\')">🎓 Recommend enrollment</button><span class="note u-m-0" id="emsg_' +
    rec.id +
    '"></span></div></div>'
  );
}
function renderEval() {
  const f = (document.getElementById("evSearch")?.value || "").toLowerCase();
  const ia = loadInteractions();
  const scored = ia.filter((r) => r.gapPct != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.gapPct, 0) / scored.length)
    : "—";
  document.getElementById("evKpis").innerHTML = [
    ["To Review", ia.length],
    ["Avg Quality", avg + (avg === "—" ? "" : "%")],
    ["Below 70%", scored.filter((r) => r.gapPct < 70).length],
    ["Rated", ia.filter((r) => r.manualRating).length],
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
  const bands = { "85-100": 0, "70-84": 0, "50-69": 0, "<50": 0 };
  scored.forEach((r) => {
    const s = r.gapPct;
    if (s >= 85) bands["85-100"]++;
    else if (s >= 70) bands["70-84"]++;
    else if (s >= 50) bands["50-69"]++;
    else bands["<50"]++;
  });
  hbars(
    "evDist",
    Object.entries(bands).map(([n, v]) => ({ n, v })),
  );
  const low = scored
    .slice()
    .sort((a, b) => a.gapPct - b.gapPct)
    .slice(0, 5);
  document.getElementById("evLow").innerHTML = low.length
    ? low
        .map(
          (r) =>
            '<div class="hbar-row"><span class="name">' +
            esc(r.agent || "Unknown") +
            '</span><div class="track"><span data-style-width="' +
            Math.max(12, r.gapPct) +
            '%" data-style-background="' +
            heatColor(r.gapPct) +
            '">' +
            r.gapPct +
            "%</span></div></div>",
        )
        .join("")
    : '<div class="note">No scored interactions.</div>';
  const shown = ia.filter((r) =>
    ((r.agent || "") + (r.mode || "") + (r.site || ""))
      .toLowerCase()
      .includes(f),
  );
  document.getElementById("evList").innerHTML = shown.length
    ? shown
        .slice(0, 20)
        .map(
          (r) =>
            '<div class="lib-card"><div class="lib-head"><div><b>' +
            esc(r.agent || "Unknown") +
            '</b> <span class="kb-custom">' +
            r.mode +
            '</span><div class="lib-meta"><span>' +
            new Date(r.date).toLocaleDateString() +
            "</span><span>🧩 " +
            (r.gapPct ?? "—") +
            "%</span>" +
            (r.manualRating ? "<span>⭐ " + r.manualRating + "/5</span>" : "") +
            (r.lang ? "<span>🌐 " + r.lang + "</span>" : "") +
            '</div></div><div class="lib-actions"><button onclick="toggleReplay(\'' +
            r.id +
            '\')">👁 Review</button></div></div><div class="replay" id="rp_' +
            r.id +
            '">' +
            replayHTML(r) +
            "</div>" +
            evalActionsHTML(r) +
            "</div>",
        )
        .join("")
    : '<div class="note">No interactions to review.</div>';
}
function evAutoGap(id) {
  const rec = loadInteractions().find((x) => x.id === id);
  if (!rec) return;
  const g = autoGap(rec);
  const box = document.getElementById("gap_" + id);
  box.innerHTML =
    'Auto QA: <b data-style-color="' +
    (g.pct >= 85
      ? "var(--green)"
      : g.pct >= 70
        ? "var(--amber)"
        : "var(--red)") +
    '">' +
    g.pct +
    "/100</b> · Gaps: " +
    (g.gaps.length
      ? g.gaps.map((x) => '<span class="tag r">' + x.label + "</span>").join("")
      : '<span class="tag">none 🎉</span>') +
    (g.topTopic
      ? " · Suggested: <b>" + (topicById(g.topTopic) || {}).name + "</b>"
      : "");
  if (g.topTopic) {
    const sel = document.getElementById("etopic_" + id);
    if (sel) sel.value = g.topTopic;
  }
  window["_gap_" + id] = g;
  logAudit("Auto gap analysis", rec.agent + " · " + g.pct + "%", "data");
}
window.evAutoGap = evAutoGap;
function evSend(id) {
  const rec = loadInteractions().find((x) => x.id === id);
  if (!rec) return;
  const g = window["_gap_" + id] || autoGap(rec);
  const topicId = (document.getElementById("etopic_" + id) || {}).value;
  const sup = (document.getElementById("esup_" + id) || {}).value;
  const note = (document.getElementById("enote_" + id) || {}).value || "";
  const evs = loadEvals();
  evs.unshift({
    id: "EV-" + Date.now(),
    interactionId: rec.id,
    agent: rec.agent,
    agentId: rec.agentId || "",
    site: rec.site || "",
    score: g.pct,
    gaps: g.gaps.map((x) => x.label),
    topicId,
    note,
    from: currentUser.user,
    to: sup || "",
    status: "sent",
    ts: new Date().toISOString(),
  });
  saveEvals(evs);
  notify(
    "supervisor",
    sup,
    "📥 New QA eval for " + rec.agent + " (" + g.pct + "/100) — please review.",
    "eval",
  );
  document.getElementById("emsg_" + id).style.color = "var(--green)";
  document.getElementById("emsg_" + id).textContent = "✅ Sent to supervisor.";
  logAudit(
    "Evaluation sent",
    "agent " + rec.agent + " → supervisor " + (sup || "any"),
    "data",
  );
  refreshBell();
}
window.evSend = evSend;
function evRecommend(id) {
  const rec = loadInteractions().find((x) => x.id === id);
  if (!rec) return;
  const topicId = (document.getElementById("etopic_" + id) || {}).value;
  const note = (document.getElementById("enote_" + id) || {}).value || "";
  const en = loadEnroll();
  en.unshift({
    id: "EN-" + Date.now(),
    agent: rec.agent,
    agentId: rec.agentId || "",
    site: rec.site || "",
    topicId,
    note,
    by: currentUser.user,
    status: "pending",
    ts: new Date().toISOString(),
    interactionId: rec.id,
  });
  saveEnroll(en);
  notify(
    "trainer",
    "",
    "🎓 New enrollment: " +
      rec.agent +
      " → " +
      ((topicById(topicId) || {}).name || topicId),
    "enroll",
  );
  document.getElementById("emsg_" + id).style.color = "var(--green)";
  document.getElementById("emsg_" + id).textContent =
    "✅ Recommended to Trainer.";
  logAudit("Enrollment recommended", rec.agent + " → " + topicId, "data");
  refreshBell();
}
window.evRecommend = evRecommend;
function renderFraudDash() {
  const ia = loadInteractions();
  const flagged = ia.filter((r) => (r.fraudScore || 0) > 0);
  document.getElementById("faKpis").innerHTML = [
    ["Total Interactions", ia.length],
    ["Flagged", flagged.length],
    ["High-Risk (≥60)", ia.filter((r) => (r.fraudScore || 0) >= 60).length],
    ["Session Flags", fraudFlags.length],
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
  const types = {};
  fraudFlags.forEach((f) => (types[f.name] = (types[f.name] || 0) + 1));
  hbars(
    "faTypes",
    Object.entries(types)
      .map(([n, v]) => ({ n, v }))
      .sort((a, b) => b.v - a.v),
  );
  const bySite = {};
  ia.forEach((r) => {
    if (r.site && (r.fraudScore || 0) > 0)
      bySite[r.site] = (bySite[r.site] || 0) + 1;
  });
  hbars(
    "faSite",
    Object.entries(bySite).map(([n, v]) => ({ n, v })),
  );
  const hi = ia
    .filter((r) => (r.fraudScore || 0) > 0)
    .sort((a, b) => (b.fraudScore || 0) - (a.fraudScore || 0))
    .slice(0, 10);
  document.getElementById("faList").innerHTML = hi.length
    ? hi
        .map(
          (r) =>
            '<div class="lib-card"><div class="lib-head"><div><b>' +
            esc(r.agent || "Unknown") +
            '</b><div class="lib-meta"><span>' +
            new Date(r.date).toLocaleDateString() +
            '</span><span class="u-color-red">🛡️ Risk ' +
            r.fraudScore +
            "</span></div></div></div></div>",
        )
        .join("")
    : '<div class="note">No high-risk interactions recorded.</div>';
}
function renderAdminDash() {
  const ia = loadInteractions();
  const users = loadUsers();
  const scored = ia.filter((r) => r.gapPct != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.gapPct, 0) / scored.length)
    : "—";
  document.getElementById("admKpis").innerHTML = [
    ["Interactions", ia.length],
    ["Users", users.length],
    ["Agents", loadAgents().length],
    ["Avg Quality", avg + (avg === "—" ? "" : "%")],
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
  const modes = {};
  ia.forEach((r) => (modes[r.mode] = (modes[r.mode] || 0) + 1));
  hbars(
    "admMode",
    Object.entries(modes).map(([n, v]) => ({ n: n.slice(0, 18), v })),
  );
  const bySite = {};
  scored.forEach((r) => {
    if (r.site) {
      if (!bySite[r.site]) bySite[r.site] = { s: 0, n: 0 };
      bySite[r.site].s += r.gapPct;
      bySite[r.site].n++;
    }
  });
  hbars(
    "admSite",
    Object.entries(bySite)
      .map(([n, o]) => ({ n, v: Math.round(o.s / o.n) }))
      .sort((a, b) => b.v - a.v),
  );
  const roles = {};
  users.forEach(
    (u) => (roles[getRole(u.role).label] = (roles[getRole(u.role).label] || 0) + 1),
  );
  hbars(
    "admRoles",
    Object.entries(roles).map(([n, v]) => ({ n, v })),
  );
  document.getElementById("admHealth").innerHTML =
    '<div class="sum-line"><b>AI Script</b><span>' +
    (aiCfg.provider === "claude"
      ? "🟠 Claude (" + aiCfg.claudeModel + ")"
      : aiCfg.provider === "copilot"
        ? "🔵 Copilot"
        : "🟢 KB") +
    ((aiCfg.provider === "claude" && aiCfg.claudeKey) ||
    (aiCfg.provider === "copilot" && aiCfg.copKey)
      ? " · key set"
      : " · no key") +
    '</span></div><div class="sum-line"><b>Roles</b><span>' +
    Object.keys(ROLES).length +
    " (" +
    FIXED_ROLE_IDS.length +
    " fixed · " +
    loadCustomRoles().length +
    ' custom)</span></div><div class="sum-line"><b>Insights</b><span>📈 word cloud · gap analysis · recommendations</span></div><div class="sum-line"><b>KB Bot</b><span>FeeBe 🤖 active</span></div><div class="sum-line"><b>Languages</b><span>EN·TL·Ceb·Hil·Ilo·War·Taglish·JP·HK</span></div><div class="sum-line"><b>Audit events</b><span>' +
    loadAudit().length +
    '</span></div><div class="u-mt-12"><button class="btn ghost" onclick="showView(\'insights\')">📈 Insights</button> <button class="btn ghost" onclick="showView(\'access\')">🔐 Access</button> <button class="btn ghost" onclick="showView(\'audit\')">🧾 Audit</button></div>';
}
function renderSupervisorDash() {
  const evs = loadEvals();
  const pend = evs.filter((e) => e.status === "sent");
  const en = loadEnroll();
  document.getElementById("svKpis").innerHTML = [
    ["Inbox", evs.length],
    ["Awaiting feedback", pend.length],
    ["QA notified", evs.filter((e) => e.status === "qa_notified").length],
    ["Enroll recs", en.length],
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
  document.getElementById("svPending").innerHTML = pend.length
    ? pend
        .slice(0, 8)
        .map(
          (e) =>
            '<div class="hbar-row"><span class="name">' +
            esc(e.agent) +
            '</span><div class="track"><span data-style-width="' +
            Math.max(12, e.score) +
            '%" data-style-background="' +
            heatColor(e.score) +
            '">' +
            e.score +
            "%</span></div></div>",
        )
        .join("")
    : '<div class="note">No pending evaluations 🎉</div>';
  document.getElementById("svEnroll").innerHTML = en.length
    ? en
        .slice(0, 8)
        .map(
          (x) =>
            '<div class="sum-line"><b>' +
            esc(x.agent) +
            "</b><span>" +
            esc((topicById(x.topicId) || {}).name || x.topicId) +
            " · " +
            x.status +
            "</span></div>",
        )
        .join("")
    : '<div class="note">No recommendations yet.</div>';
  const sel = document.getElementById("coachAgent");
  if (sel) {
    const ags = loadUsers().filter(
      (u) => roleReceives(u.role, "agent") && u.status === "active",
    );
    sel.innerHTML =
      ags
        .map(
          (a) =>
            '<option value="' +
            a.user +
            '">' +
            esc(a.name) +
            (a.emp ? " · " + a.emp : "") +
            "</option>",
        )
        .join("") + '<option value="__name">— type a name —</option>';
  }
  renderCoachHist();
}
function coachPreview() {
  const p = document.getElementById("coachPrev");
  p.classList.remove("hidden");
  p.innerHTML =
    '<div class="lbl">PREVIEW</div>' +
    mdToHtml(document.getElementById("coachMd").value);
}
window.coachPreview = coachPreview;
function sendCoach() {
  const sel = document.getElementById("coachAgent");
  let toUser = sel.value,
    toName = "";
  if (toUser === "__name") {
    toName = prompt("Agent full name:") || "";
    toUser = "";
    const u = loadUsers().find(
      (x) => x.name.toLowerCase() === toName.toLowerCase(),
    );
    if (u) toUser = u.user;
  } else {
    const u = loadUsers().find((x) => x.user === toUser);
    toName = u ? u.name : "";
  }
  const topic = document.getElementById("coachTopic").value.trim();
  const body = document.getElementById("coachMd").value.trim();
  const msg = document.getElementById("coachMsg");
  if ((!toUser && !toName) || !body) {
    msg.style.color = "var(--red)";
    msg.textContent = "⚠️ Pick an agent and write a note.";
    return;
  }
  const c = loadCoach();
  c.unshift({
    id: "CN-" + Date.now(),
    toUser,
    toName,
    topic,
    body,
    from: currentUser.user,
    fromName: currentUser.name,
    ts: new Date().toISOString(),
    ack: false,
  });
  saveCoach(c);
  notify(
    "agent",
    toUser,
    "📝 New coaching note from " +
      currentUser.name +
      (topic ? " · " + topic : ""),
    "coach",
  );
  msg.style.color = "var(--green)";
  msg.textContent = "✅ Sent to " + (toName || toUser) + ".";
  document.getElementById("coachMd").value = "";
  document.getElementById("coachTopic").value = "";
  renderCoachHist();
  logAudit("Coaching note sent", "to " + (toName || toUser), "data");
}
window.sendCoach = sendCoach;
function renderCoachHist() {
  const el = document.getElementById("coachHist");
  if (!el) return;
  const mine = loadCoach().filter(
    (x) => x.from === currentUser.user || roleActsAs(currentUser.role, "admin"),
  );
  el.innerHTML = mine.length
    ? mine
        .slice(0, 30)
        .map(
          (x) =>
            '<div class="lib-card"><div class="lib-head"><div><b>➡️ ' +
            esc(x.toName || x.toUser) +
            "</b>" +
            (x.topic ? ' <span class="tag">' + esc(x.topic) + "</span>" : "") +
            (x.ack
              ? ' <span class="tag u-bg-ack">acknowledged</span>'
              : ' <span class="tag y">sent</span>') +
            '<div class="lib-meta"><span>' +
            new Date(x.ts).toLocaleString() +
            '</span></div><div class="script-card u-mt-6">' +
            mdToHtml(x.body) +
            "</div></div></div></div>",
        )
        .join("")
    : '<div class="note">No coaching notes sent yet.</div>';
}
function renderSupQueue() {
  const list = document.getElementById("supQueueList");
  if (!list) return;
  const f = (document.getElementById("supFilter") || {}).value || "all";
  const evs = loadEvals().filter((e) => f === "all" || e.status === f);
  document.getElementById("supQueueEmpty").style.display = evs.length
    ? "none"
    : "block";
  list.innerHTML = evs
    .map((e) => {
      const topic = topicById(e.topicId);
      const st =
        e.status === "sent"
          ? '<span class="tag y">Awaiting feedback</span>'
          : e.status === "feedback_done"
            ? '<span class="tag">Feedback done</span>'
            : '<span class="tag u-bg-ack">QA notified</span>';
      const rec = loadInteractions().find((x) => x.id === e.interactionId);
      return (
        '<div class="lib-card"><div class="lib-head"><div><b>' +
        esc(e.agent) +
        "</b> · QA " +
        e.score +
        "/100 " +
        st +
        '<div class="lib-meta"><span>from ' +
        esc(e.from) +
        "</span>" +
        (e.site ? "<span>🏢 " + esc(e.site) + "</span>" : "") +
        "<span>" +
        new Date(e.ts).toLocaleString() +
        "</span>" +
        (topic ? "<span>🎓 rec: " + esc(topic.name) + "</span>" : "") +
        "</div>" +
        (e.gaps && e.gaps.length
          ? '<div class="u-mt-6">' +
            e.gaps
              .map((g) => '<span class="tag r">' + esc(g) + "</span>")
              .join("") +
            "</div>"
          : "") +
        (e.note
          ? '<div class="script-card u-mt-8">' +
            mdToHtml(e.note) +
            "</div>"
          : "") +
        (e.feedback
          ? '<div class="ai-guide-box u-mt-8"><b>🧑‍✈️ Feedback:</b><br>' +
            mdToHtml(e.feedback) +
            "</div>"
          : "") +
        '</div><div class="lib-actions"><button onclick="toggleReplay(\'' +
        e.interactionId +
        "')\">👁 Call</button><button onclick=\"dmOpen('" +
        esc(e.from) +
        "')\">💬 QA</button></div></div>" +
        (e.status !== "qa_notified"
          ? '<div class="u-mt-10"><label class="fld" for="fb_' +
            e.id +
            '">Supervisor feedback (Markdown)</label><textarea class="inp" aria-label="Supervisor feedback" id="fb_' +
            e.id +
            '" rows="4" placeholder="## Feedback&#10;- **Strength:** clear ownership&#10;- **Improve:** summarize next steps">' +
            esc(e.feedback || "") +
            '</textarea><div class="row u-mt-8"><button class="btn" onclick="supSaveFeedback(\'' +
            e.id +
            '\')">💾 Save</button><button class="btn mag" onclick="supNotifyQA(\'' +
            e.id +
            "')\">🔔 Notify QA</button></div></div>"
          : "") +
        '<div class="replay" id="rp_' +
        e.interactionId +
        '">' +
        (rec ? replayHTML(rec) : "") +
        "</div></div>"
      );
    })
    .join("");
  refreshBell();
}
window.renderSupQueue = renderSupQueue;
function readSupervisorFeedbackMarkdown(evId) {
  const field = document.getElementById("fb_" + evId);
  return ((field && field.value) || "").replace(/\r\n?/g, "\n").trim();
}
function supSaveFeedback(evId) {
  const evs = loadEvals();
  const e = evs.find((x) => x.id === evId);
  if (!e) return;
  e.feedback = readSupervisorFeedbackMarkdown(evId);
  if (e.status === "sent") e.status = "feedback_done";
  saveEvals(evs);
  renderSupQueue();
  logAudit("Supervisor feedback saved", "eval " + evId, "data");
}
window.supSaveFeedback = supSaveFeedback;
function supNotifyQA(evId) {
  const evs = loadEvals();
  const e = evs.find((x) => x.id === evId);
  if (!e) return;
  e.feedback = readSupervisorFeedbackMarkdown(evId);
  e.status = "qa_notified";
  saveEvals(evs);
  notify(
    "evaluator",
    e.from,
    "✅ Supervisor feedback ready for " + e.agent + ". QA notified.",
    "feedback",
  );
  renderSupQueue();
  logAudit("QA notified", "eval " + evId + " for " + e.agent, "data");
}
window.supNotifyQA = supNotifyQA;
function renderTrainer() {
  const en = loadEnroll();
  const f = (document.getElementById("trEnrollFilter") || {}).value || "all";
  const topics = loadTopics();
  document.getElementById("trKpis").innerHTML = [
    ["Enroll queue", en.length],
    ["Pending", en.filter((x) => x.status === "pending").length],
    ["Enrolled", en.filter((x) => x.status === "enrolled").length],
    ["Topics", topics.length],
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
  const list = en.filter((x) => f === "all" || x.status === f);
  document.getElementById("trEnrollList").innerHTML = list.length
    ? list
        .map((x) => {
          const tp = topicById(x.topicId);
          return (
            '<div class="lib-card"><div class="lib-head"><div><b>' +
            esc(x.agent) +
            "</b> → 🎓 " +
            esc((tp || {}).name || x.topicId) +
            '<div class="lib-meta"><span>by ' +
            esc(x.by) +
            "</span><span>" +
            new Date(x.ts).toLocaleDateString() +
            '</span><span class="tag u-m-0 ' +
            (x.status === "completed" ? "" : "y") +
            '">' +
            x.status +
            "</span></div>" +
            (x.note
              ? '<div class="script-card u-mt-6">' +
                mdToHtml(x.note) +
                "</div>"
              : "") +
            '</div><div class="lib-actions">' +
            (tp
              ? "<button onclick=\"trViewTopic('" +
                tp.id +
                "')\">📖 Module</button>"
              : "") +
            (x.status !== "enrolled"
              ? "<button onclick=\"trSetStatus('" +
                x.id +
                "','enrolled')\">✅ Enroll</button>"
              : "") +
            (x.status !== "completed"
              ? "<button onclick=\"trSetStatus('" +
                x.id +
                "','completed')\">🏁 Complete</button>"
              : "") +
            " <button onclick=\"dmOpen('" +
            esc(x.by) +
            "')\">💬 QA</button></div></div></div>"
          );
        })
        .join("")
    : '<div class="note">No enrollments in this filter.</div>';
  document.getElementById("trTopicList").innerHTML = topics
    .map(
      (t) =>
        '<div class="sum-line"><b>' +
        esc(t.name) +
        '</b><span><button class="btn ghost u-btn-mini" onclick="trEditTopic(\'' +
        t.id +
        '\')">✏️</button> <button class="btn ghost u-btn-mini" onclick="trViewTopic(\'' +
        t.id +
        "')\">👁</button></span></div>",
    )
    .join("");
}
window.renderTrainer = renderTrainer;
function trSetStatus(id, st) {
  const en = loadEnroll();
  const x = en.find((e) => e.id === id);
  if (x) {
    x.status = st;
    saveEnroll(en);
    renderTrainer();
    logAudit("Enrollment " + st, x.agent, "data");
    if (st === "completed")
      notify(
        "evaluator",
        x.by,
        "🏁 " +
          x.agent +
          " completed: " +
          ((topicById(x.topicId) || {}).name || x.topicId),
        "training",
      );
  }
}
window.trSetStatus = trSetStatus;
function trViewTopic(id) {
  const t = topicById(id);
  if (!t) return;
  const p = document.getElementById("trPreview");
  p.classList.remove("hidden");
  p.innerHTML = '<div class="lbl">MODULE PREVIEW</div>' + mdToHtml(t.md);
  p.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
window.trViewTopic = trViewTopic;
function trEditTopic(id) {
  const t = topicById(id);
  if (!t) return;
  document.getElementById("trTopicName").value = t.name;
  document.getElementById("trTopicMd").value = t.md;
  document.getElementById("trTopicName").dataset.editId = id;
}
window.trEditTopic = trEditTopic;
function trSaveTopic() {
  const name = document.getElementById("trTopicName").value.trim();
  const md = document.getElementById("trTopicMd").value;
  if (!name) {
    alert("Topic name required.");
    return;
  }
  const topics = loadTopics();
  const editId = document.getElementById("trTopicName").dataset.editId;
  if (editId) {
    const t = topics.find((x) => x.id === editId);
    if (t) {
      t.name = name;
      t.md = md;
    }
    delete document.getElementById("trTopicName").dataset.editId;
  } else topics.push({ id: "t" + Date.now(), name, md });
  saveTopics(topics);
  document.getElementById("trTopicName").value = "";
  document.getElementById("trTopicMd").value = "";
  renderTrainer();
  logAudit("Training topic saved", name, "config");
}
window.trSaveTopic = trSaveTopic;
function trPreview() {
  const p = document.getElementById("trPreview");
  p.classList.remove("hidden");
  p.innerHTML =
    '<div class="lbl">PREVIEW</div>' +
    mdToHtml(document.getElementById("trTopicMd").value);
}
window.trPreview = trPreview;
