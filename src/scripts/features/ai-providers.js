const AI_SYS =
  "You are the live agent-assist SCRIPT WRITER for Inspiro/Infocom (PH BPO). From the transcript + KB, give the AGENT the single best next line + 1-2 alternatives. RULES: (1) reply in the customer's language — English, Tagalog, Cebuano, Hiligaynon, Ilokano, Waray, or Taglish. (2) If the customer is upset/reporting a problem, ALWAYS open with a sincere APOLOGY then EMPATHY before the solution. (3) Warm, concise, compliant (never collect card/OTP over voice). Format: 'SAY: <line>' then 'ALT: <a1> | <a2>' then 'TIP: <tip>'.";
const AI_SUM_SYS =
  "You are a QA analyst. Summarize the call: 2-3 sentence overview then bullets 'Intent:', 'Resolution:', 'Sentiment:', 'Language:', 'Compliance:', 'Coaching:'. Under 150 words.";
let aiBusy = false,
  aiLastCall = 0,
  aiTurnCount = 0;
function convoForTarget(target) {
  return target === "ac"
    ? acConvo.map(
        (c) => (c.speaker === "agent" ? "Agent: " : "Customer: ") + c.text,
      )
    : convo.map(
        (c) =>
          (c.role === "agent" || c.who === "ai" ? "Agent: " : "Customer: ") +
          c.text,
      );
}
function aiCtx(target) {
  const turns = convoForTarget(target);
  const recent = turns.slice(-8).join("\n");
  const last =
    (target === "ac"
      ? (acConvo[acConvo.length - 1] || {}).text
      : (convo[convo.length - 1] || {}).text) || "";
  const { best } = kbMatch(last || recent);
  const kb = best ? 'KB "' + best.q + '": ' + best.a : "No specific KB match.";
  const langNote =
    target === "ac"
      ? document.getElementById("acLang").selectedOptions[0].text
      : "detected " + langLabel(curLang);
  return (
    "Customer language: " +
    langNote +
    "\n\nRecent transcript:\n" +
    recent +
    "\n\nKnowledge base:\n" +
    kb +
    "\n\nWrite the next agent line in the customer\u2019s language."
  );
}
async function callClaude(prompt, sys) {
  if (!aiCfg.claudeKey)
    throw new Error(
      "Claude: API key is empty. Paste your sk-ant-... key in Setup.",
    );
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": aiCfg.claudeKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: aiCfg.claudeModel,
        max_tokens: 600,
        system: sys || AI_SYS,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (net) {
    throw new Error("Claude: network/CORS error. Check your connection.");
  }
  if (!res.ok) {
    let d = "";
    try {
      const j = await res.json();
      d = (j.error && (j.error.message || j.error.type)) || "";
    } catch (e) {}
    if (res.status === 404)
      throw new Error(
        'Claude 404 — model "' +
          aiCfg.claudeModel +
          '" not available on your key. Pick another model in Setup (e.g. Sonnet 4 or 3.5 Haiku).',
      );
    if (res.status === 401)
      throw new Error(
        "Claude 401 — invalid API key. Copy a fresh sk-ant-… key from console.anthropic.com.",
      );
    if (res.status === 400)
      throw new Error(
        "Claude 400 — " + (d || "bad request; usually an invalid model id."),
      );
    if (res.status === 429)
      throw new Error(
        "Claude 429 — rate limit or no credit balance on the key.",
      );
    if (res.status === 529)
      throw new Error("Claude 529 — Anthropic overloaded; try again shortly.");
    throw new Error("Claude " + res.status + " — " + d);
  }
  const dj = await res.json();
  return dj.content.map((x) => x.text).join("");
}
function normalizeAzureEndpoint(ep) {
  ep = (ep || "").trim();
  if (!ep) return "";
  if (!/^https?:\/\//i.test(ep)) ep = "https://" + ep;
  try {
    const u = new URL(ep);
    return u.protocol + "//" + u.host;
  } catch (e) {
    return ep
      .replace(/\/openai\/.*/i, "")
      .replace(/\/+$/, "")
      .split("?")[0];
  }
}
async function callCopilot(prompt, sys) {
  const base = normalizeAzureEndpoint(aiCfg.copEndpoint);
  const deploy = (aiCfg.copDeploy || "").trim();
  const ver = (aiCfg.copVer || "2024-08-01-preview").trim();
  if (!base) throw new Error("Copilot: Endpoint empty. Use base url only.");
  if (!deploy)
    throw new Error(
      "Copilot: Deployment name empty (Azure Foundry deployment, not model name).",
    );
  if (!aiCfg.copKey) throw new Error("Copilot: API key empty.");
  const url =
    base +
    "/openai/deployments/" +
    encodeURIComponent(deploy) +
    "/chat/completions?api-version=" +
    encodeURIComponent(ver);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "api-key": aiCfg.copKey, "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: sys || AI_SYS },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.4,
      }),
    });
  } catch (net) {
    throw new Error("Copilot: network/CORS error reaching " + base + ".");
  }
  if (!res.ok) {
    let d = "";
    try {
      const j = await res.json();
      d = (j.error && (j.error.message || j.error.code)) || JSON.stringify(j);
    } catch (e) {
      try {
        d = await res.text();
      } catch (_) {}
    }
    if (res.status === 404)
      throw new Error(
        'Copilot 404 — deployment "' +
          deploy +
          '" not found. Deployment must match EXACTLY your Azure Foundry deployment; endpoint = base url; api-version valid. Server: ' +
          d,
      );
    if (res.status === 401) throw new Error("Copilot 401 — invalid key.");
    throw new Error("Copilot " + res.status + " — " + d);
  }
  const dj = await res.json();
  return dj.choices[0].message.content;
}
async function callAI(prompt, sys) {
  return aiCfg.provider === "copilot"
    ? callCopilot(prompt, sys)
    : callClaude(prompt, sys);
}
function aiFormat(txt, target) {
  const lines = txt.split("\n").filter(Boolean);
  let html = "";
  window._lastSay = null;
  lines.forEach((l) => {
    const say = l.match(/^SAY:\s*(.*)/i),
      alt = l.match(/^ALT:\s*(.*)/i),
      tip = l.match(/^TIP:\s*(.*)/i);
    if (say) {
      window._lastSay = say[1];
      html += sugg(say[1], target, true);
    } else if (alt) {
      alt[1].split("|").forEach((a) => {
        if (a.trim()) html += sugg(a.trim(), target, false);
      });
    } else if (tip)
      html +=
        '<div class="note" style="margin-top:8px">🎓 ' + tip[1] + "</div>";
    else html += '<div style="margin-top:6px">' + l + "</div>";
  });
  return html || "<div>" + txt + "</div>";
}
function sugg(text, target, best) {
  const t = text.replace(/"/g, "&quot;");
  return (
    '<div class="ai-sugg"><span class="txt2">' +
    (best ? "💬 <b>" : "↪ ") +
    text +
    (best ? "</b>" : "") +
    '</span><button class="ai-ins" onclick="insertSuggestion(&quot;' +
    t +
    '&quot;)">➕ Insert</button></div>'
  );
}
function insertSuggestion(text) {
  const b = document.getElementById("supModeBanner");
  if (b) {
    b.textContent = "🤫 AI WHISPER → Agent: " + text;
    b.classList.add("show");
  }
  addMsg("sup", "🤖 AI suggestion inserted: " + text);
  if (!document.getElementById("agentconvo").classList.contains("hidden")) {
    const inp = document.getElementById("acManual");
    if (inp) {
      inp.value = text;
    }
    acInjectManual(true);
  }
}
function guideBox(target) {
  return document.getElementById(target === "ac" ? "acAiGuide" : "liveAiGuide");
}
function kbGuide(target) {
  const arr = target === "ac" ? acConvo : convo;
  const last = (arr[arr.length - 1] || {}).text || "";
  const { best, score } = kbMatch(last);
  const box = guideBox(target);
  if (!box) return;
  if (best && score > 0) {
    box.innerHTML =
      sugg(best.a.split(".")[0] + ".", target, true) +
      '<div class="note" style="margin-top:6px">📌 KB: ' +
      best.q +
      "</div>";
    window._lastSay = best.a.split(".")[0] + ".";
  } else {
    box.innerHTML =
      sugg(
        "Acknowledge, apologize if needed, empathize, then ask a clarifying question.",
        target,
        true,
      ) +
      '<div class="note" style="margin-top:6px">Built-in KB guidance (connect Claude for full multilingual script).</div>';
    window._lastSay = "Acknowledge, empathize, and ask a clarifying question.";
  }
  maybeAutoInsert(target);
}
function maybeAutoInsert(target) {
  if (
    target === "ac" &&
    document.getElementById("autoInsert")?.checked &&
    window._lastSay
  )
    insertSuggestion(window._lastSay);
}
async function aiGuide(target, force) {
  target =
    target ||
    (document.getElementById("agentconvo").classList.contains("hidden")
      ? "live"
      : "ac");
  if (!force) {
    if (!aiCfg.auto) return;
    aiTurnCount++;
    if (aiTurnCount % 2 !== 0) return;
    if (Date.now() - aiLastCall < 5000) return;
  }
  if (aiCfg.provider === "kb") {
    kbGuide(target);
    return;
  }
  if (aiBusy) return;
  const box = guideBox(target);
  if (!box) return;
  aiBusy = true;
  aiLastCall = Date.now();
  box.innerHTML =
    '<span class="thinking"><span class="spin"></span> ' +
    (aiCfg.provider === "claude" ? "Claude" : "Copilot") +
    " is writing the script…</span>";
  try {
    const txt = await callAI(aiCtx(target), AI_SYS);
    box.innerHTML = aiFormat(txt, target);
    maybeAutoInsert(target);
  } catch (e) {
    box.innerHTML =
      '<div class="conn err" style="display:block">⚠️ ' +
      e.message +
      " — using KB.</div>";
    kbGuide(target);
  } finally {
    aiBusy = false;
  }
}
function liveAiGuide() {
  aiGuide("live");
}
function aiGuideManual() {
  aiGuide("ac", true);
}
async function aiDraftSummary(target) {
  const box = document.getElementById(target === "ac" ? "acSummary" : null);
  const arr = target === "ac" ? acConvo : convo;
  if (!arr.length) {
    if (box) box.innerHTML = '<div class="note">No conversation yet.</div>';
    return;
  }
  const transcript = convoForTarget(target).join("\n");
  if (
    aiCfg.provider === "kb" ||
    !(aiCfg.provider === "claude" ? aiCfg.claudeKey : aiCfg.copKey)
  ) {
    const dom =
      sNeg >= sPos && sNeg >= sNeu
        ? "Negative"
        : sPos >= sNeu
          ? "Positive"
          : "Neutral";
    const kbHits = arr.filter((c) => c.kb).length;
    const txt =
      "Call handled over " +
      arr.length +
      " turns. Intent: " +
      ((
        arr.find(
          (c) => c.intent && !["Greeting", "Closing"].includes(c.intent),
        ) || {}
      ).intent || "general") +
      ". Resolution: " +
      (kbHits > 0 ? "KB-based answer provided" : "follow-up needed") +
      ". Sentiment: " +
      dom +
      ". Language: " +
      langLabel(curLang) +
      ". Compliance: " +
      (fraudFlags.some((f) => f.sev === "critical")
        ? "⚠️ critical flag"
        : "clean") +
      ". Coaching: " +
      (dom === "Negative"
        ? "apologize & empathize sooner"
        : "maintain strong rapport") +
      ".";
    window._aiSummary = txt;
    if (box)
      box.innerHTML =
        '<div class="ai-guide-box">' +
        txt +
        '</div><div class="note">Built-in summary (connect Claude for richer drafts).</div>';
    return txt;
  }
  if (box)
    box.innerHTML =
      '<span class="thinking"><span class="spin"></span> Drafting summary…</span>';
  try {
    const txt = await callAI("Transcript:\n" + transcript, AI_SUM_SYS);
    window._aiSummary = txt;
    if (box)
      box.innerHTML =
        '<div class="ai-guide-box">' +
        txt.replace(/\n/g, "<br>") +
        '</div><div class="ai-badge ' +
        aiCfg.provider +
        '" style="margin-top:8px">' +
        (aiCfg.provider === "claude" ? "Claude" : "Copilot") +
        "-drafted</div>";
    return txt;
  } catch (e) {
    if (box)
      box.innerHTML =
        '<div class="conn err" style="display:block">⚠️ ' +
        e.message +
        "</div>";
  }
}
function setAIProvider(p) {
  aiCfg.provider = p;
  saveAICfg();
  ["KB", "Claude", "Copilot"].forEach((x) => {
    const id = x.toLowerCase();
    document.getElementById("prov" + x)?.classList.toggle("on", id === p);
    document.getElementById("setProv" + x)?.classList.toggle("on", id === p);
  });
  const lab = p === "claude" ? "CLAUDE" : p === "copilot" ? "COPILOT" : "KB";
  ["acAiBadge", "liveAiBadge"].forEach((id) => {
    const b = document.getElementById(id);
    if (b) {
      b.textContent = lab;
      b.className = "ai-badge " + p;
    }
  });
}
async function testAI(p) {
  const c = document.getElementById(
    p === "claude" ? "claudeConn" : "copilotConn",
  );
  syncAICfgFromInputs();
  if (p === "claude" && !aiCfg.claudeKey) {
    c.className = "conn err";
    c.textContent = "⚠️ Paste your Anthropic key.";
    return;
  }
  if (p === "copilot" && (!aiCfg.copEndpoint || !aiCfg.copKey)) {
    c.className = "conn err";
    c.textContent = "⚠️ Enter endpoint + key + deployment.";
    return;
  }
  c.className = "conn wait";
  c.textContent = "⏳ Testing…";
  try {
    const txt = await (p === "claude"
      ? callClaude("Reply with exactly: connection ok")
      : callCopilot("Reply with exactly: connection ok"));
    c.className = "conn ok";
    c.textContent = "✅ Connected: " + txt.slice(0, 70);
    setAIProvider(p);
    logAudit("AI provider tested", p + " OK", "config");
  } catch (e) {
    c.className = "conn err";
    c.textContent = "❌ " + e.message;
  }
}
async function testBothAI() {
  const cur = aiCfg.provider || "kb";
  try {
    await testAI("claude");
  } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  try {
    await testAI("copilot");
  } catch (e) {}
  setAIProvider(cur);
}
function syncAICfgFromInputs() {
  aiCfg.claudeKey = document.getElementById("claudeKey").value.trim();
  aiCfg.claudeModel = document.getElementById("claudeModel").value;
  aiCfg.copEndpoint = document.getElementById("copilotEndpoint").value.trim();
  aiCfg.copKey = document.getElementById("copilotKey").value.trim();
  aiCfg.copDeploy =
    document.getElementById("copilotDeploy").value.trim() || "gpt-4o";
  aiCfg.copVer =
    document.getElementById("copilotVer").value.trim() || "2024-08-01-preview";
  aiCfg.auto = document.getElementById("aiAutoGuide").checked;
  aiCfg.autoSummary = document.getElementById("aiAutoSummary").checked;
  saveAICfg();
}
let aiCfg = {
  provider: "claude",
  claudeKey: "",
  claudeModel: "claude-opus-4-1-20250805",
  copEndpoint: "",
  copKey: "",
  copDeploy: "gpt-4o",
  copVer: "2024-08-01-preview",
  auto: true,
  autoSummary: true,
};
function loadAICfg() {
  try {
    Object.assign(aiCfg, JSON.parse(localStorage.getItem("ft_ai") || "{}"));
  } catch (e) {}
  if (aiCfg.claudeModel === "claude-opus-5" || !aiCfg.claudeModel)
    aiCfg.claudeModel = "claude-opus-4-1-20250805";
}
function saveAICfg() {
  store("ft_ai", aiCfg);
}
loadAICfg();
