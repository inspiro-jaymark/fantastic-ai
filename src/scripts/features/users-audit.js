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
  const role = normalizeRoleId(document.getElementById("uRole").value);
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
  renderUserRoleOptions("agent");
  document.getElementById("uStatus").value = "active";
}
function renderUserRoleOptions(selected) {
  const sel = document.getElementById("uRole");
  if (!sel) return;
  sel.innerHTML = roleOptionsHtml(normalizeRoleId(selected || sel.value));
}
function renderUsers() {
  renderUserRoleOptions((document.getElementById("uRole") || {}).value);
  const f = (document.getElementById("uSearch").value || "").toLowerCase();
  const arr = loadUsers();
  const tbl = document.getElementById("uTable");
  while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("uCount").textContent = arr.length;
  arr
    .filter((u) => (u.user + u.name + u.role + u.emp).toLowerCase().includes(f))
    .forEach((u) => {
      const role = getRole(u.role);
      const r = tbl.insertRow(-1);
      r.innerHTML =
        "<td>" +
        esc(u.user) +
        "</td><td>" +
        esc(u.name) +
        '</td><td><span class="acc-role ' +
        roleBadgeClass(u.role) +
        '">' +
        role.em +
        " " +
        esc(role.label) +
        "</span></td><td>" +
        esc(u.emp || "—") +
        "</td><td>" +
        (u.status === "active" ? "🟢 Active" : "⛔ Disabled") +
        '</td><td><button class="u-action-link teal" onclick="dmOpen(\'' +
        u.user +
        '\')">💬</button> <button class="u-action-link blue" onclick="editUser(\'' +
        u.user +
        '\')">✏️</button> <button class="u-action-link red" onclick="delUser(\'' +
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
  renderUserRoleOptions(u.role);
  document.getElementById("uRole").value = u.role;
  document.getElementById("uEmp").value = u.emp || "";
  document.getElementById("uStatus").value = u.status;
}
function delUser(user) {
  if (user === currentUser.user) {
    alert("Can't delete your own account.");
    return;
  }
  appConfirm(
    {
      title: "Delete user?",
      message: "Delete user " + user + "? This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    },
    () => {
      saveUsers(loadUsers().filter((x) => x.user !== user));
      renderUsers();
      fillSwitchUser();
      logAudit("User deleted", user, "user");
    },
  );
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
        role: normalizeRoleId(role, "agent"),
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
let editingRoleId = "";

function setRoleMsg(text, ok) {
  const msg = document.getElementById("roleMsg");
  if (!msg) return;
  msg.style.color = ok ? "var(--green)" : "var(--red)";
  msg.textContent = text || "";
}

function selectedRolePerms() {
  return [
    ...document.querySelectorAll("#rolePerms input[type='checkbox']:checked"),
  ].map((c) => c.value);
}

function renderRoleHomeOptions(perms, selected) {
  const sel = document.getElementById("roleHome");
  if (!sel) return;

  const allowed = normalizePerms(perms, selected);
  const current = allowed.includes(selected) ? selected : allowed[0] || "home";
  sel.innerHTML = NAV_ITEMS.filter(([id]) => allowed.includes(id))
    .map(
      ([id, label]) =>
        '<option value="' +
        id +
        '"' +
        (id === current ? " selected" : "") +
        ">" +
        label +
        "</option>",
    )
    .join("");
}

function syncRoleHomeOptions() {
  const current = (document.getElementById("roleHome") || {}).value || "home";
  renderRoleHomeOptions(selectedRolePerms(), current);
}

function renderRolePermOptions(perms) {
  const wrap = document.getElementById("rolePerms");
  if (!wrap) return;

  const selected = new Set(normalizePerms(perms, "home"));
  wrap.innerHTML = NAV_ITEMS.map(
    ([id, label]) =>
      '<label class="role-perm-check"><input type="checkbox" value="' +
      id +
      '"' +
      (selected.has(id) ? " checked" : "") +
      (id === "home" ? " disabled" : "") +
      "> <span>" +
      label +
      "</span></label>",
  ).join("");

  wrap.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.addEventListener("change", syncRoleHomeOptions);
  });
  syncRoleHomeOptions();
}

function renderRoleBaseOptions(selected) {
  const sel = document.getElementById("roleBase");
  if (!sel) return;
  sel.innerHTML = FIXED_ROLE_IDS.map((id) => {
    const r = getRole(id);
    return (
      '<option value="' +
      id +
      '"' +
      (id === selected ? " selected" : "") +
      ">" +
      r.em +
      " " +
      esc(r.label) +
      "</option>"
    );
  }).join("");
}

function loadRoleBaseTemplate() {
  const base = (document.getElementById("roleBase") || {}).value || "agent";
  const r = getRole(base);
  const desc = document.getElementById("roleDesc");

  if (desc && !editingRoleId) {
    desc.value = "Custom role based on " + r.label + " access.";
  }

  renderRolePermOptions(r.perms);
  renderRoleHomeOptions(r.perms, r.home);
  setRoleMsg("", true);
}

function resetCustomRoleForm() {
  editingRoleId = "";
  const name = document.getElementById("roleName");
  const desc = document.getElementById("roleDesc");
  const badge = document.getElementById("roleEditBadge");
  const del = document.getElementById("roleDeleteBtn");

  if (name) name.value = "";
  if (desc) desc.value = "";
  if (badge) badge.textContent = "New";
  if (del) del.classList.add("hidden");

  renderRoleBaseOptions("agent");
  loadRoleBaseTemplate();
}

function saveCustomRole() {
  const name = (document.getElementById("roleName") || {}).value.trim();
  const base = (document.getElementById("roleBase") || {}).value || "agent";
  const home = (document.getElementById("roleHome") || {}).value || "home";
  const desc = (document.getElementById("roleDesc") || {}).value.trim();
  const perms = normalizePerms(selectedRolePerms(), home);
  const id = editingRoleId || customRoleIdFromName(name);

  if (!name) {
    setRoleMsg("⚠️ Role name is required.", false);
    return;
  }
  if (!id || FIXED_ROLES[id]) {
    setRoleMsg("⚠️ Use a custom role name.", false);
    return;
  }
  if (!perms.length) {
    setRoleMsg("⚠️ Pick at least one permission.", false);
    return;
  }

  const roles = loadCustomRoles();
  const existing = roles.findIndex((r) => r.id === id);
  if (!editingRoleId && existing >= 0) {
    setRoleMsg("⚠️ That custom role already exists. Edit it or rename it.", false);
    return;
  }

  const rec = {
    id,
    label: name,
    base,
    home,
    perms,
    desc,
  };

  if (existing >= 0) roles[existing] = rec;
  else roles.push(rec);

  saveCustomRoles(roles);
  renderUserRoleOptions((document.getElementById("uRole") || {}).value);
  renderRoleMatrix();
  if (currentUser && currentUser.role === id) applyRBAC();
  setRoleMsg("✅ Saved custom role.", true);
  logAudit("Custom role saved", name, "user");
}

function editCustomRole(id) {
  const r = getRole(id);
  if (!r.custom) return;

  editingRoleId = id;
  document.getElementById("roleName").value = r.label;
  document.getElementById("roleDesc").value = r.desc || "";
  renderRoleBaseOptions(r.base);
  document.getElementById("roleBase").value = r.base;
  renderRolePermOptions(r.perms);
  renderRoleHomeOptions(r.perms, r.home);
  document.getElementById("roleHome").value = r.home;
  document.getElementById("roleEditBadge").textContent = "Editing";
  document.getElementById("roleDeleteBtn").classList.remove("hidden");
  setRoleMsg("", true);
}

function deleteCustomRole() {
  if (!editingRoleId) return;
  const role = getRole(editingRoleId);
  if (!role.custom) return;

  if (loadUsers().some((u) => u.role === editingRoleId)) {
    setRoleMsg("⚠️ Move users off this role before deleting it.", false);
    return;
  }

  appConfirm(
    {
      title: "Delete custom role?",
      message: "Delete custom role " + role.label + "? This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    },
    () => {
      saveCustomRoles(loadCustomRoles().filter((r) => r.id !== editingRoleId));
      logAudit("Custom role deleted", role.label, "user");
      resetCustomRoleForm();
      renderUsers();
      renderRoleMatrix();
    },
  );
}

function renderRoleMatrix() {
  const matrix = document.getElementById("roleMatrix");
  if (!matrix) return;
  if (!(document.getElementById("roleBase") || {}).options?.length) {
    resetCustomRoleForm();
  }

  matrix.innerHTML = Object.entries(ROLES)
    .map(
      ([k, r]) =>
        '<div class="rolecard"><div class="rolecard-head"><h4><span class="acc-role ' +
        roleBadgeClass(k) +
        '">' +
        r.em +
        " " +
        esc(r.label) +
        '</span></h4><span class="perm-chip">' +
        (r.custom ? "Custom" : "Fixed") +
        "</span></div><div class=\"note u-m-4-0\">" +
        esc(r.desc) +
        (r.custom ? " Base: " + esc(getRole(r.base).label) + "." : "") +
        '</div><div class="perm-grid">' +
        r.perms
          .map(
            (p) =>
              '<span class="perm-chip">' + (PERM_LABELS[p] || p) + "</span>",
          )
          .join("") +
        '</div><div class="row u-mt-8">' +
        (r.custom
          ? '<button class="btn ghost u-btn-small" onclick="editCustomRole(\'' +
            k +
            "')\">✏️ Edit</button>"
          : '<span class="note u-m-0">Locked template</span>') +
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
      esc(a.user) +
      '</b></td><td><span class="acc-role ' +
      roleBadgeClass(a.role || "agent") +
      '">' +
      esc(a.role && ROLES[a.role] ? getRole(a.role).label : a.role || "—") +
      "</span></td><td>" +
      (AUDIT_CAT_LABEL[a.cat] || a.cat) +
      "</td><td>" +
      esc(a.action) +
      "</td><td>" +
      esc(a.detail || "") +
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
    '</div><div class="l">Distinct Users</div></div><div class="stat"><div class="n u-section-title">' +
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
  appConfirm(
    {
      title: "Clear audit log?",
      message: "Clear the entire audit log? This cannot be undone.",
      confirmText: "Clear",
      danger: true,
    },
    () => {
      localStorage.removeItem("ft_audit");
      renderAudit();
    },
  );
}
