function loadAgents() {
  return read("ft_agents", []);
}
function saveAgents(a) {
  store("ft_agents", a);
}
function addOption(sel, label) {
  const v = prompt("Add new " + label + ":");
  if (!v) return;
  const o = document.createElement("option");
  o.value = v;
  o.textContent = v;
  sel.insertBefore(o, sel.querySelector('option[value="__add"]'));
  sel.value = v;
}
["agSite", "agBU", "agSection", "agSub"].forEach((id) => {
  const el = document.getElementById(id);
  if (el)
    el.addEventListener("change", function () {
      if (this.value === "__add") {
        this.value = this.options[0].value;
        addOption(this, id);
      }
    });
});
function saveAgent() {
  const emp = document.getElementById("agEmp").value.trim();
  const first = document.getElementById("agFirst").value.trim();
  const last = document.getElementById("agLast").value.trim();
  const msg = document.getElementById("agMsg");
  // updated requires agent to have employe #, firstname, lastname
  const requiredFields = [
      { value: emp, message: "Employee # is required." },
    { value: first, message: "First Name is required." },
    { value: last, message: "Last Name is required." },
  ];
  const missingField = requiredFields.find((field) => !field.value);

  if (missingField) {
    msg.style.color = "var(--red)";
    msg.textContent = `⚠️ ${missingField.message}`;
    return;
  }
  // if (!emp || !first || !last) {
  //   msg.style.color = "var(--red)";
  //   msg.textContent = "⚠️ Employee # and First Name required.";
  //   return;
  // }
  const rec = {
    emp,
    first,
    last,
    site: document.getElementById("agSite").value,
    bu: document.getElementById("agBU").value,
    section: document.getElementById("agSection").value,
    sub: document.getElementById("agSub").value,
  };
  const arr = loadAgents();
  const i = arr.findIndex((a) => a.emp === emp);
  if (i >= 0) arr[i] = rec;
  else arr.push(rec);
  saveAgents(arr);
  clearAgentForm();
  msg.style.color = "var(--green)";
  msg.textContent = "✅ Saved.";
  renderAgents();
  populateLbSites();
  logAudit("Agent saved", emp, "agent");
  setTimeout(() => (msg.textContent = ""), 3000);
}
function clearAgentForm() {
  ["agEmp", "agFirst", "agLast"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
}
function renderAgents(f) {
  f = f || document.getElementById("agSearch")?.value || "";
  const arr = loadAgents();
  const tbl = document.getElementById("agTable");
  if (!tbl) return;
  while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("agCount").textContent = arr.length;
  document.getElementById("agEmpty").style.display = arr.length
    ? "none"
    : "block";
  arr
    .filter((a) =>
      (a.emp + a.first + a.last + a.site + a.bu)
        .toLowerCase()
        .includes(f.toLowerCase()),
    )
    .forEach((a) => {
      const r = tbl.insertRow(-1);
      r.innerHTML =
        "<td>" +
        a.emp +
        "</td><td>" +
        a.first +
        " " +
        a.last +
        "</td><td>" +
        a.site +
        "</td><td>" +
        a.bu +
        "</td><td>" +
        a.section +
        "</td><td>" +
        a.sub +
        '</td><td><button class="u-action-link red" onclick="delAgent(\'' +
        a.emp +
        "')\">🗑</button></td>";
    });
}
function delAgent(emp) {
  appConfirm(
    {
      title: "Delete agent?",
      message: "Delete agent " + emp + "? This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    },
    () => {
      saveAgents(loadAgents().filter((a) => a.emp !== emp));
      renderAgents();
      populateLbSites();
      logAudit("Agent deleted", emp, "agent");
    },
  );
}
function findAgent(name, id) {
  const arr = loadAgents();
  if (id) {
    const m = arr.find((a) => a.emp.toLowerCase() === String(id).toLowerCase());
    if (m) return m;
  }
  const nm = (name || "").toLowerCase().trim();
  if (!nm) return null;
  return arr.find(
    (a) =>
      (a.first + " " + a.last).toLowerCase() === nm ||
      a.first.toLowerCase() === nm,
  );
}
const agSearchEl = document.getElementById("agSearch");
if (agSearchEl) agSearchEl.oninput = (e) => renderAgents(e.target.value);
function exportAgents() {
  let out = "Employee #,First Name,Last Name,Site,BU,Section,Sub-section\n";
  loadAgents().forEach(
    (a) =>
      (out +=
        [a.emp, a.first, a.last, a.site, a.bu, a.section, a.sub]
          .map(csvEsc)
          .join(",") + "\n"),
  );
  dl(out, "FANTASTIC_agents.csv", "text/csv");
  logAudit("Exported agents", "", "export");
}
function importAgents(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    const arr = loadAgents();
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      const [emp, first, last, site, bu, section, sub] = rows[i];
      if (!emp) continue;
      const rec = {
        emp,
        first: first || "",
        last: last || "",
        site: site || "Manila",
        bu: bu || "Infocom",
        section: section || "",
        sub: sub || "",
      };
      const j = arr.findIndex((a) => a.emp === emp);
      if (j >= 0) arr[j] = rec;
      else arr.push(rec);
      n++;
    }
    saveAgents(arr);
    renderAgents();
    populateLbSites();
    logAudit("Imported agents", n + " rows", "agent");
    alert("✅ Imported " + n + ".");
  };
  r.readAsText(f);
  ev.target.value = "";
}
function seedAgents() {
  const s = [
    ["EMP-1001", "Juan", "Dela Cruz", "Manila", "Infocom", "PLDT", "Billing"],
    ["EMP-1002", "Maria", "Santos", "Pasig", "JAPAC", "Smart", "Repair"],
    ["EMP-1003", "Jose", "Reyes", "Makati", "International", "PNB", "Prepaid"],
    ["EMP-1004", "Ana", "Lopez", "Dumaguete", "Infocom", "PLDT", "Repair"],
    ["EMP-1005", "Pedro", "Garcia", "Circuit", "Dish", "Smart", "Billing"],
    [
      "EMP-1006",
      "Rosa",
      "Fernandez",
      "Nicaragua",
      "International",
      "PNB",
      "Billing",
    ],
    ["EMP-1007", "Mark", "Villanueva", "Manila", "JAPAC", "Smart", "Prepaid"],
    ["EMP-1008", "Grace", "Torres", "Pasig", "Infocom", "PLDT", "Billing"],
  ];
  const arr = loadAgents();
  s.forEach((x) => {
    if (!arr.find((a) => a.emp === x[0]))
      arr.push({
        emp: x[0],
        first: x[1],
        last: x[2],
        site: x[3],
        bu: x[4],
        section: x[5],
        sub: x[6],
      });
  });
  saveAgents(arr);
  renderAgents();
  populateLbSites();
  logAudit("Loaded sample roster", "", "agent");
  alert("✅ Sample roster loaded.");
}
function loadBatch() {
  return read("ft_batch", []);
}
function saveBatch(a) {
  store("ft_batch", a);
}
function batchLookup() {
  const id = document.getElementById("bAgentId").value.trim();
  const m = document.getElementById("bMatch");
  const ag = findAgent(document.getElementById("bAgent").value.trim(), id);
  if (ag) {
    m.className = "conn ok";
    m.textContent =
      "✅ Matched: " +
      ag.first +
      " " +
      ag.last +
      " · " +
      ag.site +
      " · " +
      ag.bu;
    if (!document.getElementById("bAgent").value)
      document.getElementById("bAgent").value = ag.first + " " + ag.last;
  } else if (id) {
    m.className = "conn wait";
    m.textContent = '⚠️ No match for "' + id + '".';
  } else {
    m.className = "";
    m.textContent = "";
  }
}
function parseConvo(text) {
  return text
    .split(/\||\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const mm = l.match(/^(agent|customer|cust|caller)\s*[:\-]\s*(.*)$/i);
      if (mm) {
        const spk = /^a/i.test(mm[1]) ? "agent" : "customer";
        return {
          speaker: spk,
          text: mm[2],
          who: spk === "agent" ? "ai" : "cust",
        };
      }
      return { speaker: "customer", text: l, who: "cust" };
    });
}
function evalConvoText(raw) {
  const full = raw.toLowerCase();
  let earned = 0,
    total = 0;
  AC_CHECKS.forEach((c) => {
    const w =
      c.id === "resolve"
        ? 25
        : c.id === "verify" || c.id === "compliance"
          ? 20
          : c.id === "empathy"
            ? 15
            : 10;
    total += w;
    let ok =
      c.id === "compliance"
        ? !FRAUD_RULES.slice(0, 3).some((r) => r.test(raw))
        : c.re.test(full);
    if (ok) earned += w;
  });
  return Math.round((earned / total) * 100);
}
function batchProcess(o) {
  const turns = parseConvo(o.convo);
  const raw = turns.map((t) => t.text).join(" ");
  const score = evalConvoText(raw);
  const match = findAgent(o.agent, o.agentId);
  const rec = {
    id: "INT-" + Date.now() + "-" + Math.floor(Math.random() * 999),
    date: new Date().toISOString(),
    mode: "Batch Upload",
    agent: match ? match.first + " " + match.last : o.agent || "Unknown",
    agentId: o.agentId || (match ? match.emp : ""),
    site: match ? match.site : "",
    bu: match ? match.bu : "",
    section: match ? match.section : "",
    sub: match ? match.sub : "",
    matched: !!match,
    file: o.file || "",
    lang: o.lang || "Auto",
    durationSec: 0,
    turns: turns.length,
    sentiment: { pos: 0, neu: turns.length, neg: 0, dom: "Neutral" },
    fraudScore: 0,
    gapPct: score,
    resolved: score >= 70,
    transcript: turns,
  };
  const ia = loadInteractions();
  ia.unshift(rec);
  saveInteractionsArr(ia);
  const ba = loadBatch();
  ba.unshift(rec);
  saveBatch(ba);
  awardPoints(rec.agent, {
    quality: score,
    training: 0,
    tag: "Batch upload",
    agentId: rec.agentId,
  });
  return rec;
}
function batchAddSingle() {
  const convo = document.getElementById("bConvo").value.trim();
  const msg = document.getElementById("bMsg");
  if (!convo) {
    msg.style.color = "var(--red)";
    msg.textContent = "⚠️ Conversation required.";
    return;
  }
  const rec = batchProcess({
    file: document.getElementById("bFile").value.trim(),
    agent: document.getElementById("bAgent").value.trim(),
    agentId: document.getElementById("bAgentId").value.trim(),
    convo,
    lang: document.getElementById("bLang").value,
  });
  batchClearForm();
  msg.style.color = "var(--green)";
  msg.textContent =
    "✅ Score " +
    rec.gapPct +
    "%" +
    (rec.matched ? " · " + rec.site + "/" + rec.bu : " · unmatched") +
    " · saved & posted.";
  renderBatch();
  renderLibrary();
  setTimeout(() => (msg.textContent = ""), 4500);
}
function batchClearForm() {
  ["bFile", "bAgent", "bAgentId", "bConvo", "bStart", "bEnd"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("bMatch").className = "";
  document.getElementById("bMatch").textContent = "";
}
function batchUploadCSV(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const c = document.getElementById("bCsvMsg");
  const r = new FileReader();
  r.onload = () => {
    const rows = parseCSV(r.result);
    if (rows.length < 2) {
      c.className = "conn err";
      c.textContent = "Invalid CSV.";
      return;
    }
    const hdr = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (n) => hdr.findIndex((h) => h.includes(n));
    const iF = idx("file"),
      iN = idx("agent name"),
      iI = idx("agent id"),
      iC = idx("conversation");
    let n = 0,
      mt = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const conv = row[iC >= 0 ? iC : 3];
      if (!conv) continue;
      const rec = batchProcess({
        file: row[iF] || "row" + i,
        agent: row[iN] || "Unknown",
        agentId: row[iI] || "",
        convo: conv,
      });
      if (rec.matched) mt++;
      n++;
    }
    c.className = "conn ok";
    c.textContent = "✅ Processed " + n + " (" + mt + " matched).";
    renderBatch();
    renderLibrary();
    logAudit("Batch CSV uploaded", n + " rows", "data");
  };
  r.readAsText(f);
  ev.target.value = "";
}
function renderBatch() {
  const arr = loadBatch();
  const tbl = document.getElementById("batchTable");
  if (!tbl) return;
  while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("batchCount").textContent = arr.length;
  document.getElementById("batchEmpty").style.display = arr.length
    ? "none"
    : "block";
  arr.forEach((r) => {
    const tr = tbl.insertRow(-1);
    tr.innerHTML =
      "<td>" +
      (r.file || "—") +
      "</td><td>" +
      r.agent +
      "</td><td>" +
      (r.agentId || "—") +
      "</td><td>" +
      (r.matched
        ? r.site + "/" + r.bu
        : '<span class="u-color-muted">unmatched</span>') +
      "</td><td>" +
      r.turns +
      '</td><td><b data-style-color="' +
      (r.gapPct >= 85
        ? "var(--green)"
        : r.gapPct >= 70
          ? "var(--amber)"
          : "var(--red)") +
      '">' +
      r.gapPct +
      '%</b></td><td><span class="tag ' +
      (r.resolved ? "" : "y") +
      '">' +
      (r.resolved ? "Resolved" : "Follow-up") +
      "</span></td>";
  });
}
function exportBatch() {
  let out = "File,Agent,Agent ID,Site,BU,Turns,Score,Outcome\n";
  loadBatch().forEach(
    (r) =>
      (out +=
        [
          r.file,
          r.agent,
          r.agentId,
          r.site,
          r.bu,
          r.turns,
          r.gapPct + "%",
          r.resolved ? "Resolved" : "Follow-up",
        ]
          .map(csvEsc)
          .join(",") + "\n"),
  );
  dl(out, "FANTASTIC_batch.csv", "text/csv");
}
/* ===== QA FORM RESULTS — CSV EXPORT (v3.2) ===== */
function qaFormFor(r) {
  if (r.qaForm && (r.qaForm.well || r.qaForm.wrong || r.qaForm.improve))
    return {
      well: r.qaForm.well || [],
      wrong: r.qaForm.wrong || [],
      improve: r.qaForm.improve || [],
    };
  try {
    const g = autoGap(r);
    const well = (g.checks || []).filter((c) => c.ok).map((c) => c.label);
    const wrong = (g.gaps || []).map((c) => c.label);
    const improve = (g.gaps || []).map((c) => "Improve: " + c.label);
    return { well, wrong, improve };
  } catch (e) {
    return { well: [], wrong: [], improve: [] };
  }
}
function exportQAResults(recs, fname) {
  const arr =
    recs && recs.length
      ? recs
      : loadInteractions().filter(
          (r) => r.gapPct != null || r.manualRating || r.qaForm,
        );
  if (!arr.length) {
    alert(
      "No QA form results to export yet. Complete a call, batch upload, or evaluation first.",
    );
    return;
  }
  const cols = [
    "Date",
    "Interaction ID",
    "Agent",
    "Employee #",
    "Site",
    "BU",
    "Section",
    "Sub-section",
    "Mode",
    "Scenario",
    "Language",
    "Turns",
    "Duration (s)",
    "Auto QA Score",
    "Manual Rating (stars)",
    "Manual Score",
    "Sentiment",
    "Positive",
    "Neutral",
    "Negative",
    "Agent Mood",
    "Fraud Score",
    "Resolved",
    "Interruptions",
    "What Went Well",
    "What Went Wrong",
    "Areas for Improvement",
    "Evaluator Note",
    "Rated By",
    "AI Summary",
  ];
  let out = cols.map(csvEsc).join(",") + "\n";
  arr.forEach((r) => {
    const qf = qaFormFor(r);
    const s = r.sentiment || {};
    const row = [
      new Date(r.date).toLocaleString(),
      r.id,
      r.agent || "",
      r.agentId || "",
      r.site || "",
      r.bu || "",
      r.section || "",
      r.sub || "",
      r.mode || "",
      r.scenario || "",
      r.lang || "",
      r.turns != null ? r.turns : "",
      r.durationSec != null ? r.durationSec : "",
      r.gapPct != null ? r.gapPct : "",
      r.manualRating != null ? r.manualRating : "",
      r.manualScore != null ? r.manualScore : "",
      (r.qaForm && r.qaForm.dom) || s.dom || "",
      s.pos != null ? s.pos : "",
      s.neu != null ? s.neu : "",
      s.neg != null ? s.neg : "",
      r.mood != null
        ? r.mood
        : r.qaForm && r.qaForm.mood != null
          ? r.qaForm.mood
          : "",
      r.fraudScore != null ? r.fraudScore : "",
      r.resolved ? "Resolved" : "Follow-up",
      r.interruptions != null ? r.interruptions : "",
      (qf.well || []).join(" | "),
      (qf.wrong || []).join(" | "),
      (qf.improve || []).join(" | "),
      r.evalNote || "",
      r.ratedBy || "",
      (r.summary || "").replace(/\s+/g, " ").trim(),
    ];
    out += row.map(csvEsc).join(",") + "\n";
  });
  const name =
    fname ||
    "FANTASTIC_QA_form_results_" +
      new Date().toISOString().slice(0, 10) +
      ".csv";
  dl(out, name, "text/csv");
  try {
    logAudit("Exported QA form results", arr.length + " records", "export");
  } catch (e) {}
}
window.exportQAResults = exportQAResults;
function exportEvalQA() {
  const f = (
    (document.getElementById("evSearch") || {}).value || ""
  ).toLowerCase();
  let ia = loadInteractions();
  if (f)
    ia = ia.filter((r) =>
      ((r.agent || "") + (r.mode || "") + (r.site || ""))
        .toLowerCase()
        .includes(f),
    );
  exportQAResults(
    ia,
    "FANTASTIC_QA_form_results_" +
      new Date().toISOString().slice(0, 10) +
      ".csv",
  );
}
window.exportEvalQA = exportEvalQA;
function exportLiveQA() {
  const r = loadInteractions().find((x) => x.id === window._lastLiveId);
  if (!r) {
    alert("Complete a call first to generate a QA form result.");
    return;
  }
  exportQAResults([r], "FANTASTIC_QA_" + r.id + ".csv");
}
window.exportLiveQA = exportLiveQA;
function downloadCSVTemplate() {
  dl(
    'File Name,Agent Name,Agent ID,Conversation,Interaction Start Time,Interaction End Time\ncall_001.wav,Juan Dela Cruz,EMP-1001,"Agent: Thank you for calling. | Customer: My bill is wrong. | Agent: Let me verify and file a dispute.",2026-07-24 09:00,2026-07-24 09:05\n',
    "FANTASTIC_batch_template.csv",
    "text/csv",
  );
}
