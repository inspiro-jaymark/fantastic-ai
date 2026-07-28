const FRAUD_RULES = [
  {
    id: "card",
    name: "Card Number",
    sev: "critical",
    score: 35,
    desc: "Full PAN (PCI-DSS)",
    on: true,
    test: (t) => {
      const m = t.replace(/[ -]/g, "").match(/\d{13,16}/g);
      if (!m) return null;
      return m.find(luhn) ? ["Card number"] : null;
    },
  },
  {
    id: "cvv",
    name: "CVV / Security Code",
    sev: "critical",
    score: 30,
    desc: "Card security code",
    on: true,
    test: (t) =>
      /(cvv|cvc|security code).{0,20}\d{3,4}/i.test(t) ? ["CVV shared"] : null,
  },
  {
    id: "otp",
    name: "OTP / PIN / Password",
    sev: "critical",
    score: 32,
    desc: "OTP/PIN disclosed",
    on: true,
    test: (t) =>
      /(otp|one[ -]?time|pin|password).{0,25}\d{3,8}|(my (pin|password|otp) is)/i.test(
        t,
      )
        ? ["OTP/PIN disclosed"]
        : null,
  },
  {
    id: "giftcard",
    name: "Gift Card / Crypto",
    sev: "high",
    score: 25,
    desc: "Scam payment",
    on: true,
    test: (t) =>
      /(gift ?card|bitcoin|crypto|usdt|steam card|itunes)/i.test(t)
        ? ["Unusual payment"]
        : null,
  },
  {
    id: "remote",
    name: "Remote Access",
    sev: "high",
    score: 24,
    desc: "AnyDesk/TeamViewer",
    on: true,
    test: (t) =>
      /(anydesk|teamviewer|remote (access|desktop))/i.test(t)
        ? ["Remote access"]
        : null,
  },
  {
    id: "pressure",
    name: "Pressure / Urgency",
    sev: "med",
    score: 15,
    desc: "Threats/urgency",
    on: true,
    test: (t) =>
      /(right now|immediately|suspend|arrest|urgent|last warning|or else)/i.test(
        t,
      )
        ? ["Pressure"]
        : null,
  },
  {
    id: "bait",
    name: "Prize / Lottery Bait",
    sev: "med",
    score: 14,
    desc: "Winnings lure",
    on: true,
    test: (t) =>
      /(you won|congratulations.{0,20}prize|claim your (prize|reward)|lottery)/i.test(
        t,
      )
        ? ["Prize bait"]
        : null,
  },
];
function luhn(n) {
  let s = 0,
    a = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (a) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    s += d;
    a = !a;
  }
  return s % 10 === 0;
}
let fraudFlags = [],
  fraudScore = 0,
  maskCount = 0;
function fraudScan(text) {
  const found = [];
  FRAUD_RULES.forEach((r) => {
    if (!r.on) return;
    const res = r.test(text);
    if (res)
      found.push({
        id: r.id,
        name: r.name,
        sev: r.sev,
        score: r.score,
        evidence: res[0],
      });
  });
  if (found.length) {
    found.forEach((f) => {
      fraudScore = Math.min(100, fraudScore + f.score);
      fraudFlags.push(f);
      logFraud(f);
    });
    updateFraudUI();
  }
  return found;
}
function maskSensitive(text) {
  if (!document.getElementById("maskToggle")?.checked) return text;
  let out = text,
    m = false;
  out = out.replace(/\b(\d[ -]?){13,16}\b/g, (x) => {
    const d = x.replace(/[ -]/g, "");
    if (d.length >= 13 && d.length <= 16 && luhn(d)) {
      m = true;
      return "•••• •••• •••• " + d.slice(-4);
    }
    return x;
  });
  out = out.replace(
    /((?:cvv|cvc|pin|otp|password|code)\D{0,15})(\d{3,8})/gi,
    (x, p1) => {
      m = true;
      return p1 + "••••";
    },
  );
  if (m) maskCount++;
  return out;
}
function sevRank(s) {
  return s === "critical" ? 3 : s === "high" ? 2 : 1;
}
function logFraud(f) {
  const tbl = document.getElementById("fraudLog");
  if (!tbl) return;
  document.getElementById("fraudEmpty")?.classList.add("hidden");
  const r = tbl.insertRow(1);
  r.innerHTML =
    "<td>" +
    new Date().toLocaleTimeString() +
    "</td><td>" +
    f.name +
    '</td><td><span class="sev ' +
    f.sev +
    '">' +
    f.sev +
    "</span></td><td>" +
    f.evidence +
    "</td>";
}
function updateFraudUI() {
  const arc = document.getElementById("gaugeArc");
  if (!arc) return;
  arc.style.strokeDashoffset = 126 - (fraudScore / 100) * 126;
  const col =
    fraudScore >= 60 ? "#dc2626" : fraudScore >= 30 ? "#f59e0b" : "#16a34a";
  arc.style.stroke = col;
  const rn = document.getElementById("riskNum");
  rn.textContent = fraudScore;
  rn.style.color = col;
  document.getElementById("riskLab").textContent =
    fraudScore >= 60 ? "HIGH RISK" : fraudScore >= 30 ? "Elevated" : "Low risk";
  document.getElementById("fTotal").textContent = fraudFlags.length;
  document.getElementById("fCrit").textContent = fraudFlags.filter(
    (f) => f.sev === "critical",
  ).length;
  document.getElementById("fMask").textContent = maskCount;
  const mx = fraudFlags.reduce((a, f) => Math.max(a, sevRank(f.sev)), 0);
  document.getElementById("fMax").textContent =
    mx === 3
      ? "🔴 Critical"
      : mx === 2
        ? "🟠 High"
        : mx === 1
          ? "🟡 Medium"
          : "—";
}
function applyFraudAssist(flags) {
  const top = flags.sort((a, b) => sevRank(b.sev) - sevRank(a.sev))[0];
  const al = document.getElementById("fraudAlert");
  document.getElementById("fraudAlertMsg").textContent =
    " " + top.name + " — risk " + fraudScore + "/100.";
  al.classList.add("show");
  setTimeout(() => al.classList.remove("show"), 8000);
}
function renderRules() {
  const el = document.getElementById("ruleList");
  if (!el) return;
  el.innerHTML = FRAUD_RULES.map(
    (r) =>
      '<div class="rule"><div class="info"><b>' +
      r.name +
      '</b> <span class="sev ' +
      r.sev +
      '">' +
      r.sev +
      "</span><p>" +
      r.desc +
	      '</p></div><label class="switch"><input type="checkbox" aria-label="Enable ' +
	      esc(r.name) +
	      ' fraud detection rule" ' +
      (r.on ? "checked" : "") +
      " onchange=\"toggleRule('" +
      r.id +
      '\',this.checked)"><span class="slider"></span></label></div>',
  ).join("");
}
function toggleRule(id, on) {
  const r = FRAUD_RULES.find((x) => x.id === id);
  if (r) r.on = on;
}
function resetFraud() {
  fraudFlags = [];
  fraudScore = 0;
  maskCount = 0;
  const tbl = document.getElementById("fraudLog");
  if (tbl) while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("fraudEmpty")?.classList.remove("hidden");
  updateFraudUI();
}
function exportFraud() {
  let out = "Rule,Severity,Evidence\n";
  fraudFlags.forEach(
    (f) => (out += '"' + f.name + '",' + f.sev + ',"' + f.evidence + '"\n'),
  );
  dl(out, "FANTASTIC_fraud.csv", "text/csv");
}
let supAlerts = [],
  supBarges = 0,
  supWhispers = 0,
  supDurationFired = false;
function checkSupervisorTriggers(text, s, flags) {
  if (document.getElementById("onFraud")?.checked) {
    const thr = +document.getElementById("thrFraud").value;
    if (fraudScore >= thr && !supAlerts.some((a) => a.trigger === "Fraud risk"))
      fireSupAlert(
        "Fraud risk",
        "Risk " + fraudScore + " ≥ " + thr,
        "critical",
      );
  }
  if (document.getElementById("onNeg")?.checked) {
    const thr = +document.getElementById("thrNeg").value;
    if (negStreak >= thr) {
      fireSupAlert("Negative sentiment", negStreak + " negative turns", "high");
      negStreak = 0;
    }
  }
  if (
    document.getElementById("onEsc")?.checked &&
    /(supervisor|manager|human|escalate|tao)/i.test(text)
  ) {
    if (!supAlerts.some((a) => a.trigger === "Escalation request"))
      fireSupAlert(
        "Escalation request",
        "Customer asked for supervisor",
        "high",
      );
  }
}
function checkDurationTrigger(el) {
  if (!callActive || supDurationFired) return;
  if (!document.getElementById("onDur")?.checked) return;
  const thr = +document.getElementById("thrDur").value;
  if (el >= thr * 60) {
    supDurationFired = true;
    fireSupAlert("Long call", "Exceeded " + thr + " min", "med");
  }
}
function fireSupAlert(trigger, detail, sev) {
  supAlerts.push({
    trigger,
    detail,
    sev,
    time: new Date().toLocaleTimeString(),
  });
  logSup(trigger, detail);
  const box = document.getElementById("supAlert");
  if (box) {
    document.getElementById("supAlertMsg").textContent =
      " " + trigger + ": " + detail;
    box.classList.add("show");
  }
  const si = document.getElementById("supStatusIcon");
  if (si) {
    si.textContent = sev === "critical" ? "🔴" : sev === "high" ? "🟠" : "🟡";
    document.getElementById("supStatusText").textContent = "Attention needed";
  }
  updateSupUI();
}
function dismissSupAlert() {
  document.getElementById("supAlert").classList.remove("show");
}
function supAction(mode) {
  const banner = document.getElementById("supModeBanner");
  if (mode === "barge") {
    supBarges++;
    if (banner) {
      banner.textContent = "📞 SUPERVISOR BARGED IN";
      banner.classList.add("show");
    }
    addMsg("sup", "🎧 Supervisor joined the call.");
  } else if (banner) {
    banner.textContent =
      (mode === "monitor" ? "👂 MONITORING" : "🤫 WHISPER MODE") + " active";
    banner.classList.add("show");
  }
  const si = document.getElementById("supStatusIcon");
  if (si) {
    si.textContent = "🎧";
    document.getElementById("supStatusText").textContent = mode + " active";
  }
  updateSupUI();
}
function sendWhisper() {
  const t = document.getElementById("whisperInput").value.trim();
  if (!t) return;
  supWhispers++;
  addMsg("sup", "🤫 Whisper: " + t);
  document.getElementById("whisperInput").value = "";
  updateSupUI();
}
function logSup(tr, dt) {
  const tbl = document.getElementById("supLog");
  if (!tbl) return;
  document.getElementById("supEmpty")?.classList.add("hidden");
  const r = tbl.insertRow(1);
  r.innerHTML =
    "<td>" +
    new Date().toLocaleTimeString() +
    "</td><td>" +
    tr +
    "</td><td>" +
    dt +
    "</td><td>—</td>";
}
function updateSupUI() {
  const t = document.getElementById("supTotal");
  if (!t) return;
  t.textContent = supAlerts.length;
  document.getElementById("supBarges").textContent = supBarges;
  document.getElementById("supWhispers").textContent = supWhispers;
  const mx = supAlerts.reduce((a, x) => Math.max(a, sevRank(x.sev)), 0);
  document.getElementById("supMax").textContent =
    mx === 3
      ? "🔴 Critical"
      : mx === 2
        ? "🟠 High"
        : mx === 1
          ? "🟡 Medium"
          : "—";
}
function resetSupervisor() {
  supAlerts = [];
  supBarges = 0;
  supWhispers = 0;
  supDurationFired = false;
  const tbl = document.getElementById("supLog");
  if (tbl) while (tbl.rows.length > 1) tbl.deleteRow(1);
  document.getElementById("supEmpty")?.classList.remove("hidden");
  document.getElementById("supModeBanner")?.classList.remove("show");
  document.getElementById("supAlert")?.classList.remove("show");
  const si = document.getElementById("supStatusIcon");
  if (si) {
    si.textContent = "🟢";
    document.getElementById("supStatusText").textContent = "Standing by";
  }
  updateSupUI();
}
function agentSays(re) {
  return convo.some((c) => c.role === "agent" && re.test(c.text || ""));
}
function customerSays(re) {
  return convo.some(
    (c) => c.role === "customer" && re.test(c.raw || c.text || ""),
  );
}
const ARROW_STEPS = [
  {
    id: "open",
    name: "Brand Opening",
    weight: 12,
    crit: false,
    check: () =>
      agentSays(
        /(hello|hi|good|welcome|thank you for calling|salamat|magandang|kumusta|maayong|naimbag|maupay)/i,
      )
        ? "done"
        : "miss",
  },
  {
    id: "rapport",
    name: "Active Listening",
    weight: 12,
    crit: false,
    check: () => {
      const q = convo.filter(
        (c) =>
          c.role === "agent" &&
          /\?|could you|tell me|pwede|paano|unsa|ano/i.test(c.text || ""),
      ).length;
      return q >= 2 ? "done" : q === 1 ? "partial" : "miss";
    },
  },
  {
    id: "verify",
    name: "Verification",
    weight: 16,
    crit: true,
    check: () => {
      const s = customerSays(
        /(account|refund|billing|charge|cancel|password)/i,
      );
      const v = agentSays(/(verify|otp|account number|i-verify)/i);
      return !s ? "done" : v ? "done" : "miss";
    },
  },
  {
    id: "empathy",
    name: "Empathy & Apology",
    weight: 14,
    crit: false,
    check: () => {
      const e =
        agentSays(
          /(sorry|apolog|understand|pasensya|pasaylo|dispensar|nasabtan|nabatyagan|maawatak)/i,
        ) || convo.some((c) => c.empathized);
      if (sNeg === 0) return e ? "done" : "partial";
      return e ? "done" : "miss";
    },
  },
  {
    id: "resolve",
    name: "Resolution",
    weight: 18,
    crit: true,
    check: () => {
      if (roleMode === "agent")
        return convo.filter((c) => c.kb).length >= 1 ? "done" : "miss";
      return agentSays(
        /(i(?:'| wi)ll|let me|i can|process|file|resolve|fix|refund|credit|gagawin|ayusin|tabang|bulig)/i,
      )
        ? "done"
        : "miss";
    },
  },
  {
    id: "compliance",
    name: "Secure & Compliant",
    weight: 16,
    crit: true,
    check: () =>
      fraudFlags.some((f) => f.sev === "critical")
        ? "miss"
        : fraudFlags.length
          ? "partial"
          : "done",
  },
  {
    id: "value",
    name: "Value-Add",
    weight: 6,
    crit: false,
    check: () =>
      agentSays(/(upgrade|bundle|recommend|offer|would you like)/i)
        ? "done"
        : "miss",
  },
  {
    id: "close",
    name: "Proper Closing",
    weight: 6,
    crit: false,
    check: () =>
      agentSays(
        /(anything else|glad to help|thank you for calling|may iba pa|paalam|salamat po|babay|agyaman)/i,
      ) || convo.some((c) => c.intent === "Closing")
        ? "done"
        : "miss",
  },
];
function buildGapAnalysis() {
  let earned = 0,
    total = 0,
    done = 0,
    miss = 0,
    partial = 0,
    crit = 0;
  const rows = [];
  ARROW_STEPS.forEach((s) => {
    const st = s.check();
    total += s.weight;
    if (st === "done") {
      earned += s.weight;
      done++;
    } else if (st === "partial") {
      earned += s.weight * 0.5;
      partial++;
    } else {
      miss++;
      if (s.crit) crit++;
    }
    rows.push({ s, st });
  });
  const pct = Math.round((earned / total) * 100);
  window._gapData = { pct, rows };
  return pct;
}
