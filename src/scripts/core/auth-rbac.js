function defaultUsers() {
  return [
    {
      user: "admin",
      name: "System Administrator",
      pass: "admin123",
      role: "admin",
      emp: "",
      status: "active",
    },
    {
      user: "evaluator",
      name: "Quality Evaluator",
      pass: "eval123",
      role: "evaluator",
      emp: "",
      status: "active",
    },
    {
      user: "supervisor",
      name: "Team Supervisor",
      pass: "super123",
      role: "supervisor",
      emp: "",
      status: "active",
    },
    {
      user: "trainer",
      name: "Training Officer",
      pass: "train123",
      role: "trainer",
      emp: "",
      status: "active",
    },
    {
      user: "fraud",
      name: "Fraud Analyst",
      pass: "fraud123",
      role: "fraud",
      emp: "",
      status: "active",
    },
    {
      user: "agent",
      name: "Juan Dela Cruz",
      pass: "agent123",
      role: "agent",
      emp: "EMP-1001",
      status: "active",
    },
  ];
}
function loadUsers() {
  let u = null;
  try {
    u = JSON.parse(localStorage.getItem("ft_users") || "null");
  } catch (e) {}
  if (!u || !u.length) {
    u = defaultUsers();
    store("ft_users", u);
    return u;
  }
  let ch = false;
  defaultUsers().forEach((d) => {
    if (!u.some((x) => x.user === d.user)) {
      u.push(d);
      ch = true;
    }
  });
  if (ch) store("ft_users", u);
  return u;
}
function saveUsers(a) {
  store("ft_users", a);
}
let currentUser = null;
function fillLogin(u, p) {
  document.getElementById("loginUser").value = u;
  document.getElementById("loginPass").value = p;
}
function doLogin() {
  const u = document.getElementById("loginUser").value.trim().toLowerCase();
  const p = document.getElementById("loginPass").value;
  const err = document.getElementById("loginErr");
  const m = loadUsers().find((x) => x.user.toLowerCase() === u);
  if (!m || m.pass !== p) {
    err.textContent = "❌ Invalid username or password.";
    return;
  }
  if (m.status !== "active") {
    err.textContent = "⛔ Account disabled.";
    return;
  }
  currentUser = m;
  store("ft_session", { user: m.user });
  err.textContent = "";
  document.getElementById("loginOverlay").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  logAudit("Signed in", m.user + " (" + m.role + ")", "auth");
  applyRBAC();
}
function logout() {
  try {
    if (currentUser) logAudit("Signed out", currentUser.user, "auth");
  } catch (e) {}
  try {
    if (typeof callActive !== "undefined" && callActive) endCall();
  } catch (e) {}
  try {
    if (typeof acActive !== "undefined" && acActive) {
      acActive = false;
      acStopRec();
    }
  } catch (e) {}
  try {
    stopCamera && stopCamera();
  } catch (e) {}
  try {
    stopSysAudio && stopSysAudio();
  } catch (e) {}
  try {
    stopMixRecording && stopMixRecording();
  } catch (e) {}
  try {
    stopSpeaking && stopSpeaking();
  } catch (e) {}
  try {
    ftStopMeter && ftStopMeter();
  } catch (e) {}
  currentUser = null;
  try {
    localStorage.removeItem("ft_session");
  } catch (e) {}
  setNavMenuOpen(false);
  const app = document.getElementById("app");
  if (app) app.classList.add("hidden");
  const ov = document.getElementById("loginOverlay");
  if (ov) ov.classList.remove("hidden");
  const lp = document.getElementById("loginPass");
  if (lp) lp.value = "";
  const lu = document.getElementById("loginUser");
  if (lu) {
    lu.value = "";
    try {
      lu.focus();
    } catch (e) {}
  }
  return false;
}
window.logout = logout;
function confirmLogout() {
  appConfirm(
    {
      title: "Log out?",
      message:
        "Log out of this session? Any active call or recording will be stopped.",
      confirmText: "Logout",
      danger: true,
    },
    () => logout(),
  );
  return false;
}
window.confirmLogout = confirmLogout;
function quickSwap(user) {
  const m = loadUsers().find((x) => x.user === user);
  if (!m || m.status !== "active") return;
  try {
    if (typeof callActive !== "undefined" && callActive) endCall();
  } catch (e) {}
  try {
    stopCamera && stopCamera();
  } catch (e) {}
  currentUser = m;
  store("ft_session", { user: m.user });
  logAudit("Switched user", "→ " + m.user + " (" + m.role + ")", "auth");
  applyRBAC();
}
window.quickSwap = quickSwap;
function restoreSession() {
  try {
    const s = read("ft_session", null);
    if (s) {
      const m = loadUsers().find((x) => x.user === s.user);
      if (m && m.status === "active") {
        currentUser = m;
        document.getElementById("loginOverlay").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        applyRBAC();
        return;
      }
    }
  } catch (e) {}
}
function can(view) {
  return currentUser && getRole(currentUser.role).perms.includes(view);
}
function isDesktopNav() {
  return window.matchMedia("(min-width: 901px)").matches;
}
function setNavMenuOpen(open) {
  const nav = document.getElementById("navBar");
  const btn = document.getElementById("navMenuBtn");
  if (!nav) return;
  const isActiveSession = !!currentUser;

  document.body.classList.toggle("nav-open", !!open);
  nav.classList.toggle("is-open", !!open);
  nav.classList.toggle("is-collapsed", !open);
  nav.setAttribute("aria-hidden", isActiveSession ? "false" : "true");
  try {
    nav.inert = !isActiveSession;
  } catch (e) {}

  if (btn) {
    btn.classList.toggle("is-open", !!open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      open ? "Collapse navigation menu" : "Expand navigation menu",
    );
  }
}
function toggleNavMenu() {
  const nav = document.getElementById("navBar");
  setNavMenuOpen(!(nav && nav.classList.contains("is-open")));
}
window.toggleNavMenu = toggleNavMenu;
function fillSwitchUser() {
  const sw = document.getElementById("ftSwitchUser");
  if (!sw) return;
  const us = loadUsers().filter((u) => u.status === "active");
  sw.innerHTML =
    '<option value="">🔀 Switch user…</option>' +
    us
      .map(
        (u) =>
          '<option value="' +
          u.user +
          '"' +
          (currentUser && currentUser.user === u.user ? " selected" : "") +
          ">" +
          getRole(u.role).em +
          " " +
          esc(u.name) +
          " (" +
          esc(getRole(u.role).label) +
          ")</option>",
      )
      .join("");
}
function applyRBAC() {
  const r = getRole(currentUser.role);
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent = r.em + " " + r.label;
  const nav = document.getElementById("navBar");
  nav.innerHTML = "";
  NAV_ITEMS.forEach(([id, label]) => {
    if (r.perms.includes(id)) {
      const b = document.createElement("button");
      const splitAt = label.indexOf(" ");
      const icon = splitAt > 0 ? label.slice(0, splitAt) : label;
      const text = splitAt > 0 ? label.slice(splitAt + 1) : label;
      b.type = "button";
      b.className = "tab";
      b.dataset.view = id;
      b.setAttribute("aria-label", text);
      b.title = text;
      b.innerHTML =
        '<span class="tab-icon" aria-hidden="true">' +
        esc(icon) +
        '</span><span class="tab-label">' +
        esc(text) +
        (id === "supqueue"
          ? ' <span class="pill-count hidden u-bg-magenta" id="supInboxCount">0</span>'
          : "") +
        (id === "audit"
          ? ' <span class="pill-count hidden u-bg-teal" id="auditTabCount">0</span>'
          : "") +
        "</span>";
      b.onclick = () => {
        showView(id);
        setNavMenuOpen(false);
      };
      nav.appendChild(b);
    }
  });
  const lb = document.getElementById("logoutBtn");
  if (lb) lb.onclick = confirmLogout;
  setNavMenuOpen(isDesktopNav());
  buildHome();
  showView(r.home);
  fillSwitchUser();
  refreshBell();
  refreshDMBadge();
  const n = loadAudit().length;
  const badge = document.getElementById("auditTabCount");
  if (badge && n) {
    badge.textContent = n;
    badge.classList.remove("hidden");
  }
}
function showView(id) {
  if (!can(id)) id = getRole(currentUser.role).home;
  document
    .querySelectorAll("#navBar .tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.view === id));
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  const R = {
    library: () =>
      renderLibrary((document.getElementById("libSearch") || {}).value || ""),
    leader: () => {
      populateLbSites();
      renderLeaderboard();
    },
    agentdb: renderAgents,
    batch: renderBatch,
    team: renderTeam,
    access: () => {
      renderUsers();
      renderRoleMatrix();
    },
    audit: renderAudit,
    agentdash: renderAgentDash,
    evaldash: renderEval,
    frauddash: renderFraudDash,
    admindash: renderAdminDash,
    supervisordash: renderSupervisorDash,
    supqueue: renderSupQueue,
    trainerdash: renderTrainer,
    insights: renderInsights,
    home: buildHome,
    live: ftListMics,
    agentconvo: ftListMics,
  };
  if (R[id])
    try {
      R[id]();
    } catch (e) {
      console.warn("view", id, e);
    }
}
function buildHome() {
  const r = getRole(currentUser.role);
  document.getElementById("homeWelcome").textContent =
    "Welcome, " + currentUser.name + "!";
  document.getElementById("homeRoleDesc").innerHTML =
    '<span class="acc-role ' +
    roleBadgeClass(currentUser.role) +
    '">' +
    r.em +
    " " +
    r.label +
    "</span> — " +
    r.desc;
  const ia = loadInteractions();
  const sc = ia.filter((x) => x.gapPct != null);
  const avg = sc.length
    ? Math.round(sc.reduce((a, x) => a + x.gapPct, 0) / sc.length)
    : "—";
  document.getElementById("homeStats").innerHTML = [
    ["Interactions", ia.length],
    ["Avg Quality", avg + (avg === "—" ? "" : "%")],
    ["Agents", loadAgents().length],
    ["Users", loadUsers().length],
  ]
    .map(
      (s) =>
        '<div class="stat"><div class="n">' +
        s[1] +
        '</div><div class="l">' +
        s[0] +
        "</div></div>",
    )
    .join("");
  const acts = [];
  const q = [
    ["live", "🎙️ Start a call"],
    ["agentconvo", "🎬 Live agent convo"],
    ["evaldash", "✅ Review queue"],
    ["insights", "📈 Insights"],
    ["supqueue", "📥 Eval inbox"],
    ["trainerdash", "🧑‍🏫 Enrollments"],
    ["batch", "📤 Batch upload"],
    ["access", "🔐 Manage access"],
    ["audit", "🧾 Audit log"],
    ["settings", "⚙️ Configure AI"],
  ];
  q.forEach(([v, l]) => {
    if (can(v))
      acts.push(
        '<button class="btn ghost" onclick="showView(\'' +
          v +
          "')\">" +
          l +
          "</button>",
      );
  });
  document.getElementById("homeActions").innerHTML = acts.join("");
}
