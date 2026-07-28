const FIXED_ROLES = {
  agent: {
    label: "Agent",
    em: "🎧",
    home: "agentdash",
    perms: ["home", "live", "agentconvo", "kb", "agentdash", "library"],
    desc: "Handle calls, get live AI script guidance, view coaching notes, and track quality.",
  },
  evaluator: {
    label: "Evaluator",
    em: "✅",
    home: "evaldash",
    perms: [
      "home",
      "agentconvo",
      "batch",
      "kb",
      "leader",
      "team",
      "library",
      "evaldash",
      "insights",
    ],
    desc: "Review & score interactions, auto gap analysis, send evals to Supervisor, recommend enrollment, view insights.",
  },
  supervisor: {
    label: "Supervisor",
    em: "🧑‍✈️",
    home: "supervisordash",
    perms: [
      "home",
      "supervisordash",
      "supqueue",
      "sup",
      "live",
      "agentconvo",
      "library",
      "team",
      "leader",
      "frauddash",
      "kb",
      "insights",
    ],
    desc: "Receive QA evals, add feedback, notify QA, coach agents, monitor teams, and read insights.",
  },
  trainer: {
    label: "Trainer",
    em: "🧑‍🏫",
    home: "trainerdash",
    perms: ["home", "trainerdash", "kb", "library", "leader", "insights"],
    desc: "Manage training topics (Markdown), receive enrollment recommendations, and coach agents.",
  },
  fraud: {
    label: "Fraud Analyst",
    em: "🛡️",
    home: "frauddash",
    perms: ["home", "fraud", "sup", "library", "frauddash", "kb"],
    desc: "Monitor fraud signals, manage rules, review high-risk interactions.",
  },
  admin: {
    label: "Admin",
    em: "👑",
    home: "admindash",
    perms: [
      "home",
      "live",
      "agentconvo",
      "batch",
      "agentdb",
      "team",
      "kb",
      "fraud",
      "sup",
      "leader",
      "library",
      "settings",
      "access",
      "audit",
      "admindash",
      "evaldash",
      "frauddash",
      "agentdash",
      "supervisordash",
      "supqueue",
      "trainerdash",
      "insights",
    ],
    desc: "Full access to every dashboard, config, users & audit.",
  },
};
const FIXED_ROLE_IDS = Object.keys(FIXED_ROLES);
const CUSTOM_ROLE_STORE_KEY = "ft_custom_roles";
const CUSTOM_ROLE_PREFIX = "custom_";
const ROLES = {};
const ROLE_ROUTE_PERMS = {
  agent: ["agentdash"],
  evaluator: ["evaldash"],
  supervisor: ["supervisordash", "supqueue", "sup"],
  trainer: ["trainerdash"],
  fraud: ["frauddash", "fraud"],
  admin: ["admindash", "access"],
};
const PERM_LABELS = {
  home: "🏠 Home",
  live: "🎙️ Live Voice",
  agentconvo: "🎬 Agent Convo",
  batch: "📤 Batch",
  agentdb: "👥 Agent DB",
  team: "🏢 Team",
  kb: "📚 KB",
  fraud: "🛡️ Fraud",
  sup: "🎧 Sup Live",
  leader: "🏆 Leaderboard",
  library: "📁 Interactions",
  settings: "⚙️ Setup",
  access: "🔐 Access",
  audit: "🧾 Audit",
  admindash: "👑 Admin",
  evaldash: "✅ Evaluator",
  frauddash: "🛡️ Fraud Dash",
  agentdash: "🎧 Agent",
  supervisordash: "🧑‍✈️ Supervisor",
  supqueue: "📥 Eval Inbox",
  trainerdash: "🧑‍🏫 Trainer",
  insights: "📈 Insights",
};
const NAV_ITEMS = [
  ["home", "🏠 Home"],
  ["agentdash", "🎧 My Dashboard"],
  ["evaldash", "✅ Evaluator"],
  ["supervisordash", "🧑‍✈️ Supervisor"],
  ["supqueue", "📥 Eval Inbox"],
  ["trainerdash", "🧑‍🏫 Trainer"],
  ["frauddash", "🛡️ Fraud Analyst"],
  ["admindash", "👑 Admin"],
  ["insights", "📈 Insights"],
  ["live", "🎙️ Live Voice"],
  ["agentconvo", "🎬 Live Agent Convo"],
  ["batch", "📤 Batch Upload"],
  ["agentdb", "👥 Agent Database"],
  ["team", "🏢 Team Dashboard"],
  ["kb", "📚 Knowledge Base"],
  ["fraud", "🛡️ Fraud"],
  ["sup", "🎧 Supervisor Live"],
  ["leader", "🏆 Leaderboard"],
  ["library", "📁 Interactions"],
  ["access", "🔐 Access Mgmt"],
  ["audit", "🧾 Audit Log"],
  ["settings", "⚙️ Setup"],
];

function cloneRoleDef(r) {
  return {
    label: r.label || "Role",
    em: r.em || "✨",
    home: r.home || "home",
    perms: [...new Set(Array.isArray(r.perms) ? r.perms : ["home"])],
    desc: r.desc || "",
    base: r.base || "",
    custom: !!r.custom,
  };
}

function allPermIds() {
  return NAV_ITEMS.map(([id]) => id);
}

function normalizePerms(perms, home) {
  const valid = new Set(allPermIds());
  const out = [];

  (Array.isArray(perms) ? perms : []).forEach((p) => {
    if (valid.has(p) && !out.includes(p)) out.push(p);
  });

  if (!out.includes("home")) out.unshift("home");
  if (home && valid.has(home) && !out.includes(home)) out.push(home);

  return out;
}

function customRoleIdFromName(name) {
  const slug = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return slug ? CUSTOM_ROLE_PREFIX + slug : "";
}

function normalizeCustomRole(raw) {
  if (!raw || typeof raw !== "object") return null;

  const label = (raw.label || "").trim();
  const id = raw.id || customRoleIdFromName(label);
  if (!label || !id || FIXED_ROLES[id]) return null;

  const base = FIXED_ROLES[raw.base] ? raw.base : "agent";
  const baseDef = FIXED_ROLES[base];
  const home = allPermIds().includes(raw.home) ? raw.home : baseDef.home;
  const perms = normalizePerms(raw.perms, home);

  return {
    id,
    label,
    em: baseDef.em,
    base,
    home: perms.includes(home) ? home : "home",
    perms,
    desc:
      (raw.desc || "").trim() ||
      "Custom role based on " + baseDef.label + " access.",
    custom: true,
  };
}

function loadCustomRoles() {
  const roles = read(CUSTOM_ROLE_STORE_KEY, []);
  if (!Array.isArray(roles)) return [];
  return roles.map(normalizeCustomRole).filter(Boolean);
}

function saveCustomRoles(roles) {
  const normalized = (Array.isArray(roles) ? roles : [])
    .map(normalizeCustomRole)
    .filter(Boolean);
  store(CUSTOM_ROLE_STORE_KEY, normalized);
  refreshRoles();
  return normalized;
}

function refreshRoles() {
  Object.keys(ROLES).forEach((id) => delete ROLES[id]);

  Object.entries(FIXED_ROLES).forEach(([id, role]) => {
    ROLES[id] = {
      ...cloneRoleDef(role),
      id,
      base: id,
      custom: false,
    };
  });

  loadCustomRoles().forEach((role) => {
    ROLES[role.id] = role;
  });
}

function getRole(id) {
  return ROLES[id] || ROLES.agent;
}

function normalizeRoleId(id, fallback) {
  return ROLES[id] ? id : fallback || "agent";
}

function roleBase(id) {
  const r = getRole(id);
  return r.base || (FIXED_ROLES[id] ? id : "agent");
}

function roleActsAs(id, base) {
  return id === base || roleBase(id) === base;
}

function roleReceives(id, targetRole) {
  if (!targetRole) return false;
  if (roleActsAs(id, targetRole)) return true;

  const routePerms = ROLE_ROUTE_PERMS[targetRole] || [];
  const role = getRole(id);
  return routePerms.some((p) => role.perms.includes(p));
}

function roleBadgeClass(id) {
  return FIXED_ROLES[id] ? id : "custom";
}

function roleDisplay(id) {
  const r = getRole(id);
  return r.em + " " + r.label;
}

function roleOptionsHtml(selected) {
  return Object.entries(ROLES)
    .map(([id, r]) => {
      const baseNote = r.custom ? " · custom" : "";
      return (
        '<option value="' +
        id +
        '"' +
        (id === selected ? " selected" : "") +
        ">" +
        r.em +
        " " +
        esc(r.label) +
        baseNote +
        "</option>"
      );
    })
    .join("");
}

refreshRoles();
