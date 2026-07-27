const tEl = document.getElementById("transcript");
function addMsg(who, text, interim, labelOverride) {
  document.getElementById("emptyT")?.remove();
  const m = document.createElement("div");
  m.className = "msg " + who + (interim ? " interim" : "");
  const isCust =
    (roleMode === "agent" && who === "cust") ||
    (roleMode === "customer" && who === "ai");
  const senti = isCust && !interim ? scoreSentiment(text) : null;
  const face =
    senti === "pos"
      ? "😊"
      : senti === "neg"
        ? "😠"
        : senti === "neu"
          ? "😐"
          : "";
  let label = labelOverride;
  if (!label) {
    if (who === "sup") label = "Supervisor";
    else if (roleMode === "customer")
      label = who === "cust" ? "Agent (You)" : "Customer (AI)";
    else
      label =
        who === "cust"
          ? "Customer"
          : document.getElementById("agInput").value || "FANTASTIC AI";
  }
  m.innerHTML =
    '<div class="who">' +
    label +
    '</div><span class="txt">' +
    text +
    "</span>" +
    (face ? '<span class="senti">' + face + "</span>" : "");
  tEl.appendChild(m);
  tEl.scrollTop = tEl.scrollHeight;
  return m;
}
let convo = [],
  custTurns = 0,
  startTime = 0,
  timerInt = null,
  roleMode = "agent",
  callEnding = false,
  liveSessionId = 0;
function getLiveSessionId() {
  return liveSessionId;
}
function scoreCustomer(text) {
  const s = scoreSentiment(text);
  if (s === "pos") {
    sPos++;
    negStreak = 0;
  } else if (s === "neg") {
    sNeg++;
    negStreak++;
  } else {
    sNeu++;
    negStreak = 0;
  }
  updateSenti();
  updateMood();
  return s;
}
function aiReply(text) {
  const t = text.toLowerCase();
  const { best, score } = kbMatch(text);
  let lang = detectLang(text);
  setLivePill(lang);
  if (detectEndIntent(text))
    return {
      a: LINES.endack[lang] || LINES.endack.en,
      intent: "Closing",
      kb: false,
      end: true,
      lang,
    };
  const neg =
    scoreSentiment(text) === "neg" ||
    /(angry|galit|akig|masuko|reklamo|complaint|budlay|lisod)/i.test(t);
  let pre = neg
    ? (LINES.apology[lang] || LINES.apology.en) +
      " " +
      (LINES.empathy[lang] || LINES.empathy.en) +
      " "
    : "";
  if (/(thank|salamat|maayo|agyaman)/.test(t) && t.length < 40)
    return {
      a: LINES.closing[lang] || LINES.closing.en,
      intent: "Closing",
      kb: false,
      lang,
    };
  if (
    /(hi|hello|good morning|kumusta|kamusta|magandang|maayong|naimbag)/.test(
      t,
    ) &&
    t.length < 50
  )
    return {
      a: (LINES.greeting[lang] || LINES.greeting.en)(
        document.getElementById("brandInput").value,
      ),
      intent: "Greeting",
      kb: false,
      lang,
    };
  if (best && score > 0)
    return {
      a: pre + localize(best.a, lang),
      intent: best.q,
      kb: true,
      lang,
      empathized: !!pre,
    };
  return {
    a: pre + (LINES.clarify[lang] || LINES.clarify.en),
    intent: "Clarification",
    kb: false,
    lang,
    empathized: !!pre,
  };
}
function handleCustomer(text) {
  if (!text || !callActive) return;
  if (roleMode === "agent") handleTurnAgentMode(text);
  else handleTurnCustomerMode(text);
}
function handleTurnAgentMode(text) {
  const sessionId = liveSessionId;
  const flags = fraudScan(text);
  const shown = maskSensitive(text);
  addMsg("cust", shown);
  const s = scoreCustomer(text);
  custTurns++;
  const custEnd = detectEndIntent(text);
  convo.push({
    who: "cust",
    role: "customer",
    text: shown,
    raw: text,
    s,
    flags: flags.map((f) => f.id),
    end: custEnd,
  });
  if (custEnd)
    showEndFlag("🧑 Customer signaled end of call — wrapping up & closing.");
  const r = aiReply(text);
  if (flags.length) applyFraudAssist(flags);
  checkSupervisorTriggers(text, s, flags);
  liveAiGuide();
  setTimeout(() => {
    if (sessionId !== liveSessionId || !callActive) return;

    addMsg("ai", r.a);
    convo.push({
      who: "ai",
      role: "agent",
      text: r.a,
      intent: r.intent,
      kb: r.kb,
      end: r.end,
      empathized: r.empathized,
    });
    speak(r.a, r.lang);
    if (custEnd || r.end) {
      callEnding = true;
      setTimeout(() => {
        if (sessionId === liveSessionId && callActive) endCall();
      }, 1900);
    }
  }, 450);
}
function handleTurnCustomerMode(agentText) {
  const sessionId = liveSessionId;
  addMsg("cust", agentText, false, "Agent (You)");
  custTurns++;
  convo.push({ who: "cust", role: "agent", text: agentText, raw: agentText });
  const agentEnd = detectEndIntent(agentText);
  if (agentEnd) showEndFlag("🎧 Agent signaled end of call.");
  const r = customerReply(agentText);
  const s = scoreCustomer(r.a);
  convo.push({
    who: "ai",
    role: "customer",
    text: r.a,
    raw: r.a,
    s,
    intent: r.intent,
    kb: false,
  });
  checkSupervisorTriggers(r.a, s, []);
  liveAiGuide();
  setTimeout(() => {
    if (sessionId !== liveSessionId || !callActive) return;

    addMsg("ai", r.a, false, "Customer (AI)");
    speak(r.a, curLang);
    if (r.resolved) setStatus("Scenario resolved ✔", "live");
    if (agentEnd) {
      callEnding = true;
      setTimeout(() => {
        if (sessionId === liveSessionId && callActive) endCall();
      }, 1500);
    }
  }, 450);
}
function showEndFlag(msg) {
  const f = document.getElementById("endFlag");
  if (f) {
    f.textContent = "📞 " + msg;
    f.classList.add("show");
  }
}
const SCENARIOS = {
  billing: {
    label: "Billing dispute",
    open: "Hi, my bill this month is way higher than usual and I don't understand why.",
    need: ["itemize", "explain", "check", "dispute", "credit", "refund"],
    mood: "neg",
  },
  outage: {
    label: "Service outage",
    open: "My internet has been down since morning. Fix this now.",
    need: [
      "outage",
      "maintenance",
      "restore",
      "technician",
      "ticket",
      "update",
    ],
    mood: "neg",
  },
  cancel: {
    label: "Angry cancellation",
    open: "I've had enough. I want to cancel my account today. This is the worst.",
    need: [
      "sorry",
      "understand",
      "retain",
      "offer",
      "fix",
      "resolve",
      "apolog",
    ],
    mood: "neg",
  },
  upgrade: {
    label: "Plan upgrade",
    open: "Hi! I keep running out of data. What are my upgrade options?",
    need: ["compare", "recommend", "bundle", "upgrade", "data", "process"],
    mood: "neu",
  },
  refund: {
    label: "Refund request",
    open: "I was charged twice and I'd like a refund.",
    need: ["refund", "verify", "file", "reference", "process", "credit"],
    mood: "neu",
  },
};
let scen = null,
  scenStep = 0,
  scenSat = 50,
  scenResolved = false;
function pickScenario() {
  let key = document.getElementById("scenarioPick").value;
  if (key === "random") {
    const ks = Object.keys(SCENARIOS);
    key = ks[Math.floor(Math.random() * ks.length)];
  }
  scen = SCENARIOS[key];
  scenStep = 0;
  scenSat = scen.mood === "neg" ? 30 : 55;
  scenResolved = false;
  return scen;
}
function customerReply(a) {
  const t = a.toLowerCase();
  const emp = /(sorry|apolog|understand|pasensya|pasaylo|salamat)/i.test(t);
  const addr = scen.need.some((w) => t.includes(w));
  const close = /(anything else|glad to help|thank you for calling)/i.test(t);
  if (emp) scenSat += 15;
  if (addr) scenSat += 20;
  scenSat = Math.max(0, Math.min(100, scenSat));
  scenStep++;
  if ((addr && scenSat >= 70) || (close && scenSat >= 60)) {
    scenResolved = true;
    return {
      a: pick([
        "Oh, that helps a lot. Thank you, that's all — goodbye!",
        "Okay, salamat! Wala na po, paalam.",
        "Great, that resolves it. Bye!",
      ]),
      intent: "Resolved",
      resolved: true,
    };
  }
  if (scenStep >= 5 && scenSat < 50)
    return {
      a: pick([
        "I'm not satisfied. Can I speak to your supervisor?",
        "Escalate me to a manager please.",
      ]),
      intent: "Escalation",
      resolved: false,
    };
  if (emp && !addr)
    return {
      a: pick([
        "I appreciate that, but what can you do?",
        "So what are the next steps?",
      ]),
      intent: "Probing",
      resolved: false,
    };
  if (scenSat < 40)
    return {
      a: pick([
        "Are you even listening? Please fix this.",
        "You're not helping.",
      ]),
      intent: "Frustrated",
      resolved: false,
    };
  return {
    a: pick([
      "Okay, so what do you suggest?",
      "Can you explain more?",
      "And what happens next?",
    ]),
    intent: "Continuing",
    resolved: false,
  };
}
function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
let pendingRoleMode = null;
function applyRole(mode) {
  roleMode = mode;
  document.getElementById("roleAgent").classList.toggle("on", mode === "agent");
  document
    .getElementById("roleCustomer")
    .classList.toggle("on", mode === "customer");
  document.getElementById("scenarioPick").style.display =
    mode === "customer" ? "" : "none";
  document.getElementById("agName").textContent =
    mode === "customer"
      ? "Customer (AI)"
      : document.getElementById("agInput").value;
}
function roleModeLabel(mode) {
  return mode === "customer" ? "Customer (train)" : "Agent (AI helps you)";
}
function hasLiveStateForRoleSwitch() {
  return callActive || convo.length > 0;
}
function resetLiveSessionForRoleSwitch(mode) {
  liveSessionId++;
  callActive = false;
  muted = false;
  callEnding = false;
  startTime = 0;
  clearInterval(timerInt);
  timerInt = null;

  try {
    stopRec();
  } catch (e) {}
  try {
    stopSpeaking();
  } catch (e) {}
  try {
    if (interimEl) interimEl.remove();
    interimEl = null;
  } catch (e) {}

  convo = [];
  custTurns = 0;
  sPos = 0;
  sNeu = 0;
  sNeg = 0;
  negStreak = 0;
  updateSenti();
  updateMood();
  resetFraud();
  resetSupervisor();

  orb && orb.classList.remove("listening", "speaking");
  document.getElementById("fraudAlert")?.classList.remove("show");
  document.getElementById("endFlag")?.classList.remove("show");
  document.getElementById("liveQAbody")?.classList.add("hidden");
  document.getElementById("liveQAempty")?.classList.remove("hidden");
  document.getElementById("micInd")?.classList.add("hidden");

  const score = document.getElementById("liveQAScore");
  if (score) score.textContent = "";

  const timer = document.getElementById("timer");
  if (timer) timer.textContent = "00:00";

  if (btnStart) btnStart.disabled = false;
  if (btnEnd) btnEnd.disabled = true;
  if (btnMute) {
    btnMute.disabled = true;
    btnMute.classList.remove("on");
    btnMute.textContent = "🎙️";
  }

  window._gapData = null;
  setLivePill("en");
  setStatus("Ready", "");

  tEl.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-t";
  empty.id = "emptyT";
  empty.textContent =
    "Conversation cleared. Press Start to begin in " +
    roleModeLabel(mode) +
    " mode.";
  tEl.appendChild(empty);
}
function applyConfirmedRoleSwitch(mode) {
  if (hasLiveStateForRoleSwitch()) {
    resetLiveSessionForRoleSwitch(mode);
  }

  applyRole(mode);
}
function openRoleSwitchModal(mode) {
  pendingRoleMode = mode;

  const message = document.getElementById("roleSwitchMessage");
  if (message) {
    message.textContent =
      "There is an existing conversation. Continue switching to " +
      roleModeLabel(mode) +
      "? The current transcript and call state will be reset.";
  }

  const modal = document.getElementById("roleSwitchModal");
  if (!modal) {
    if (
      confirm(
        "There is an existing conversation. Switch roles?\n\n" +
          "The current transcript and call state will be reset.",
      )
    ) {
      applyConfirmedRoleSwitch(mode);
    }
    return;
  }

  modal.classList.remove("hidden");
  modal.querySelector(".btn.mag")?.focus();
}
function cancelRoleSwitch() {
  pendingRoleMode = null;
  document.getElementById("roleSwitchModal")?.classList.add("hidden");
}
function confirmRoleSwitch() {
  const mode = pendingRoleMode;
  cancelRoleSwitch();

  if (mode) applyConfirmedRoleSwitch(mode);
}
function setRole(mode) {
  if (mode === roleMode) return;

  if (hasLiveStateForRoleSwitch()) {
    openRoleSwitchModal(mode);
    return;
  }

  applyRole(mode);
}
function setStatus(txt, cls) {
  const h = document.getElementById("hdrStatus");
  if (h) {
    h.textContent = txt;
    document.getElementById("hdrDot").className =
      "dot" + (cls === "live" ? " live" : "");
  }
}
function fmt(s) {
  const m = Math.floor(s / 60),
    ss = s % 60;
  return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}
function tick() {
  const el = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById("timer").textContent = fmt(el);
  checkDurationTrigger(el);
}
let camStream = null,
  camOn = false,
  camRAF = null,
  moodVal = 50,
  _faceReady = false;
async function loadFaceModels() {
  if (_faceReady || !window.faceapi) return;
  try {
    const M = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";
    await faceapi.nets.tinyFaceDetector.loadFromUri(M);
    await faceapi.nets.faceExpressionNet.loadFromUri(M);
    _faceReady = true;
  } catch (e) {
    console.warn("face models", e);
  }
}
async function toggleCamera() {
  if (camOn) {
    stopCamera();
    return;
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
    });
    const v = document.getElementById("camVideo");
    v.srcObject = camStream;
    v.classList.remove("hidden");
    document.getElementById("camOff").classList.add("hidden");
    document.getElementById("camBadge").classList.remove("hidden");
    document.getElementById("btnCam").classList.add("on");
    camOn = true;
    loadFaceModels().then(() => setTimeout(faceLoop, 500));
    logAudit("Camera enabled", "face-api mood tracking", "config");
  } catch (e) {
    document.getElementById("camOff").textContent =
      "📷 Camera blocked. Allow access and retry.";
  }
}
function stopCamera() {
  camOn = false;
  if (camRAF) cancelAnimationFrame(camRAF);
  try {
    camStream && camStream.getTracks().forEach((t) => t.stop());
  } catch (e) {}
  camStream = null;
  const v = document.getElementById("camVideo");
  if (v) {
    v.classList.add("hidden");
    v.srcObject = null;
  }
  document.getElementById("camOff")?.classList.remove("hidden");
  document.getElementById("camBadge")?.classList.add("hidden");
  document.getElementById("btnCam")?.classList.remove("on");
}
function faceLoop() {
  if (!camOn) return;
  const v = document.getElementById("camVideo");
  if (_faceReady && v && v.videoWidth) {
    faceapi
      .detectSingleFace(
        v,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.4,
        }),
      )
      .withFaceExpressions()
      .then((det) => {
        if (det && det.expressions) {
          const e = det.expressions;
          const pos = (e.happy || 0) + 0.4 * (e.surprised || 0);
          const neg =
            (e.angry || 0) +
            (e.sad || 0) +
            (e.fearful || 0) +
            0.5 * (e.disgusted || 0);
          let v2 = Math.max(3, Math.min(98, 50 + pos * 55 - neg * 60));
          moodVal = moodVal * 0.7 + v2 * 0.3;
          const top = Object.entries(e).sort((a, b) => b[1] - a[1])[0];
          renderMood(
            moodVal,
            "face-api: " + top[0] + " " + Math.round(top[1] * 100) + "%",
            true,
          );
        }
      })
      .catch(() => {});
  }
  camRAF = requestAnimationFrame(() => setTimeout(faceLoop, 220));
}
function moodFaceFor(v) {
  return v >= 75
    ? "😀"
    : v >= 60
      ? "🙂"
      : v >= 45
        ? "😐"
        : v >= 30
          ? "😕"
          : "😣";
}
function moodLabelFor(v) {
  return v >= 75
    ? "Positive"
    : v >= 60
      ? "Upbeat"
      : v >= 45
        ? "Neutral"
        : v >= 30
          ? "Strained"
          : "Stressed";
}
function renderMood(v, exp, faceOK) {
  const f = document.getElementById("moodFace"),
    lb = document.getElementById("moodLabel"),
    bar = document.getElementById("moodBar"),
    det = document.getElementById("moodDetail"),
    conf = document.getElementById("moodConf");
  if (!f) return;
  f.textContent = moodFaceFor(v);
  lb.textContent = moodLabelFor(v);
  bar.style.width = Math.round(v) + "%";
  det.textContent = "Expression: " + (exp || "—");
  conf.textContent =
    (faceOK ? "👤 face ✓" : "") + " mood " + Math.round(v) + "/100";
}
function updateMood() {
  if (!camOn) {
    const v = Math.max(5, Math.min(95, 55 + (sPos - sNeg) * 8));
    moodVal = v;
    renderMood(v, "(camera off — voice sentiment)", false);
  }
}
const btnStart = document.getElementById("btnStart"),
  btnEnd = document.getElementById("btnEnd"),
  btnMute = document.getElementById("btnMute"),
  btnCam = document.getElementById("btnCam");
if (btnCam) btnCam.onclick = toggleCamera;
let callCount = 0,
  resolvedCount = 0;
async function ensureMic() {
  try {
    const s = await navigator.mediaDevices.getUserMedia(
      window.ftMicConstraint(),
    );
    s.getTracks().forEach((t) => t.stop());
    await ftListMics();
    return true;
  } catch (e) {
    try {
      const s2 = await navigator.mediaDevices.getUserMedia({ audio: true });
      s2.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    return false;
  }
}
btnStart.onclick = async () => {
  if (!SR && sttMode === "browser") {
    alert("Speech recognition needs Chrome/Edge, or enable Azure STT.");
    return;
  }
  const micReady = await ensureMic();
  // Do not start the call state if the browser cannot open any microphone.
  if (!micReady) {
    setStatus("Mic permission needed", "");
    return;
  }
  liveSessionId++;
  callActive = true;
  callEnding = false;
  convo = [];
  custTurns = 0;
  sPos = 0;
  sNeu = 0;
  sNeg = 0;
  negStreak = 0;
  updateSenti();
  resetFraud();
  resetSupervisor();
  document.getElementById("fraudAlert").classList.remove("show");
  document.getElementById("endFlag").classList.remove("show");
  document.getElementById("liveQAbody").classList.add("hidden");
  document.getElementById("liveQAempty").classList.remove("hidden");
  document.getElementById("liveQAScore").textContent = "";
  document.getElementById("micInd").classList.remove("hidden");
  tEl.innerHTML = "";
  startTime = Date.now();
  timerInt = setInterval(tick, 1000);
  btnStart.disabled = true;
  btnEnd.disabled = false;
  btnMute.disabled = false;
  updateMood();
  if (roleMode === "customer") {
    const sc = pickScenario();
    document.getElementById("agName").textContent = "Customer (AI)";
    scoreCustomer(sc.open);
    convo.push({
      who: "ai",
      role: "customer",
      text: sc.open,
      raw: sc.open,
      intent: "Opening",
    });
    addMsg("ai", sc.open, false, "Customer (AI)");
    speak(sc.open, "en");
    setStatus("Training — you are the agent", "live");
  } else {
    document.getElementById("agName").textContent =
      document.getElementById("agInput").value;
    setLivePill("en");
    const greet = LINES.greeting.en(
      document.getElementById("brandInput").value,
    );
    convo.push({ who: "ai", role: "agent", text: greet, intent: "Greeting" });
    addMsg("ai", greet);
    speak(greet, "en");
  }
  // STT restarts from speak() after TTS ends; starting here can overlap bot audio.
};
btnMute.onclick = () => {
  muted = !muted;
  btnMute.classList.toggle("on", muted);
  btnMute.textContent = muted ? "🔇" : "🎙️";
  document.getElementById("micInd").classList.toggle("hidden", muted);
  if (muted) {
    stopRec();
    stopSpeaking();
    orb.classList.remove("listening");
    setStatus("Muted", "");
  } else {
    setStatus("Listening…", "live");
    startRec();
  }
};
btnEnd.onclick = endCall;
function endCall() {
  if (!callActive) return;
  callActive = false;
  clearInterval(timerInt);
  stopRec();
  stopSpeaking();
  orb.classList.remove("listening", "speaking");
  document.getElementById("micInd").classList.add("hidden");
  btnStart.disabled = false;
  btnEnd.disabled = true;
  btnMute.disabled = true;
  muted = false;
  btnMute.classList.remove("on");
  btnMute.textContent = "🎙️";
  setStatus("Call ended", "");
  callCount++;
  const domNeg = sNeg >= sPos && sNeg >= sNeu;
  const kb = convo.filter((c) => c.kb).length > 0;
  if (kb && !domNeg) resolvedCount++;
  buildGapAnalysis();
  saveInteraction();
  buildLiveQA();
  const qa = window._gapData ? window._gapData.pct : 0;
  if (roleMode === "customer")
    awardPoints(document.getElementById("agInput").value || "Trainee", {
      training: qa,
      quality: 0,
      tag: "Training sim",
    });
  else
    awardPoints("FANTASTIC AI", { quality: qa, training: 0, tag: "AI call" });
  if (aiCfg.autoSummary) aiDraftSummary("live");
}
