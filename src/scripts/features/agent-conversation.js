let acActive = false,
  acRec = null,
  acAz = null,
  acAzRunning = false,
  acInterim = null,
  acConvo = [],
  acStream = null,
  acNextSpeaker = "auto",
  acLastSpeaker = "customer",
  acStartTime = 0,
  acTurnStart = 0;
let acSysCtx = null,
  acSysNode = null,
  acSysGain = null,
  acSysRec = null,
  acSysRunning = false,
  acSysInterim = null,
  acPush = null;
let mixCtx = null,
  mixDest = null,
  mixRec = null,
  mixChunks = [],
  acMicStream = null,
  mixURL = null;
const acTEl = document.getElementById("acTranscript");
const AGENT_CUES =
  /(thank you for calling|salamat sa pagtawag|how may i|how can i help|let me|i'll|i will|verify|i-verify|one moment|please hold|is there anything else|may iba pa|glad to help|i apologize|let me check|welcome to|gagawin ko|tabang|bulig)/i;
const CUST_CUES =
  /(my bill|my account|i want|i need|why is|how do i|can you|i was charged|ang bill ko|gusto ko|kailangan ko|bakit|refund|complaint|reklamo|ngano|ngaa|unsa|ano)/i;
function classifySpeaker(text) {
  if (acNextSpeaker !== "auto") {
    const s = acNextSpeaker;
    acNextSpeaker = "auto";
    syncDiaButtons();
    return s;
  }
  const t = text.toLowerCase();
  let a = (t.match(AGENT_CUES) || []).length,
    c = (t.match(CUST_CUES) || []).length;
  if (/\?$/.test(text.trim())) c += 0.5;
  let spk;
  if (a > c) spk = "agent";
  else if (c > a) spk = "customer";
  else spk = acLastSpeaker === "agent" ? "customer" : "agent";
  acLastSpeaker = spk;
  return spk;
}
function setNextSpeaker(m) {
  acNextSpeaker = m;
  syncDiaButtons();
}
function syncDiaButtons() {
  document
    .getElementById("diaAgent")
    .classList.toggle("on", acNextSpeaker === "agent");
  document
    .getElementById("diaCust")
    .classList.toggle("on", acNextSpeaker === "customer");
  document
    .getElementById("diaAuto")
    .classList.toggle("on", acNextSpeaker === "auto");
}
function acAddMsg(text, interim, speaker) {
  document.getElementById("acEmptyT")?.remove();
  const dia = document.getElementById("acDiaOn")?.checked;
  const spk = speaker || "customer";
  const cls = dia && spk === "agent" ? "ai" : spk === "system" ? "sys" : "cust";
  const m = document.createElement("div");
  m.className = "msg " + cls + (interim ? " interim" : "");
  if (interim) {
    m.innerHTML =
      '<div class="who">Transcribing…</div><span class="txt">' +
      text +
      "</span>";
  } else if (dia) {
    const lbl =
      spk === "agent"
        ? "🎧 Agent"
        : spk === "system"
          ? "🔊 Customer (system audio)"
          : "🧑 Customer";
    m.innerHTML =
      '<div class="who">' +
      lbl +
      '<span class="spk-flip" onclick="flipSpeaker(this)">⇄</span></div><span class="txt">' +
      text +
      "</span>";
    m.dataset.spk = spk === "agent" ? "agent" : "customer";
  } else {
    m.innerHTML =
      '<div class="who">Live caller</div><span class="txt">' + text + "</span>";
  }
  acTEl.appendChild(m);
  acTEl.scrollTop = acTEl.scrollHeight;
  return m;
}
function flipSpeaker(el) {
  const m = el.closest(".msg");
  const idx = [...acTEl.querySelectorAll(".msg:not(.interim)")].indexOf(m);
  const next = m.dataset.spk === "agent" ? "customer" : "agent";
  m.dataset.spk = next;
  m.className = "msg " + (next === "agent" ? "ai" : "cust");
  m.querySelector(".who").innerHTML =
    (next === "agent" ? "🎧 Agent" : "🧑 Customer") +
    '<span class="spk-flip" onclick="flipSpeaker(this)">⇄</span>';
  if (acConvo[idx]) acConvo[idx].speaker = next;
  acUpdateChecklist();
  acRenderTalkTime();
  acRenderTimeline();
}
function acStartRec() {
  if (!acActive) return;
  if (sttMode === "azure" && azureCfg.key && window.SpeechSDK) {
    acStartAzure();
    return;
  }
  if (!SR) {
    const t = document.getElementById("acTranscript");
    if (t) {
      const d = document.createElement("div");
      d.className = "note";
      d.style.color = "var(--red)";
      d.innerHTML =
        "⚠️ No browser speech recognition. Use Chrome/Edge or enable Azure STT.";
      t.appendChild(d);
    }
    return;
  }
  try {
    if (acRec) acRec.abort();
  } catch (e) {}
  try {
    acRec = new SR();
    acRec.continuous = false;
    acRec.interimResults = true;
    acRec.lang = (document.getElementById("acLang") || {}).value || "en-US";
    acRec.onresult = (e) => {
      let interim = "",
        final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tr;
        else interim += tr;
      }
      if (interim) {
        if (!acInterim) acInterim = acAddMsg("", true);
        acInterim.querySelector(".txt").textContent = interim;
      }
      if (final) {
        if (acInterim) {
          acInterim.remove();
          acInterim = null;
        }
        acNextSpeaker = "agent";
        acHandle(final.trim());
      }
    };
    acRec.onend = () => {
      if (acActive && sttMode !== "azure") setTimeout(acStartRec, 300);
    };
    acRec.onerror = (ev) => {
      if (
        ev &&
        (ev.error === "not-allowed" || ev.error === "service-not-allowed")
      ) {
        const t = document.getElementById("acTranscript");
        if (t) {
          const d = document.createElement("div");
          d.className = "note";
          d.style.color = "var(--red)";
          d.innerHTML =
            "🎙️ Mic blocked. Allow it via the padlock, then press Start.";
          t.appendChild(d);
        }
      }
    };
    acRec.start();
  } catch (e) {
    setTimeout(() => {
      try {
        acRec && acRec.start();
      } catch (_) {}
    }, 400);
  }
}
function acAzAudio() {
  return window.ftMicId
    ? SpeechSDK.AudioConfig.fromMicrophoneInput(window.ftMicId)
    : SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
}
function acStartAzure() {
  if (acAzRunning) return;
  try {
    const cfg = SpeechSDK.SpeechConfig.fromSubscription(
      azureCfg.key,
      azureCfg.region,
    );
    cfg.speechRecognitionLanguage = document.getElementById("acLang").value;
    acAz = new SpeechSDK.SpeechRecognizer(cfg, acAzAudio());
    acAz.recognizing = (s, e) => {
      const t = e.result.text;
      if (!t) return;
      if (!acInterim) acInterim = acAddMsg("", true);
      acInterim.querySelector(".txt").textContent = t;
    };
    acAz.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        if (acInterim) {
          acInterim.remove();
          acInterim = null;
        }
        const t = e.result.text.trim();
        if (t) {
          acNextSpeaker = "agent";
          acHandle(t);
        }
      }
    };
    acAz.canceled = () => {
      acAzRunning = false;
    };
    acAz.startContinuousRecognitionAsync(
      () => {
        acAzRunning = true;
      },
      () => {
        acAzRunning = false;
      },
    );
  } catch (e) {}
}
function acStopRec() {
  try {
    acRec && acRec.abort();
  } catch (e) {}
  if (acAz && acAzRunning) {
    try {
      acAz.stopContinuousRecognitionAsync(() => {
        try {
          acAz.close();
        } catch (e) {}
        acAz = null;
        acAzRunning = false;
      });
    } catch (e) {
      acAzRunning = false;
    }
  }
}
const acLangSel = document.getElementById("acLang");
if (acLangSel)
  acLangSel.addEventListener("change", () => {
    if (acActive && sttMode === "browser") {
      try {
        acRec && acRec.abort();
      } catch (e) {}
    }
  });
function startSysAudio(stream) {
  const at = stream.getAudioTracks();
  if (!at.length) return false;
  document.getElementById("acSysInd").classList.remove("hidden");
  if (!(sttMode === "azure" && azureCfg.key && window.SpeechSDK)) return true;
  try {
    const fmt = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    acPush = SpeechSDK.AudioInputStream.createPushStream(fmt);
    const cfg = SpeechSDK.SpeechConfig.fromSubscription(
      azureCfg.key,
      azureCfg.region,
    );
    cfg.speechRecognitionLanguage = document.getElementById("acLang").value;
    acSysRec = new SpeechSDK.SpeechRecognizer(
      cfg,
      SpeechSDK.AudioConfig.fromStreamInput(acPush),
    );
    acSysRec.recognizing = (s, e) => {
      const t = e.result.text;
      if (!t) return;
      if (!acSysInterim) acSysInterim = acAddMsg("", true, "system");
      acSysInterim.querySelector(".txt").textContent = t;
    };
    acSysRec.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        if (acSysInterim) {
          acSysInterim.remove();
          acSysInterim = null;
        }
        const t = e.result.text.trim();
        if (t) {
          acNextSpeaker = "customer";
          acHandle(t, "system");
        }
      }
    };
    acSysRec.startContinuousRecognitionAsync(
      () => {
        acSysRunning = true;
      },
      () => {},
    );
    acSysCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
    const src = acSysCtx.createMediaStreamSource(new MediaStream(at));
    acSysNode = acSysCtx.createScriptProcessor(4096, 1, 1);
    acSysGain = acSysCtx.createGain();
    acSysGain.gain.value = 0;
    src.connect(acSysNode);
    acSysNode.connect(acSysGain);
    acSysGain.connect(acSysCtx.destination);
    acSysNode.onaudioprocess = (ev) => {
      const f = ev.inputBuffer.getChannelData(0);
      const buf = new ArrayBuffer(f.length * 2);
      const dv = new DataView(buf);
      for (let i = 0; i < f.length; i++) {
        let x = Math.max(-1, Math.min(1, f[i]));
        dv.setInt16(i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
      }
      acPush.write(buf);
    };
    return true;
  } catch (e) {
    console.warn("sys", e);
    return true;
  }
}
function stopSysAudio() {
  try {
    if (acSysNode) {
      acSysNode.disconnect();
      acSysNode = null;
    }
    if (acSysGain) {
      acSysGain.disconnect();
      acSysGain = null;
    }
    if (acSysCtx) {
      acSysCtx.close();
      acSysCtx = null;
    }
    if (acPush) {
      try {
        acPush.close();
      } catch (e) {}
      acPush = null;
    }
    if (acSysRec && acSysRunning) {
      acSysRec.stopContinuousRecognitionAsync(() => {
        try {
          acSysRec.close();
        } catch (e) {}
        acSysRec = null;
        acSysRunning = false;
      });
    }
  } catch (e) {}
  document.getElementById("acSysInd")?.classList.add("hidden");
}
async function startMixRecording() {
  try {
    if (mixRec) return;
    if (!window.MediaRecorder) return;
    mixCtx = new (window.AudioContext || window.webkitAudioContext)();
    mixDest = mixCtx.createMediaStreamDestination();
    try {
      acMicStream = await navigator.mediaDevices.getUserMedia(
        window.ftMicConstraint(),
      );
      mixCtx.createMediaStreamSource(acMicStream).connect(mixDest);
    } catch (e) {
      try {
        acMicStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mixCtx.createMediaStreamSource(acMicStream).connect(mixDest);
      } catch (_) {}
    }
    try {
      if (acStream && acStream.getAudioTracks().length)
        mixCtx
          .createMediaStreamSource(new MediaStream(acStream.getAudioTracks()))
          .connect(mixDest);
    } catch (e) {}
    let mime = "";
    [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ].forEach((m) => {
      if (!mime && MediaRecorder.isTypeSupported(m)) mime = m;
    });
    mixRec = new MediaRecorder(
      mixDest.stream,
      mime ? { mimeType: mime } : undefined,
    );
    mixChunks = [];
    mixRec.ondataavailable = (e) => {
      if (e.data && e.data.size) mixChunks.push(e.data);
    };
    mixRec.start(1000);
    const b = document.getElementById("acDlRec");
    if (b) b.classList.add("hidden");
    const s = document.getElementById("acRecInd");
    if (s) s.classList.remove("hidden");
  } catch (e) {
    console.warn("mix", e);
  }
}
function addSysToMix() {
  try {
    if (mixCtx && mixDest && acStream && acStream.getAudioTracks().length)
      mixCtx
        .createMediaStreamSource(new MediaStream(acStream.getAudioTracks()))
        .connect(mixDest);
  } catch (e) {}
}
function stopMixRecording() {
  if (!mixRec) return;
  try {
    mixRec.onstop = () => {
      const type = (mixChunks[0] && mixChunks[0].type) || "audio/webm";
      const blob = new Blob(mixChunks, { type });
      if (mixURL) {
        try {
          URL.revokeObjectURL(mixURL);
        } catch (e) {}
      }
      mixURL = URL.createObjectURL(blob);
      const ext = type.indexOf("ogg") >= 0 ? "ogg" : "webm";
      const fn =
        "FANTASTIC_recording_" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        "." +
        ext;
      const kb = Math.round(blob.size / 1024);
      const b = document.getElementById("acDlRec");
      if (b) {
        b.classList.remove("hidden");
        b.textContent = "⬇️ Download recording (" + kb + " KB · mic + system)";
        b.onclick = () => {
          const a = document.createElement("a");
          a.href = mixURL;
          a.download = fn;
          a.click();
          try {
            logAudit("Downloaded recording", fn, "data");
          } catch (e) {}
        };
      }
      const s = document.getElementById("acRecInd");
      if (s) s.classList.add("hidden");
      try {
        acMicStream && acMicStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      try {
        mixCtx && mixCtx.close();
      } catch (e) {}
      mixCtx = null;
      mixDest = null;
      mixRec = null;
    };
    mixRec.stop();
  } catch (e) {
    console.warn("stopmix", e);
  }
}
async function acShareScreen() {
  const prev = document.getElementById("acSharePrev");
  if (!acActive) {
    await acToggle();
  }
  try {
    acStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    prev.innerHTML = "<video autoplay muted></video>";
    const v = prev.querySelector("video");
    v.srcObject = acStream;
    acStream.getVideoTracks()[0].onended = () => {
      stopSysAudio();
      prev.innerHTML = "<span>Screen share ended.</span>";
      document.getElementById("acShareNote").textContent = "";
    };
    const hasAudio = startSysAudio(acStream);
    addSysToMix();
    const note = document.getElementById("acShareNote");
    if (hasAudio) {
      note.innerHTML =
        "🔊 <b>System audio captured</b>" +
        (sttMode === "azure" && azureCfg.key
          ? " — transcribing customer side via Azure STT."
          : " — enable <b>Azure STT</b> to transcribe it.");
    } else {
      note.innerHTML =
        "⚠️ <b>No system audio.</b> Pick a <b>Chrome Tab</b> and tick <b>Share tab audio</b>, then Share again.";
    }
  } catch (e) {
    document.getElementById("acShareMsg").textContent =
      "Screen share cancelled or blocked.";
  }
}
function acHandle(text, src) {
  const spk = classifySpeaker(text);
  const now = Date.now();
  const dur = acTurnStart ? (now - acTurnStart) / 1000 : 2;
  const words = text.trim().split(/\s+/).length;
  const prev = acConvo[acConvo.length - 1];
  const interrupted = prev && prev.speaker !== spk && dur < 1.2;
  acConvo.push({
    speaker: spk,
    text,
    words,
    dur: Math.max(0.5, dur),
    interrupted,
    src: src || "mic",
  });
  acTurnStart = now;
  acAddMsg(text, false, src === "system" ? "system" : spk);
  acUpdateChecklist();
  acRenderTalkTime();
  acRenderTimeline();
  aiGuide("ac");
}
function acInjectManual(fromAI) {
  const inp = document.getElementById("acManual");
  const text = inp.value.trim();
  if (!text) return;
  acNextSpeaker = "agent";
  acHandle(text);
  inp.value = "";
}
function acJoined() {
  return acConvo.map((c) => c.text).join(" ");
}
function acAgentText() {
  return acConvo
    .filter((c) => c.speaker === "agent")
    .map((c) => c.text)
    .join(" ");
}
function acRenderTalkTime() {
  const el = document.getElementById("acTalkTime");
  if (!el) return;
  const ag = acConvo.filter((c) => c.speaker === "agent"),
    cu = acConvo.filter((c) => c.speaker === "customer");
  const aw = ag.reduce((s, c) => s + (c.words || 0), 0),
    cw = cu.reduce((s, c) => s + (c.words || 0), 0),
    tw = aw + cw || 1;
  const aPct = Math.round((aw / tw) * 100),
    cPct = 100 - aPct;
  const interr = acConvo.filter((c) => c.interrupted).length;
  const sys = acConvo.filter((c) => c.src === "system").length;
  el.innerHTML =
    '<div class="tt-wrap"><div class="tt-a" data-style-width="' +
    Math.max(6, aPct) +
    '%">🎧 ' +
    aPct +
    '%</div><div class="tt-c" data-style-width="' +
    Math.max(6, cPct) +
    '%">🧑 ' +
    cPct +
    '%</div></div><div class="sum-line"><b>🎧 Agent (mic)</b><span>' +
    ag.length +
    " turns · " +
    aw +
    ' words</span></div><div class="sum-line"><b>🧑 Customer</b><span>' +
    cu.length +
    " turns · " +
    cw +
    ' words</span></div><div class="sum-line"><b>🔊 From system audio</b><span>' +
    sys +
    ' turns</span></div><div class="sum-line"><b>Interruptions</b><span>' +
    interr +
    "</span></div>";
  window._acTalk = {
    aPct,
    cPct,
    agTurns: ag.length,
    cuTurns: cu.length,
    interr,
    sys,
  };
}
function acRenderTimeline() {
  const el = document.getElementById("acTimeline");
  if (!el || !acConvo.length) return;
  const total = acConvo.reduce((s, c) => s + (c.dur || 1), 0) || 1;
  function segs(role) {
    return acConvo
      .map((c) => {
        const w = ((c.dur || 1) / total) * 100;
        if (c.speaker !== role)
          return (
            '<div class="tl-seg u-bg-transparent" data-style-width="' +
            w +
            '%"></div>'
          );
        return (
          '<div class="tl-seg ' +
          (c.interrupted ? "overtalk" : role) +
          '" data-style-width="' +
          w +
          '%" title="' +
          role +
          ": " +
          (c.words || 0) +
          'w">' +
          (c.interrupted ? '<span class="tl-mark">🔴</span>' : "") +
          "</div>"
        );
      })
      .join("");
  }
  const interr = acConvo.filter((c) => c.interrupted).length;
  el.innerHTML =
    '<div class="tl-wrap"><div class="tl-row"><div class="tl-lab">🎧 Agent</div><div class="tl-track">' +
    segs("agent") +
    '</div></div><div class="tl-row"><div class="tl-lab">🧑 Customer</div><div class="tl-track">' +
    segs("customer") +
    '</div></div></div><div class="tl-legend"><span><i class="u-bg-teal"></i>Agent</span><span><i class="u-bg-slate"></i>Customer</span><span><i class="u-bg-red"></i>🔴 Overtalk</span></div><div class="note">' +
    acConvo.length +
    " turns · " +
    interr +
    " interruptions.</div>";
}
async function acToggle() {
  const btn = document.getElementById("acStart");
  if (!acActive) {
    if (!SR && sttMode === "browser") {
      alert("Needs Chrome/Edge or Azure STT.");
      return;
    }
    await ensureMic();
    acActive = true;
    acConvo = [];
    acTEl.innerHTML = "";
    acNextSpeaker = "auto";
    acLastSpeaker = "customer";
    acStartTime = Date.now();
    acTurnStart = 0;
    syncDiaButtons();
    document.getElementById("acMicInd").classList.remove("hidden");
    btn.textContent = "⏹️ Stop";
    btn.style.background = "var(--red)";
    acStartRec();
    acRenderChecklist();
    startMixRecording();
  } else {
    acActive = false;
    acStopRec();
    document.getElementById("acMicInd").classList.add("hidden");
    btn.textContent = "🎙️ Start";
    btn.style.background = "";
    if (acConvo.length) acEndSession(true);
  }
}
const AC_CHECKS = [
  {
    id: "greet",
    label: "Branded greeting",
    re: /(hello|hi|good|welcome|thank you for calling|salamat|magandang|buenos|kumusta|maayong|naimbag|maupay)/i,
  },
  {
    id: "empathy",
    label: "Empathy / Apology",
    re: /(sorry|apolog|understand|pasensya|pasaylo|lo siento|nasabtan|nabatyagan|dispensar)/i,
  },
  {
    id: "verify",
    label: "Identity verification",
    re: /(verify|otp|account number|i-verify|verificar)/i,
  },
  {
    id: "resolve",
    label: "Resolution",
    re: /(i'll|let me|i can|process|file|resolve|fix|refund|credit|gagawin|ayusin|tabang|bulig)/i,
  },
  {
    id: "close",
    label: "Proper closing",
    re: /(anything else|glad to help|thank you for calling|salamat po|algo m[aá]s|paalam|babay|agyaman)/i,
  },
  { id: "compliance", label: "No sensitive data exposed", re: null },
];
function acRenderChecklist() {
  const el = document.getElementById("acChecklist");
  if (el)
    el.innerHTML = AC_CHECKS.map(
      (c) =>
        '<div class="check-item" id="ac_' +
        c.id +
        '"><div class="cx">○</div><div>' +
        c.label +
        "</div></div>",
    ).join("");
  document.getElementById("acLiveScore").textContent = "0%";
}
function acUpdateChecklist() {
  const dia = document.getElementById("acDiaOn")?.checked;
  const full = acJoined();
  const ao = acAgentText();
  let pass = 0;
  AC_CHECKS.forEach((c) => {
    let ok;
    if (c.id === "compliance")
      ok = !FRAUD_RULES.slice(0, 3).some((r) => r.test(full));
    else ok = c.re.test(dia && ao ? ao : full);
    const row = document.getElementById("ac_" + c.id);
    if (!row) return;
    row.className = "check-item " + (ok ? "pass" : "");
    row.querySelector(".cx").textContent = ok ? "✓" : "○";
    if (ok) pass++;
  });
  document.getElementById("acLiveScore").textContent =
    Math.round((pass / AC_CHECKS.length) * 100) + "%";
}
function acUseLive() {
  const dia = document.getElementById("acDiaOn")?.checked;
  document.getElementById("acTaInput").value = acConvo
    .map((c) =>
      dia
        ? (c.speaker === "agent" ? "Agent: " : "Customer: ") + c.text
        : c.text,
    )
    .join("\n");
}
function acEvalTranscript() {
  const raw = document.getElementById("acTaInput").value.trim();
  if (!raw) {
    alert("Paste a transcript first.");
    return 0;
  }
  const full = raw.toLowerCase();
  let earned = 0,
    total = 0;
  const rows = [];
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
    rows.push({ label: c.label, ok, w });
  });
  const pct = Math.round((earned / total) * 100);
  document.getElementById("acEvalResult").innerHTML =
    '<div class="u-score-large" data-style-color="' +
    (pct >= 85 ? "var(--green)" : pct >= 70 ? "var(--amber)" : "var(--red)") +
    '">' +
    pct +
    '<span class="u-fs-15">/100</span></div>' +
    rows
      .map(
        (r) =>
          '<div class="check-item ' +
          (r.ok ? "pass" : "fail") +
          '"><div class="cx">' +
          (r.ok ? "✓" : "✕") +
          "</div><div>" +
          r.label +
          '</div><span class="u-right-strong">' +
          (r.ok ? r.w : 0) +
          "/" +
          r.w +
          "</span></div>",
      )
      .join("");
  return pct;
}
function acEndSession(silent) {
  if (acActive) {
    acActive = false;
    acStopRec();
    document.getElementById("acMicInd").classList.add("hidden");
    const b = document.getElementById("acStart");
    b.textContent = "🎙️ Start";
    b.style.background = "";
  }
  stopSysAudio();
  stopMixRecording();
  const name = (
    document.getElementById("acAgentName").value || "Live Agent"
  ).trim();
  const aid = (document.getElementById("acAgentId").value || "").trim();
  acUseLive();
  const score = acEvalTranscript() || 0;
  const tt = window._acTalk || {};
  const ag = findAgent(name, aid);
  const rec = {
    id: "INT-" + Date.now(),
    date: new Date().toISOString(),
    mode: "Live Agent Convo (diarized)",
    agent: ag ? ag.first + " " + ag.last : name,
    agentId: aid || (ag ? ag.emp : ""),
    site: ag ? ag.site : "",
    bu: ag ? ag.bu : "",
    section: ag ? ag.section : "",
    sub: ag ? ag.sub : "",
    lang: document.getElementById("acLang").selectedOptions[0].text,
    durationSec: acStartTime
      ? Math.floor((Date.now() - acStartTime) / 1000)
      : 0,
    turns: acConvo.length,
    sentiment: { pos: 0, neu: tt.cuTurns || 0, neg: 0, dom: "Neutral" },
    fraudScore: 0,
    gapPct: score,
    resolved: score >= 70,
    talkTime: tt,
    interruptions: acConvo.filter((c) => c.interrupted).length,
    transcript: acConvo.map((c) => ({
      role: c.speaker,
      who: c.speaker === "agent" ? "ai" : "cust",
      text: c.text,
    })),
  };
  const arr = loadInteractions();
  arr.unshift(rec);
  saveInteractionsArr(arr);
  renderLibrary();
  awardPoints(name, {
    quality: score,
    training: 0,
    tag: "Live agent session",
    agentId: aid,
  });
  if (aiCfg.autoSummary) aiDraftSummary("ac");
  const msg = document.createElement("div");
  msg.className = "conn ok";
  msg.style.marginTop = "10px";
  msg.textContent =
    "✅ Saved & posted " +
    score +
    "/100" +
    (ag ? " · " + ag.site + "/" + ag.bu : "") +
    ". Recording ready in the Screen-Share card.";
  document.getElementById("acEvalResult").prepend(msg);
  if (!silent)
    alert("✅ Session for " + name + ": " + score + "/100 saved & posted!");
}
