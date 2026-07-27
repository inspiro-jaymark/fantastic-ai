/* ===== SETTINGS ===== */
function setTTSMode(m) {
  const isAz = m === "azure";
  document.getElementById("modeAzure").classList.toggle("on", isAz);
  document.getElementById("modeBrowser").classList.toggle("on", !isAz);
  document.getElementById("azurePanel").classList.toggle("hidden", !isAz);
  document.getElementById("browserVoiceWrap").classList.toggle("hidden", isAz);
  azureCfg.enabled = isAz;
  if (isAz) saveAzure(true);
}
function saveAzure(silent) {
  azureCfg.key = document.getElementById("azKey").value.trim();
  azureCfg.region = document.getElementById("azRegion").value;
  azureCfg.voice = document.getElementById("azVoice").value;
  azureCfg.style = document.getElementById("azStyle").value;
  const c = document.getElementById("azConn");
  if (!silent) {
    if (azureCfg.key) {
      c.className = "conn ok";
      c.textContent = "✅ Saved.";
    } else {
      c.className = "conn err";
      c.textContent = "⚠️ Paste key.";
    }
  }
}
async function testAzure() {
  saveAzure(true);
  const c = document.getElementById("azConn");
  if (!azureCfg.key) {
    c.className = "conn err";
    c.textContent = "⚠️ Paste key.";
    return;
  }
  c.className = "conn wait";
  c.textContent = "⏳…";
  try {
    const url = await azureSynth(
      "Hello! Kumusta po! Maayong adlaw! This is your FANTASTIC AI voice.",
      azureCfg.voice,
    );
    azureAudio.src = url;
    azureAudio.play();
    c.className = "conn ok";
    c.textContent = "✅ Works.";
  } catch (e) {
    c.className = "conn err";
    c.textContent = "❌ " + e.message;
  }
}
["azVoice", "azStyle", "azRegion"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.onchange = () => saveAzure(true);
});
const azk = document.getElementById("azKey");
if (azk) azk.oninput = () => saveAzure(true);
function setSTTMode(m) {
  const isAz = m === "azure";
  const c = document.getElementById("sttConn");
  if (isAz) {
    if (!window.SpeechSDK) {
      c.className = "conn err";
      c.textContent = "❌ SDK not loaded.";
      return;
    }
    saveAzure(true);
    if (!azureCfg.key) {
      c.className = "conn err";
      c.textContent = "⚠️ Enter Azure key first.";
      return;
    }
    c.className = "conn ok";
    c.textContent =
      "✅ Azure STT enabled (honors selected/virtual mic + shared system audio).";
  } else {
    c.className = "";
    c.textContent = "";
  }
  sttMode = isAz ? "azure" : "browser";
  document.getElementById("sttAzure").classList.toggle("on", isAz);
  document.getElementById("sttBrowser").classList.toggle("on", !isAz);
}
[
  "claudeKey",
  "claudeModel",
  "copilotEndpoint",
  "copilotKey",
  "copilotDeploy",
  "copilotVer",
  "aiAutoGuide",
  "aiAutoSummary",
].forEach((id) => {
  const el = document.getElementById(id);
  if (el)
    el.addEventListener("change", () => {
      syncAICfgFromInputs();
      logAudit("AI config updated", aiCfg.provider, "config");
    });
});
const cpEp = document.getElementById("copilotEndpoint");
if (cpEp)
  cpEp.addEventListener("blur", () => {
    if (cpEp.value.trim()) {
      cpEp.value = normalizeAzureEndpoint(cpEp.value);
      syncAICfgFromInputs();
    }
  });
function initAIUI() {
  document.getElementById("claudeKey").value = aiCfg.claudeKey || "";
  const cm = document.getElementById("claudeModel");
  if (cm && [...cm.options].some((o) => o.value === aiCfg.claudeModel))
    cm.value = aiCfg.claudeModel;
  document.getElementById("copilotEndpoint").value = aiCfg.copEndpoint || "";
  document.getElementById("copilotKey").value = aiCfg.copKey || "";
  document.getElementById("copilotDeploy").value = aiCfg.copDeploy || "gpt-4o";
  document.getElementById("copilotVer").value =
    aiCfg.copVer || "2024-08-01-preview";
  document.getElementById("aiAutoGuide").checked = aiCfg.auto !== false;
  document.getElementById("aiAutoSummary").checked =
    aiCfg.autoSummary !== false;
  setAIProvider(aiCfg.provider || "claude");
}
function setupPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;

    button.addEventListener("click", () => {
      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";
      button.classList.toggle("is-visible", showPassword);

      const label = showPassword ? "Hide password" : "Show password";
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  });
}
["ftMicDefault", "ftMicDefault2"].forEach((id) => {
  const c = document.getElementById(id);
  if (c) {
    c.checked = !!loadMicDefault() && loadMicDefault() === window.ftMicId;
    c.onchange = function () {
      if (this.checked) {
        try {
          localStorage.setItem("ft_micDefault", window.ftMicId || "");
        } catch (e) {}
        logAudit(
          "Default mic saved",
          window.ftMicId ? "device" : "system default",
          "config",
        );
      } else {
        try {
          localStorage.removeItem("ft_micDefault");
        } catch (e) {}
      }
    };
  }
});
(function () {
  const wrap = document.getElementById("liveStars");
  if (wrap) {
    wrap.querySelectorAll(".st").forEach((st) => {
      st.addEventListener("click", () => {
        const v = +st.dataset.v;
        window._liveStars = v;
        wrap
          .querySelectorAll(".st")
          .forEach((s) => s.classList.toggle("on", +s.dataset.v <= v));
      });
    });
  }
})();
renderRules();
updateFraudUI();
resetSupervisor();
renderKB();
initAIUI();
setupPasswordToggles();
const kbs = document.getElementById("kbSearch");
if (kbs) kbs.oninput = (e) => renderKB(e.target.value);
(function () {
  var lb = document.getElementById("logoutBtn");
  if (lb)
    lb.addEventListener("click", function (ev) {
      ev.preventDefault();
      logout();
    });
})();
setInterval(refreshDMBadge, 4000);
setInterval(refreshBell, 5000);
restoreSession();
