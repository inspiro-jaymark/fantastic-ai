function loadNotif() {
  return read("ft_notif", []);
}
function saveNotif(a) {
  store("ft_notif", a);
}
function notify(toRole, toUser, msg, cat) {
  const n = loadNotif();
  n.unshift({
    id: "N" + Date.now() + Math.floor(Math.random() * 999),
    toRole,
    toUser: toUser || "",
    msg,
    cat: cat || "info",
    ts: new Date().toISOString(),
    read: false,
  });
  saveNotif(n);
  refreshBell();
}
function myNotifs() {
  const r = currentUser ? currentUser.role : "";
  const u = currentUser ? currentUser.user : "";
  return loadNotif().filter(
    (n) =>
      n.toRole === r ||
      roleReceives(r, n.toRole) ||
      (n.toUser && n.toUser === u),
  );
}
function refreshBell() {
  const c = document.getElementById("ftBellCount");
  if (!c) return;
  const un = myNotifs().filter((n) => !n.read).length;
  c.textContent = un;
  c.classList.toggle("hidden", un === 0);
  const ic = document.getElementById("supInboxCount");
  if (ic) {
    const pend = loadEvals().filter((e) => e.status === "sent").length;
    ic.textContent = pend;
    ic.classList.toggle("hidden", pend === 0);
  }
}
function toggleNotif() {
  const p = document.getElementById("ftNotifPanel");
  if (!p) return;
  p.classList.toggle("hidden");
  document.getElementById("ftDMPanel").classList.add("hidden");
  if (!p.classList.contains("hidden")) renderNotif();
}
window.toggleNotif = toggleNotif;
function renderNotif() {
  const p = document.getElementById("ftNotifPanel");
  const ns = myNotifs();
  p.innerHTML =
    '<div class="ph"><b>🔔 Notifications</b><button class="btn ghost u-btn-tiny" onclick="markAllRead()">Mark all read</button></div><div class="pb">' +
    (ns.length
      ? ns
          .slice(0, 40)
          .map(
            (n) =>
              '<div class="lib-card u-mb-8' +
              (n.read ? " is-read-muted" : "") +
              '"><div class="u-fs-12-5">' +
              esc(n.msg) +
              '</div><div class="note u-mt-4">' +
              new Date(n.ts).toLocaleString() +
              "</div></div>",
          )
          .join("")
      : '<div class="note">No notifications.</div>') +
    "</div>";
}
function markAllRead() {
  const all = loadNotif();
  const r = currentUser.role,
    u = currentUser.user;
  all.forEach((n) => {
    if (n.toRole === r || roleReceives(r, n.toRole) || n.toUser === u)
      n.read = true;
  });
  saveNotif(all);
  renderNotif();
  refreshBell();
}
window.markAllRead = markAllRead;
function loadDM() {
  return read("ft_dm", []);
}
function saveDM(a) {
  store("ft_dm", a);
}
function tkey(a, b) {
  return [a, b].sort().join("::");
}
function dmUnread() {
  const me = currentUser ? currentUser.user : "";
  return loadDM().filter((m) => m.to === me && !m.read).length;
}
function refreshDMBadge() {
  const c = document.getElementById("ftDMCount");
  if (!c) return;
  const u = dmUnread();
  c.textContent = u;
  c.classList.toggle("hidden", u === 0);
}
let _dmOpen = null;
function toggleDM() {
  const p = document.getElementById("ftDMPanel");
  if (!p) return;
  p.classList.toggle("hidden");
  document.getElementById("ftNotifPanel").classList.add("hidden");
  if (!p.classList.contains("hidden")) dmList();
}
window.toggleDM = toggleDM;
function dmList() {
  const p = document.getElementById("ftDMPanel");
  _dmOpen = null;
  const me = currentUser.user;
  const msgs = loadDM().filter((m) => m.from === me || m.to === me);
  const map = {};
  msgs.forEach((m) => {
    const o = m.from === me ? m.to : m.from;
    (map[o] = map[o] || []).push(m);
  });
  const users = loadUsers().filter(
    (u) => u.user !== me && u.status === "active",
  );
  const rows = Object.keys(map)
    .map((o) => {
      const arr = map[o].sort((a, b) => new Date(a.ts) - new Date(b.ts));
      const last = arr[arr.length - 1];
      const u = loadUsers().find((x) => x.user === o) || {
        name: o,
        role: "agent",
      };
      return {
        o,
        name: u.name,
        role: u.role,
        last,
        un: arr.filter((m) => m.to === me && !m.read).length,
      };
    })
    .sort((a, b) => new Date(b.last.ts) - new Date(a.last.ts));
  p.innerHTML =
	    '<div class="ph"><b>💬 Messages</b><select class="sel u-max-w-160 u-fs-12" id="ftDMNew" aria-label="Start a new direct message"><option value="">✍️ New…</option>' +
    users
      .map(
        (u) =>
          '<option value="' +
          u.user +
          '">' +
          getRole(u.role).em +
          " " +
          esc(u.name) +
          "</option>",
      )
      .join("") +
    '</select></div><div class="pb" id="ftDMThreads">' +
    (rows.length
      ? rows
          .map(
            (r) =>
              '<div class="lib-card u-mb-8 u-cursor-pointer" onclick="dmOpen(\'' +
              r.o +
              '\')"><div class="lib-head"><div><b>' +
              getRole(r.role).em +
              " " +
              esc(r.name) +
              "</b>" +
              (r.un ? ' <span class="pill-count">' + r.un + "</span>" : "") +
              '<div class="note u-mt-2">' +
              esc((r.last.body || "").slice(0, 54)) +
              '</div></div><div class="note">' +
              new Date(r.last.ts).toLocaleTimeString() +
              "</div></div></div>",
          )
          .join("")
      : '<div class="note">No conversations yet.</div>') +
    "</div>";
  const nw = document.getElementById("ftDMNew");
  if (nw)
    nw.onchange = function () {
      if (this.value) dmOpen(this.value);
    };
  refreshDMBadge();
}
function dmOpen(other) {
  const p = document.getElementById("ftDMPanel");
  p.classList.remove("hidden");
  document.getElementById("ftNotifPanel").classList.add("hidden");
  _dmOpen = other;
  const me = currentUser.user;
  const all = loadDM();
  let ch = false;
  all.forEach((m) => {
    if (m.from === other && m.to === me && !m.read) {
      m.read = true;
      ch = true;
    }
  });
  if (ch) saveDM(all);
  const u = loadUsers().find((x) => x.user === other) || {
    name: other,
    role: "agent",
  };
  const conv = all
    .filter((m) => tkey(m.from, m.to) === tkey(me, other))
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  p.innerHTML =
    '<div class="ph"><b>' +
    getRole(u.role).em +
    " " +
    esc(u.name) +
    '</b><button class="btn ghost u-btn-tiny" onclick="dmList()">← Back</button></div><div class="dmwrap"><div class="dmbody" id="ftDMBody">' +
    (conv.length
      ? conv
          .map(
            (m) =>
              '<div class="msg u-max-w-88p ' +
              (m.from === me ? "ai" : "cust") +
              '"><div class="who">' +
              (m.from === me ? "You" : esc(u.name)) +
              '</div><span class="txt">' +
              esc(m.body) +
              '</span><div class="note u-muted-timestamp">' +
              new Date(m.ts).toLocaleString() +
              "</div></div>",
          )
          .join("")
      : '<div class="note u-text-center u-mt-20">Say hello 👋</div>') +
	    '</div><div class="dminput"><input class="inp u-flex-1" id="ftDMInput" aria-label="Direct message text" placeholder="Type a message…" onkeydown="if(event.key===\'Enter\'){event.preventDefault();dmSend();}"><button class="btn" onclick="dmSend()">Send</button></div></div>';
  const b = document.getElementById("ftDMBody");
  if (b) b.scrollTop = b.scrollHeight;
  const inp = document.getElementById("ftDMInput");
  if (inp) inp.focus();
  refreshDMBadge();
}
window.dmOpen = dmOpen;
window.dmList = dmList;
function dmSend() {
  const other = _dmOpen;
  if (!other) return;
  const inp = document.getElementById("ftDMInput");
  const txt = (inp.value || "").trim();
  if (!txt) return;
  const all = loadDM();
  all.push({
    id: "DM" + Date.now() + Math.floor(Math.random() * 999),
    from: currentUser.user,
    fromName: currentUser.name,
    to: other,
    body: txt,
    ts: new Date().toISOString(),
    read: false,
  });
  saveDM(all);
  inp.value = "";
  const u = loadUsers().find((x) => x.user === other);
  notify(
    u ? u.role : "agent",
    other,
    "💬 New message from " + currentUser.name + ": " + txt.slice(0, 50),
    "dm",
  );
  logAudit("Direct message", "→ " + other, "data");
  dmOpen(other);
}
window.dmSend = dmSend;
function loadCoach() {
  return read("ft_coaching", []);
}
function saveCoach(a) {
  store("ft_coaching", a);
}
function loadEvals() {
  return read("ft_evalQueue", []);
}
function saveEvals(a) {
  store("ft_evalQueue", a);
}
function loadEnroll() {
  return read("ft_enrollments", []);
}
function saveEnroll(a) {
  store("ft_enrollments", a);
}
const DEFAULT_TOPICS = [
  {
    id: "empathy",
    name: "Empathy & Apology",
    md: "# Empathy & Apology\n\n- Apologize sincerely when the customer is upset\n- Use empathy statements\n- Mirror the customer\u2019s language",
  },
  {
    id: "verify",
    name: "Identity Verification",
    md: "# Identity Verification\n\n- Verify before account changes\n- Never collect full card/OTP over voice",
  },
  {
    id: "billing",
    name: "Billing & Disputes",
    md: "# Billing & Disputes\n\n- Itemize charges\n- Explain prorating\n- File dispute with reference #",
  },
  {
    id: "closing",
    name: "Call Control & Closing",
    md: "# Call Control & Closing\n\n- Recap resolution\n- Warm branded closing",
  },
  {
    id: "compliance",
    name: "Compliance & PCI",
    md: "# Compliance & PCI (RA 10173)\n\n- Mask sensitive data\n- Secure capture only",
  },
];
function loadTopics() {
  const t = read("ft_topics", null);
  if (t && t.length) return t;
  store("ft_topics", DEFAULT_TOPICS);
  return DEFAULT_TOPICS.slice();
}
function saveTopics(a) {
  store("ft_topics", a);
}
function topicById(id) {
  return loadTopics().find((t) => t.id === id);
}
