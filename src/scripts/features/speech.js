const synth = window.speechSynthesis;
let voices = [];
function loadVoices() {
  voices = synth.getVoices();
  const sel = document.getElementById("ttsVoice");
  if (!sel) return;
  sel.innerHTML = "";
  voices.forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = v.name + " (" + v.lang + ")";
    sel.appendChild(o);
  });
}
loadVoices();
if (synth) synth.onvoiceschanged = loadVoices;
const orb = document.getElementById("orb");
function loadMicDefault() {
  try {
    return localStorage.getItem("ft_micDefault") || "";
  } catch (e) {
    return "";
  }
}
window.ftMicId = loadMicDefault();
window.ftMicConstraint = function () {
  return window.ftMicId
    ? { audio: { deviceId: { exact: window.ftMicId } } }
    : { audio: true };
};
async function ftListMics() {
  let devices = [];
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch (e) {}
  const mics = devices.filter((d) => d.kind === "audioinput");
  document.querySelectorAll(".ftMicSel").forEach((sel) => {
    const cur = window.ftMicId;
    sel.innerHTML =
      '<option value="">🎤 System default mic</option>' +
      mics
        .map((m, i) => {
          const virt =
            /virtual|vb-?audio|cable|voicemeeter|obs|blackhole|stereo mix/i.test(
              m.label || "",
            )
              ? " · virtual"
              : "";
          return (
            '<option value="' +
            m.deviceId +
            '">' +
            (m.label || "Microphone " + (i + 1)) +
            virt +
            "</option>"
          );
        })
        .join("");
    if (cur && mics.some((m) => m.deviceId === cur)) sel.value = cur;
  });
  return mics;
}
async function ftGrantMic() {
  try {
    const s = await navigator.mediaDevices.getUserMedia(
      window.ftMicConstraint(),
    );
    s.getTracks().forEach((t) => t.stop());
  } catch (e) {
    try {
      const s2 = await navigator.mediaDevices.getUserMedia({ audio: true });
      s2.getTracks().forEach((t) => t.stop());
    } catch (_) {}
  }
  await ftListMics();
  ftStartMeter();
}
window.ftListMics = ftListMics;
window.ftGrantMic = ftGrantMic;
window.ftOnMicChange = function (v) {
  window.ftMicId = v;
  document.querySelectorAll(".ftMicSel").forEach((s) => {
    if (s.value !== v) s.value = v;
  });
  const remember =
    (document.getElementById("ftMicDefault") &&
      document.getElementById("ftMicDefault").checked) ||
    (document.getElementById("ftMicDefault2") &&
      document.getElementById("ftMicDefault2").checked);
  if (remember) {
    try {
      localStorage.setItem("ft_micDefault", v || "");
    } catch (e) {}
  }
  try {
    logAudit(
      "Microphone changed",
      (v ? "device" : "system default") + (remember ? " (default)" : ""),
      "config",
    );
  } catch (e) {}
  try {
    if (callActive && sttMode === "azure") {
      stopAzureRec();
      setTimeout(() => startRec(), 300);
    }
  } catch (e) {}
  try {
    setStatus("Mic set: " + (v ? "selected device" : "system default"), "");
  } catch (e) {}
  ftStartMeter();
};
let _mS = null,
  _mC = null,
  _mR = null;
async function ftStartMeter() {
  ftStopMeter();
  try {
    _mS = await navigator.mediaDevices.getUserMedia(window.ftMicConstraint());
    _mC = new (window.AudioContext || window.webkitAudioContext)();
    const src = _mC.createMediaStreamSource(_mS);
    const an = _mC.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const bars = ["ftLvlBar", "ftLvlBar2"].map((id) =>
      document.getElementById(id),
    );
    const loop = () => {
      an.getByteTimeDomainData(data);
      let pk = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128);
        if (v > pk) pk = v;
      }
      const pct = Math.min(100, Math.round((pk / 128) * 180));
      bars.forEach((b) => {
        if (b) b.style.width = pct + "%";
      });
      _mR = requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {}
}
function ftStopMeter() {
  try {
    if (_mR) cancelAnimationFrame(_mR);
  } catch (e) {}
  try {
    _mS && _mS.getTracks().forEach((t) => t.stop());
  } catch (e) {}
  try {
    _mC && _mC.close();
  } catch (e) {}
  _mS = _mC = _mR = null;
  ["ftLvlBar", "ftLvlBar2"].forEach((id) => {
    const b = document.getElementById(id);
    if (b) b.style.width = "0";
  });
}
window.ftStartMeter = ftStartMeter;
window.ftStopMeter = ftStopMeter;
try {
  navigator.mediaDevices.addEventListener("devicechange", ftListMics);
} catch (e) {}
let azureCfg = {
  enabled: false,
  key: "",
  region: "southeastasia",
  voice: "fil-PH-BlessicaNeural",
  style: "",
};
const azureAudio = new Audio();
let curLang = "en";
function setLivePill(l) {
  curLang = l;
  const p = document.getElementById("liveLangPill");
  if (p) p.textContent = langLabel(l);
}
function voiceForLang(l) {
  const rl = (document.getElementById("recLang") || {}).value || "en-US";
  if (rl === "ja-JP") return "ja-JP-NanamiNeural";
  if (rl === "zh-HK") return "zh-HK-HiuMaanNeural";
  if (["tl", "ceb", "hil", "ilo", "war", "taglish"].includes(l))
    return "fil-PH-BlessicaNeural";
  if (rl === "es-ES") return "es-ES-ElviraNeural";
  return "en-US-AvaMultilingualNeural";
}
async function azureSynth(text, voiceOverride) {
  const voice = voiceOverride || azureCfg.voice;
  const loc = voice.substring(0, 5);
  const inner = azureCfg.style
    ? '<mstts:express-as style="' +
      azureCfg.style +
      '">' +
      esc(text) +
      "</mstts:express-as>"
    : esc(text);
  const ssml =
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="' +
    loc +
    '"><voice name="' +
    voice +
    '">' +
    inner +
    "</voice></speak>";
  const res = await fetch(
    "https://" +
      azureCfg.region +
      ".tts.speech.microsoft.com/cognitiveservices/v1",
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureCfg.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      },
      body: ssml,
    },
  );
  if (!res.ok) throw new Error("Azure TTS " + res.status);
  return URL.createObjectURL(
    new Blob([await res.arrayBuffer()], { type: "audio/mpeg" }),
  );
}
function pickBrowserVoice(l) {
  const rl = (document.getElementById("recLang") || {}).value || "en-US";
  let want = ["tl", "ceb", "hil", "ilo", "war", "taglish"].includes(l)
    ? "fil"
    : rl === "ja-JP"
      ? "ja"
      : rl === "zh-HK"
        ? "zh"
        : rl === "es-ES"
          ? "es"
          : "en";
  return (
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(want)) || null
  );
}
function browserSpeak(text, l) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const pv = pickBrowserVoice(l);
  if (pv) u.voice = pv;
  else {
    const vi = document.getElementById("ttsVoice").value;
    if (voices[vi]) u.voice = voices[vi];
  }
  u.rate = parseFloat(document.getElementById("rate").value);
  u.onstart = () => {
    orb && orb.classList.add("speaking");
    setStatus("Speaking…", "live");
  };
  u.onend = () => {
    orb && orb.classList.remove("speaking");
    if (callActive) {
      setStatus("Listening…", "live");
      startRec();
    }
  };
  synth.speak(u);
}
function speak(text, langHint) {
  const l = langHint || curLang;
  if (azureCfg.enabled && azureCfg.key) {
    setStatus("Synthesizing…", "live");
    azureSynth(text, voiceForLang(l))
      .then((url) => {
        azureAudio.src = url;
        azureAudio.onplay = () => {
          orb && orb.classList.add("speaking");
          setStatus("Speaking (Azure)…", "live");
        };
        azureAudio.onended = () => {
          orb && orb.classList.remove("speaking");
          if (callActive) {
            setStatus("Listening…", "live");
            startRec();
          }
        };
        azureAudio.play();
      })
      .catch((e) => browserSpeak(text, l));
  } else browserSpeak(text, l);
}
function stopSpeaking() {
  synth && synth.cancel();
  try {
    azureAudio.pause();
  } catch (e) {}
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null,
  callActive = false,
  muted = false,
  interimEl = null,
  sttMode = "browser",
  azRec = null,
  azRunning = false;
function recLangFor() {
  let v = (document.getElementById("recLang") || {}).value || "en-US";
  if (v.indexOf("fil-PH-") === 0) v = "fil-PH";
  return v;
}
function startRec() {
  if (!callActive || muted) return;
  if (sttMode === "azure" && azureCfg.key && window.SpeechSDK) startAzureRec();
  else startBrowserRec();
}
function stopRec() {
  try {
    rec && rec.abort();
  } catch (e) {}
  stopAzureRec();
  orb && orb.classList.remove("listening");
}
function startBrowserRec() {
  if (!SR) {
    const t = document.getElementById("transcript");
    if (t)
      t.innerHTML =
        '<div class="note" style="color:var(--red)">⚠️ No browser speech recognition. Use Chrome/Edge or enable Azure STT.</div>';
    return;
  }
  try {
    if (rec) rec.abort();
  } catch (e) {}
  try {
    rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = recLangFor();
    rec.onresult = (e) => {
      let interim = "",
        final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tr;
        else interim += tr;
      }
      if (interim) {
        if (!interimEl) interimEl = addMsg("cust", "", true);
        interimEl.querySelector(".txt").textContent = interim;
      }
      if (final) {
        if (interimEl) {
          interimEl.remove();
          interimEl = null;
        }
        handleCustomer(final.trim());
      }
    };
    rec.onend = () => {
      orb && orb.classList.remove("listening");
      if (
        sttMode === "browser" &&
        callActive &&
        !muted &&
        !(synth && synth.speaking)
      )
        setTimeout(startBrowserRec, 300);
    };
    rec.onerror = (ev) => {
      orb && orb.classList.remove("listening");
      if (
        ev &&
        (ev.error === "not-allowed" || ev.error === "service-not-allowed")
      ) {
        const t = document.getElementById("transcript");
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
    rec.start();
    orb && orb.classList.add("listening");
  } catch (e) {
    setTimeout(() => {
      try {
        rec && rec.start();
      } catch (_) {}
    }, 400);
  }
}
function azAudioCfg() {
  return window.ftMicId
    ? SpeechSDK.AudioConfig.fromMicrophoneInput(window.ftMicId)
    : SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
}
function startAzureRec() {
  if (azRunning) return;
  try {
    const cfg = SpeechSDK.SpeechConfig.fromSubscription(
      azureCfg.key,
      azureCfg.region,
    );
    cfg.speechRecognitionLanguage = recLangFor();
    azRec = new SpeechSDK.SpeechRecognizer(cfg, azAudioCfg());
    azRec.recognizing = (s, e) => {
      const t = e.result.text;
      if (!t) return;
      if (!interimEl) interimEl = addMsg("cust", "", true);
      interimEl.querySelector(".txt").textContent = t;
    };
    azRec.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        if (interimEl) {
          interimEl.remove();
          interimEl = null;
        }
        const t = e.result.text.trim();
        if (t) handleCustomer(t);
      }
    };
    azRec.canceled = () => azFallback();
    azRec.startContinuousRecognitionAsync(
      () => {
        azRunning = true;
        orb && orb.classList.add("listening");
        setStatus(
          "Listening (Azure · " +
            (window.ftMicId ? "selected mic" : "default") +
            ")…",
          "live",
        );
      },
      () => azFallback(),
    );
  } catch (e) {
    azFallback();
  }
}
function stopAzureRec() {
  if (azRec && azRunning) {
    try {
      azRec.stopContinuousRecognitionAsync(() => {
        try {
          azRec.close();
        } catch (e) {}
        azRec = null;
        azRunning = false;
      });
    } catch (e) {
      azRunning = false;
    }
  }
}
function azFallback() {
  azRunning = false;
  sttMode = "browser";
  document.getElementById("sttAzure")?.classList.remove("on");
  document.getElementById("sttBrowser")?.classList.add("on");
  if (callActive && !muted) setTimeout(startBrowserRec, 300);
}
const rlSel = document.getElementById("recLang");
if (rlSel)
  rlSel.addEventListener("change", () => {
    if (callActive && sttMode === "browser") {
      try {
        rec && rec.abort();
      } catch (e) {}
    }
  });
