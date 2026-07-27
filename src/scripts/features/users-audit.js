function validatePassword(password) {
  const rules = [
    {
      valid: password.length > 8,
      message: "Password must have more than 8 characters.",
    },
    {
      valid: /[A-Z]/.test(password),
      message: "Password must include an uppercase letter.",
    },
    {
      valid: /[a-z]/.test(password),
      message: "Password must include a lowercase letter.",
    },
    {
      valid: /\d/.test(password),
      message: "Password must include a number.",
    },
    {
      valid: /[^A-Za-z0-9]/.test(password),
      message: "Password must include a special character.",
    },
  ];

  const failedRule = rules.find((rule) => !rule.valid);
  return failedRule ? failedRule.message : "";
}

function saveUser() {
  const u = document.getElementById("uUser").value.trim().toLowerCase();
  const name = document.getElementById("uName").value.trim();
  const pass = document.getElementById("uPass").value;
  const role = document.getElementById("uRole").value;
  const emp = document.getElementById("uEmp").value.trim();
  const status = document.getElementById("uStatus").value;
  const msg = document.getElementById("uMsg");

  if (!u || !name || !pass) {
    msg.style.color = "var(--red)";
    msg.textContent = "⚠️ Username, name & password required.";
    return;
  }

  const passwordError = validatePassword(pass);

  if (passwordError) {
    msg.style.color = "var(--red)";
    msg.textContent = "⚠️ " + passwordError;
    return;
  }

  const arr = loadUsers();
  const i = arr.findIndex((x) => x.user === u);
  const rec = { user: u, name, pass, role, emp, status };

  if (i >= 0) arr[i] = rec;
  else arr.push(rec);

  saveUsers(arr);
  clearUserForm();

  msg.style.color = "var(--green)";
  msg.textContent = "✅ Saved " + name + ".";

  renderUsers();
  fillSwitchUser();
  logAudit("User saved", u + " as " + role, "user");

  setTimeout(() => (msg.textContent = ""), 3000);
}

function clearUserForm() {
  ["uUser", "uName", "uPass", "uEmp"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
}
function renderUsers() {
  const f = (document.getElementById("uSearch").value || "").toLowerCase();
  const arr = loadUsers();
  const tbl = document.getElementById("uTable");
  while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("uCount").textContent = arr.length;
  arr
    .filter((u) => (u.user + u.name + u.role + u.emp).toLowerCase().includes(f))
    .forEach((u) => {
      const r = tbl.insertRow(-1);
      r.innerHTML =
        "<td>" +
        u.user +
        "</td><td>" +
        u.name +
        '</td><td><span class="acc-role ' +
        u.role +
        '">' +
        ROLES[u.role].em +
        " " +
        ROLES[u.role].label +
        "</span></td><td>" +
        (u.emp || "—") +
        "</td><td>" +
        (u.status === "active" ? "🟢 Active" : "⛔ Disabled") +
        '</td><td><button style="font-size:11px;color:var(--teal);background:none;border:none;cursor:pointer" onclick="dmOpen(\'' +
        u.user +
        '\')">💬</button> <button style="font-size:11px;color:var(--blue);background:none;border:none;cursor:pointer" onclick="editUser(\'' +
        u.user +
        '\')">✏️</button> <button style="font-size:11px;color:var(--red);background:none;border:none;cursor:pointer" onclick="delUser(\'' +
        u.user +
        "')\">🗑</button></td>";
    });
}
function editUser(user) {
  const u = loadUsers().find((x) => x.user === user);
  if (!u) return;
  document.getElementById("uUser").value = u.user;
  document.getElementById("uName").value = u.name;
  document.getElementById("uPass").value = u.pass;
  document.getElementById("uRole").value = u.role;
  document.getElementById("uEmp").value = u.emp || "";
  document.getElementById("uStatus").value = u.status;
}
function delUser(user) {
  if (user === currentUser.user) {
    alert("Can't delete your own account.");
    return;
  }
  if (!confirm("Delete " + user + "?")) return;
  saveUsers(loadUsers().filter((x) => x.user !== user));
  renderUsers();
  fillSwitchUser();
  logAudit("User deleted", user, "user");
}
function exportUsers() {
  let out = "Username,Name,Role,Employee #,Status\n";
  loadUsers().forEach(
    (u) =>
      (out +=
        [u.user, u.name, u.role, u.emp, u.status].map(csvEsc).join(",") + "\n"),
  );
  dl(out, "FANTASTIC_users.csv", "text/csv");
  logAudit("Exported users", "", "export");
}
function importUsers(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    if (rows.length < 2) return;
    const arr = loadUsers();
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      const [user, name, role, emp, status] = rows[i];
      if (!user) continue;
      const rec = {
        user: user.toLowerCase(),
        name: name || user,
        pass: "changeme",
        role: ROLES[role] ? role : "agent",
        emp: emp || "",
        status: status || "active",
      };
      const j = arr.findIndex((x) => x.user === rec.user);
      if (j >= 0) {
        rec.pass = arr[j].pass;
        arr[j] = rec;
      } else arr.push(rec);
      n++;
    }
    saveUsers(arr);
    renderUsers();
    fillSwitchUser();
    logAudit("Imported users", n + " rows", "user");
    alert("✅ Imported " + n + " users.");
  };
  r.readAsText(f);
  ev.target.value = "";
}
function renderRoleMatrix() {
  document.getElementById("roleMatrix").innerHTML = Object.entries(ROLES)
    .map(
      ([k, r]) =>
        '<div class="rolecard"><h4><span class="acc-role ' +
        k +
        '">' +
        r.em +
        " " +
        r.label +
        '</span></h4><div class="note" style="margin:4px 0">' +
        r.desc +
        '</div><div class="perm-grid">' +
        r.perms
          .map(
            (p) =>
              '<span class="perm-chip">' + (PERM_LABELS[p] || p) + "</span>",
          )
          .join("") +
        "</div></div>",
    )
    .join("");
}
function loadAudit() {
  return read("ft_audit", []);
}
function saveAudit(a) {
  store("ft_audit", a.slice(0, 2000));
}
function logAudit(action, detail, cat) {
  const arr = loadAudit();
  arr.unshift({
    ts: new Date().toISOString(),
    user: currentUser ? currentUser.user : "system",
    role: currentUser ? currentUser.role : "—",
    action: action || "",
    detail: detail || "",
    cat: cat || "general",
  });
  saveAudit(arr);
  const badge = document.getElementById("auditTabCount");
  if (badge) {
    badge.textContent = arr.length;
    badge.classList.remove("hidden");
  }
  if (!document.getElementById("audit")?.classList.contains("hidden"))
    renderAudit();
}
const AUDIT_CAT_LABEL = {
  auth: "🔑 Auth",
  user: "👤 User",
  agent: "👥 Agent",
  config: "⚙️ Config",
  data: "🗂️ Data",
  export: "⬇️ Export",
  general: "•",
};
function renderAudit() {
  const arr = loadAudit();
  const cat = (document.getElementById("auditCat") || {}).value || "all";
  const f = (
    (document.getElementById("auditSearch") || {}).value || ""
  ).toLowerCase();
  const tbl = document.getElementById("auditTable");
  if (!tbl) return;
  while (tbl.rows.length > 1) tbl.deleteRow(1);
  const shown = arr.filter(
    (a) =>
      (cat === "all" || a.cat === cat) &&
      (a.user + a.action + a.detail + a.role).toLowerCase().includes(f),
  );
  document.getElementById("auditEmpty").style.display = arr.length
    ? "none"
    : "block";
  shown.slice(0, 500).forEach((a) => {
    const r = tbl.insertRow(-1);
    r.innerHTML =
      "<td>" +
      new Date(a.ts).toLocaleString() +
      "</td><td><b>" +
      a.user +
      '</b></td><td><span class="acc-role ' +
      (a.role || "agent") +
      '">' +
      (a.role || "—") +
      "</span></td><td>" +
      (AUDIT_CAT_LABEL[a.cat] || a.cat) +
      "</td><td>" +
      a.action +
      "</td><td>" +
      (a.detail || "") +
      "</td>";
  });
  const k = document.getElementById("auditKpis");
  const today = new Date().toDateString();
  const byCat = {};
  arr.forEach((a) => (byCat[a.cat] = (byCat[a.cat] || 0) + 1));
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  k.innerHTML =
    '<div class="stat"><div class="n">' +
    arr.length +
    '</div><div class="l">Total Events</div></div><div class="stat"><div class="n">' +
    arr.filter((a) => new Date(a.ts).toDateString() === today).length +
    '</div><div class="l">Today</div></div><div class="stat"><div class="n">' +
    new Set(arr.map((a) => a.user)).size +
    '</div><div class="l">Distinct Users</div></div><div class="stat"><div class="n" style="font-size:18px">' +
    (topCat ? AUDIT_CAT_LABEL[topCat[0]] || topCat[0] : "—") +
    '</div><div class="l">Top Category</div></div>';
}
function exportAudit() {
  const arr = loadAudit();
  let out = "Timestamp,User,Role,Category,Action,Detail\n";
  arr.forEach(
    (a) =>
      (out +=
        [a.ts, a.user, a.role, a.cat, a.action, a.detail]
          .map(csvEsc)
          .join(",") + "\n"),
  );
  dl(out, "FANTASTIC_audit_log.csv", "text/csv");
  logAudit("Exported audit log", arr.length + " rows", "export");
}
function clearAudit() {
  if (!confirm("Clear the ENTIRE audit log?")) return;
  localStorage.removeItem("ft_audit");
  renderAudit();
}
