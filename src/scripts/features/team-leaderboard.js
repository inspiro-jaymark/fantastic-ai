function teamRollup() {
  const field = document.getElementById("teamGroup").value;
  const ia = loadInteractions();
  const g = {};
  ia.forEach((r) => {
    let key = r[field];
    if (!key) {
      const ag = findAgent(r.agent, r.agentId);
      if (ag) key = ag[field];
    }
    if (!key) return;
    if (!g[key]) g[key] = { key, n: 0, sum: 0, resolved: 0, agents: {} };
    const x = g[key];
    x.n++;
    x.sum += r.gapPct || 0;
    if (r.resolved) x.resolved++;
    const an = r.agent || "Unknown";
    if (!x.agents[an]) x.agents[an] = { name: an, n: 0, sum: 0 };
    x.agents[an].n++;
    x.agents[an].sum += r.gapPct || 0;
  });
  return Object.values(g)
    .map((x) => ({
      ...x,
      avg: x.n ? Math.round(x.sum / x.n) : 0,
      resRate: x.n ? Math.round((x.resolved / x.n) * 100) : 0,
      leader: Object.values(x.agents)
        .map((a) => ({ ...a, avg: Math.round(a.sum / a.n) }))
        .sort((a, b) => b.avg - a.avg)[0],
    }))
    .sort((a, b) => b.avg - a.avg);
}
function heatColor(v) {
  return v >= 85 ? "#16a34a" : v >= 70 ? "#f59e0b" : "#dc2626";
}
function renderTeam() {
  const field = document.getElementById("teamGroup").value;
  const labels = {
    site: "Sites",
    bu: "BUs",
    section: "Sections",
    sub: "Sub-sections",
  };
  const rows = teamRollup();
  document.getElementById("tmGroupsLab").textContent = labels[field];
  document.getElementById("tmGroups").textContent = rows.length;
  const tot = rows.reduce((a, r) => a + r.n, 0);
  document.getElementById("tmInteractions").textContent = tot;
  document.getElementById("tmAvg").textContent = tot
    ? Math.round(rows.reduce((a, r) => a + r.sum, 0) / tot) + "%"
    : "—";
  document.getElementById("tmTop").textContent = rows.length
    ? rows[0].key
    : "—";
  document.getElementById("teamEmpty").style.display = rows.length
    ? "none"
    : "block";
  const L = document.getElementById("teamLeaders");
  if (!rows.length) {
    L.innerHTML = '<div class="note">No matched interactions yet.</div>';
    document.getElementById("teamBars").innerHTML = "";
    document.getElementById("teamVol").innerHTML = "";
    document.getElementById("teamDetail").innerHTML = "";
    return;
  }
  L.innerHTML =
    '<div class="grid g3">' +
    rows
      .map((r) =>
        r.leader
          ? '<div class="team-card"><div class="th"><b>' +
            r.key +
            '</b><span class="lb-av">' +
            r.leader.name.substring(0, 2).toUpperCase() +
            '</span></div><div style="margin-top:6px"><b>🏅 ' +
            r.leader.name +
            '</b> <span class="team-score" style="font-size:16px;color:' +
            heatColor(r.leader.avg) +
            '">' +
            r.leader.avg +
            '%</span><div class="note">' +
            r.leader.n +
            " interactions · top in " +
            r.key +
            "</div></div></div>"
          : "",
      )
      .join("") +
    "</div>";
  const maxA = Math.max(...rows.map((r) => r.avg), 1);
  document.getElementById("teamBars").innerHTML = rows
    .map(
      (r) =>
        '<div class="hbar-row"><span class="name">' +
        r.key +
        '</span><div class="track"><span style="width:' +
        Math.max(12, (r.avg / maxA) * 100) +
        "%;background:" +
        heatColor(r.avg) +
        '">' +
        r.avg +
        "%</span></div></div>",
    )
    .join("");
  const maxN = Math.max(...rows.map((r) => r.n), 1);
  document.getElementById("teamVol").innerHTML = rows
    .slice()
    .sort((a, b) => b.n - a.n)
    .map(
      (r) =>
        '<div class="hbar-row"><span class="name">' +
        r.key +
        '</span><div class="track"><span style="width:' +
        Math.max(12, (r.n / maxN) * 100) +
        '%">' +
        r.n +
        "</span></div></div>",
    )
    .join("");
  document.getElementById("teamDetail").innerHTML = rows
    .map(
      (r) =>
        '<div class="team-card"><div class="th"><b>' +
        r.key +
        '</b><span class="team-score" style="color:' +
        heatColor(r.avg) +
        '">' +
        r.avg +
        '%</span></div><div class="team-meta"><span>💬 ' +
        r.n +
        "</span><span>✅ " +
        r.resRate +
        "% resolved</span><span>🏅 " +
        (r.leader ? r.leader.name : "—") +
        "</span></div></div>",
    )
    .join("");
}
function exportTeam() {
  const rows = teamRollup();
  let out = "Group,Interactions,AvgScore,ResolvedRate,Leader,LeaderScore\n";
  rows.forEach(
    (r) =>
      (out +=
        [
          r.key,
          r.n,
          r.avg + "%",
          r.resRate + "%",
          r.leader ? r.leader.name : "",
          r.leader ? r.leader.avg + "%" : "",
        ]
          .map(csvEsc)
          .join(",") + "\n"),
  );
  dl(out, "FANTASTIC_team.csv", "text/csv");
  logAudit("Exported team dashboard", "", "export");
}
function loadLB() {
  return read("ft_leaderboard", {});
}
function saveLB(o) {
  store("ft_leaderboard", o);
}
function levelFor(p) {
  return Math.max(1, Math.floor(p / 250) + 1);
}
function rankName(l) {
  return (
    [
      "Rookie",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Master",
      "Grandmaster",
    ][Math.min(l - 1, 7)] || "Legend"
  );
}
function awardPoints(
  name,
  { quality = 0, training = 0, tag = "", agentId = "" },
) {
  if (!name) name = "Agent";
  const lb = loadLB();
  const ag = findAgent(name, agentId);
  const key = agentId || (ag ? ag.emp : name);
  const p = lb[key] || {
    name,
    agentId,
    points: 0,
    sessions: 0,
    trainingCount: 0,
    qualitySum: 0,
    qualityN: 0,
    bestQuality: 0,
    bestTraining: 0,
    hist: [],
  };
  p.name = ag ? ag.first + " " + ag.last : name;
  if (ag) {
    p.site = ag.site;
    p.bu = ag.bu;
    p.section = ag.section;
    p.agentId = ag.emp;
  } else if (agentId) p.agentId = agentId;
  const pts = Math.round(quality * 2 + training * 1.5);
  p.points += pts;
  p.sessions++;
  if (training > 0) {
    p.trainingCount++;
    p.bestTraining = Math.max(p.bestTraining, training);
  }
  if (quality > 0) {
    p.qualitySum += quality;
    p.qualityN++;
    p.bestQuality = Math.max(p.bestQuality, quality);
  }
  p.hist = (p.hist || []).concat(quality || training).slice(-10);
  lb[key] = p;
  saveLB(lb);
  renderLeaderboard();
  populateLbSites();
}
function populateLbSites() {
  const lb = loadLB();
  const sites = [
    ...new Set(
      Object.values(lb)
        .map((p) => p.site)
        .filter(Boolean),
    ),
  ];
  const sel = document.getElementById("lbSite");
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML =
    '<option value="all">All sites</option>' +
    sites.map((s) => "<option>" + s + "</option>").join("");
  if (cur) sel.value = cur;
}
function renderLeaderboard() {
  const lb = loadLB();
  const fEl = document.getElementById("lbFilter");
  if (!fEl) return;
  const filter = fEl.value,
    site = document.getElementById("lbSite").value;
  let arr = Object.values(lb).map((p) => ({
    ...p,
    avgQuality: p.qualityN ? Math.round(p.qualitySum / p.qualityN) : 0,
  }));
  if (site !== "all") arr = arr.filter((p) => p.site === site);
  if (filter === "quality")
    arr = arr
      .filter((p) => p.qualityN > 0)
      .sort((a, b) => b.bestQuality - a.bestQuality);
  else if (filter === "training")
    arr = arr
      .filter((p) => p.trainingCount > 0)
      .sort((a, b) => b.bestTraining - a.bestTraining);
  else arr.sort((a, b) => b.points - a.points);
  document.getElementById("lbEmpty").style.display = arr.length
    ? "none"
    : "block";
  const pod = document.getElementById("podium");
  const top3 = arr.slice(0, 3),
    order = [1, 0, 2],
    cls = ["p2", "p1", "p3"],
    medal = ["🥈", "🥇", "🥉"];
  pod.innerHTML = order
    .map((oi, i) => {
      const p = top3[oi];
      if (!p) return "";
      return (
        '<div class="pod ' +
        cls[i] +
        '"><div class="medal">' +
        medal[i] +
        '</div><div class="nm">' +
        p.name +
        '</div><div class="pts">' +
        p.points +
        '</div><div style="font-size:10px">' +
        rankName(levelFor(p.points)) +
        "</div></div>"
      );
    })
    .join("");
  document.getElementById("lbList").innerHTML = arr
    .map((p, i) => {
      const lvl = levelFor(p.points);
      const metric =
        filter === "quality"
          ? p.bestQuality + " best QA"
          : filter === "training"
            ? p.bestTraining + "% sim"
            : p.points + " pts";
      return (
        '<div class="lb-row"><div class="lb-rank">' +
        (i + 1) +
        '</div><div class="lb-av">' +
        p.name.substring(0, 2).toUpperCase() +
        '</div><div class="lb-info"><b>' +
        p.name +
        '</b><span class="lvl">Lv.' +
        lvl +
        " " +
        rankName(lvl) +
        '</span><div class="sub">' +
        ((p.site ? p.site + " · " : "") +
          (p.bu ? p.bu + " · " : "") +
          p.sessions +
          " sessions · avg QA " +
          p.avgQuality) +
        '</div></div><div class="lb-pts">' +
        metric +
        "</div></div>"
      );
    })
    .join("");
}
function exportLeaderboard() {
  const lb = loadLB();
  let out =
    "Agent,Agent ID,Site,BU,Points,Level,Sessions,AvgQuality,BestQuality\n";
  Object.values(lb).forEach(
    (p) =>
      (out +=
        [
          p.name,
          p.agentId || "",
          p.site || "",
          p.bu || "",
          p.points,
          levelFor(p.points),
          p.sessions,
          p.qualityN ? Math.round(p.qualitySum / p.qualityN) : 0,
          p.bestQuality,
        ]
          .map(csvEsc)
          .join(",") + "\n"),
  );
  dl(out, "FANTASTIC_leaderboard.csv", "text/csv");
  logAudit("Exported leaderboard", "", "export");
}
