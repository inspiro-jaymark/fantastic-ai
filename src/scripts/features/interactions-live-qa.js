function loadInteractions() {
  return read("ft_interactions", []);
}
function saveInteractionsArr(a) {
  store("ft_interactions", a);
}
function saveInteraction() {
  const arr = loadInteractions();
  const dom =
    sNeg >= sPos && sNeg >= sNeu
      ? "Negative"
      : sPos >= sNeu
        ? "Positive"
        : "Neutral";
  const kbHits = convo.filter((c) => c.kb).length;
  const gapPct = (window._gapData && window._gapData.pct) || null;
  const nm = document.getElementById("agInput").value;
  const ag = findAgent(nm, "");
  const rec = {
    id: "INT-" + Date.now(),
    date: new Date().toISOString(),
    mode:
      roleMode === "customer" ? "Training (AI customer)" : "Live (AI agent)",
    scenario: roleMode === "customer" && scen ? scen.label : "",
    agent: nm,
    agentId: ag ? ag.emp : "",
    site: ag ? ag.site : "",
    bu: ag ? ag.bu : "",
    section: ag ? ag.section : "",
    sub: ag ? ag.sub : "",
    lang: langLabel(curLang),
    mood: Math.round(moodVal),
    durationSec: Math.floor((Date.now() - startTime) / 1000),
    turns: custTurns,
    sentiment: { pos: sPos, neu: sNeu, neg: sNeg, dom },
    fraudScore,
    gapPct,
    resolved:
      roleMode === "customer" ? scenResolved : kbHits > 0 && dom !== "Negative",
    summary: window._aiSummary || "",
    transcript: convo.map((c) => ({
      role: c.role || (c.who === "ai" ? "agent" : "customer"),
      who: c.who,
      text: c.text,
      empathized: c.empathized,
    })),
  };
  arr.unshift(rec);
  saveInteractionsArr(arr);
  window._lastLiveId = rec.id;
  renderLibrary();
}
function replayHTML(r) {
  return (
    (r.transcript || [])
      .map(
        (m) =>
          '<div class="msg ' +
          (m.who || "cust") +
          '"><div class="who">' +
          (m.role === "agent" ? "🎧 Agent" : "🧑 Customer") +
          '</div><span class="txt">' +
          esc(m.text) +
          "</span></div>",
      )
      .join("") +
    (r.summary
      ? '<div class="ai-guide-box u-mt-10"><b>AI Summary:</b><br>' +
        esc(r.summary).replace(/\n/g, "<br>") +
        "</div>"
      : "")
  );
}
function renderLibrary(filter) {
  filter = filter || "";
  const arr = loadInteractions();
  const list = document.getElementById("libList");
  if (!list) return;
  const avgGap = arr.filter((r) => r.gapPct != null);
  const gapAvg = avgGap.length
    ? Math.round(avgGap.reduce((a, r) => a + r.gapPct, 0) / avgGap.length)
    : "—";
  const st = document.getElementById("libStats");
  if (st)
    st.innerHTML =
      '<div class="fchip"><b>' +
      arr.length +
      '</b> saved</div><div class="fchip"><b>' +
      arr.filter((r) => r.resolved).length +
      '</b> resolved</div><div class="fchip"><b>' +
      arr.filter((r) => r.manualRating).length +
      '</b> rated</div><div class="fchip">Avg gap <b>' +
      gapAvg +
      (gapAvg === "—" ? "" : "%") +
      "</b></div>";
  const f = filter.toLowerCase();
  const shown = arr.filter((r) =>
    (r.mode + (r.agent || "") + (r.site || "") + (r.bu || "") + (r.lang || ""))
      .toLowerCase()
      .includes(f),
  );
  document.getElementById("libEmpty").style.display = arr.length
    ? "none"
    : "block";
  list.innerHTML = shown
    .map((r) => {
      const d = new Date(r.date);
      const gap = r.gapPct != null ? "<span>🧩 " + r.gapPct + "%</span>" : "";
      const rate = r.manualRating
        ? "<span>⭐ " + r.manualRating + "/5</span>"
        : "";
      const lang = r.lang ? "<span>🌐 " + r.lang + "</span>" : "";
      const mood = r.mood != null ? "<span>🙂 " + r.mood + "</span>" : "";
      const org =
        r.site || r.bu
          ? "<span>🏢 " + [r.site, r.bu].filter(Boolean).join("/") + "</span>"
          : "";
      const who = r.agent ? "<span>👤 " + esc(r.agent) + "</span>" : "";
      return (
        '<div class="lib-card"><div class="lib-head"><div><b>' +
        d.toLocaleString() +
        '</b> <span class="kb-custom">' +
        r.mode +
        '</span><div class="lib-meta">' +
        who +
        org +
        lang +
        mood +
        "<span>💬 " +
        r.turns +
        "</span>" +
        gap +
        rate +
        '<span class="tag u-m-0 ' + (r.resolved ? "" : "y") +
        '">' +
        (r.resolved ? "Resolved" : "Follow-up") +
        '</span></div></div><div class="lib-actions"><button onclick="toggleReplay(\'' +
        r.id +
        "')\">👁 View</button><button onclick=\"exportInteraction('" +
        r.id +
        '\')">⬇️</button><button class="del" onclick="deleteInteraction(\'' +
        r.id +
        '\')">🗑</button></div></div><div class="replay" id="rp_' +
        r.id +
        '">' +
        replayHTML(r) +
        "</div></div>"
      );
    })
    .join("");
}
function toggleReplay(id) {
  const el = document.getElementById("rp_" + id);
  if (!el) return;
  el.style.display = el.style.display === "block" ? "none" : "block";
}
window.toggleReplay = toggleReplay;
function exportInteraction(id) {
  const r = loadInteractions().find((x) => x.id === id);
  if (!r) return;
  let out =
    "FANTASTIC — Interaction\n" +
    new Date(r.date).toLocaleString() +
    "\nAgent: " +
    (r.agent || "") +
    "\nLanguage: " +
    (r.lang || "") +
    "\nMood: " +
    (r.mood ?? "—") +
    "\nScore: " +
    (r.gapPct ?? "—") +
    (r.manualRating ? "\nRating: " + r.manualRating + "/5" : "") +
    "\n\n";
  r.transcript.forEach(
    (m) =>
      (out +=
        (m.role === "agent" ? "Agent" : "Customer") + ": " + m.text + "\n"),
  );
  if (r.summary) out += "\n=== AI SUMMARY ===\n" + r.summary + "\n";
  dl(out, "FANTASTIC_" + r.id + ".txt", "text/plain");
}
function deleteInteraction(id) {
  const interaction = loadInteractions().find((x) => x.id === id);
  appConfirm(
    {
      title: "Delete interaction?",
      message: interaction
        ? "Delete the saved interaction from " +
          new Date(interaction.date).toLocaleString() +
          "? This cannot be undone."
        : "Delete this saved interaction? This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    },
    () => {
      saveInteractionsArr(loadInteractions().filter((x) => x.id !== id));
      renderLibrary(document.getElementById("libSearch").value);
    },
  );
}
function downloadAllInteractions() {
  const count = loadInteractions().length;
  if (!count) {
    alert("Empty.");
    return;
  }
  appConfirm(
    {
      title: "Download all interactions?",
      message:
        "Download all " +
        count +
        " saved interaction" +
        (count === 1 ? "" : "s") +
        " as a JSON file?",
      confirmText: "Download",
    },
    () => {
      const arr = loadInteractions();
      if (!arr.length) {
        alert("Empty.");
        return;
      }
      dl(
        JSON.stringify(arr, null, 2),
        "FANTASTIC_interactions.json",
        "application/json",
      );
    },
  );
}
function clearAllInteractions() {
  const count = loadInteractions().length;
  appConfirm(
    {
      title: "Clear all interactions?",
      message:
        "Clear all " +
        count +
        " saved interaction" +
        (count === 1 ? "" : "s") +
        " from the library? This cannot be undone.",
      confirmText: "Clear",
      danger: true,
    },
    () => {
      localStorage.removeItem("ft_interactions");
      renderLibrary();
      logAudit("Cleared interactions", "", "data");
    },
  );
}
const libS = document.getElementById("libSearch");
if (libS) libS.oninput = (e) => renderLibrary(e.target.value);
function buildLiveQA() {
  const well = [],
    wrong = [],
    imp = [];
  const dom =
    sNeg >= sPos && sNeg >= sNeu
      ? "Negative"
      : sPos >= sNeu
        ? "Positive"
        : "Neutral";
  const kbHits = convo.filter((c) => c.kb).length;
  const hasGreet = convo.some(
    (c) =>
      c.role === "agent" &&
      /(hello|hi|welcome|thank you for calling|kumusta|magandang|maayong|naimbag|maupay)/i.test(
        c.text || "",
      ),
  );
  const hasEmp =
    convo.some((c) => c.empathized) ||
    convo.some(
      (c) =>
        c.role === "agent" &&
        /(sorry|apolog|pasensya|pasaylo|nasabtan)/i.test(c.text || ""),
    );
  const endDetected = convo.some((c) => c.end);
  const crit = fraudFlags.some((f) => f.sev === "critical");
  if (hasGreet) well.push("Branded, warm opening delivered.");
  else {
    wrong.push("No clear branded greeting.");
    imp.push("Open with a branded greeting in the first 5 seconds.");
  }
  well.push(
    "Replied in the caller\u2019s language (" + langLabel(curLang) + ").",
  );
  if (hasEmp) well.push("Apology + empathy expressed.");
  else if (dom === "Negative") {
    wrong.push("Missing apology/empathy for an upset customer.");
    imp.push("Apologize sincerely, then empathize before the solution.");
  }
  if (kbHits > 0)
    well.push("Answers anchored to the Knowledge Base (" + kbHits + ").");
  else {
    wrong.push("No KB-backed answer detected.");
    imp.push("Anchor responses to KB articles.");
  }
  if (dom !== "Negative")
    well.push("Overall sentiment stayed " + dom.toLowerCase() + ".");
  else {
    wrong.push("Customer sentiment trended negative.");
    imp.push("Acknowledge frustration earlier.");
  }
  if (camOn)
    well.push(
      "Agent mood tracked (" +
        moodLabelFor(moodVal) +
        ", " +
        Math.round(moodVal) +
        "/100).",
    );
  if (endDetected) well.push("End-of-call intent detected & acknowledged.");
  if (crit) {
    wrong.push("⚠️ Critical compliance flag.");
    imp.push("Never collect card/OTP over voice.");
  } else well.push("No critical compliance issues.");
  if (!imp.length) imp.push("Maintain this standard — great handling! 🌟");
  const fill = (id, a) => {
    const el = document.getElementById(id);
    el.innerHTML = a.map((x) => "<li>" + x + "</li>").join("");
  };
  fill("qaWell", well);
  fill("qaWrong", wrong);
  fill("qaImprove", imp);
  const pct = (window._gapData && window._gapData.pct) || 0;
  try {
    const _ia = loadInteractions();
    const _ix = _ia.findIndex((x) => x.id === window._lastLiveId);
    if (_ix >= 0) {
      _ia[_ix].qaForm = {
        well,
        wrong,
        improve: imp,
        dom,
        mood: Math.round(moodVal),
        endDetected,
        crit,
      };
      saveInteractionsArr(_ia);
    }
  } catch (e) {}
  document.getElementById("liveQAScore").innerHTML =
    'Auto QA: <b data-style-color="' +
    (pct >= 85 ? "var(--green)" : pct >= 70 ? "var(--amber)" : "var(--red)") +
    '">' +
    pct +
    "/100</b> · Sentiment: " +
    dom +
    " · Mood: " +
    moodLabelFor(moodVal) +
    (endDetected ? " · 📞 end detected" : "");
  document.getElementById("liveQAempty").classList.add("hidden");
  document.getElementById("liveQAbody").classList.remove("hidden");
  window._liveStars = 0;
  document
    .querySelectorAll("#liveStars .st")
    .forEach((s) => s.classList.remove("on"));
  const rm = document.getElementById("liveRateMsg");
  rm.className = "";
  rm.textContent = "";
}
function submitLiveRating() {
  const stars = window._liveStars || 0;
  const rm = document.getElementById("liveRateMsg");
  if (!stars) {
    rm.className = "conn err";
    rm.textContent = "⚠️ Please tap the stars to rate first.";
    return;
  }
  const note = document.getElementById("liveRateNote").value.trim();
  const arr = loadInteractions();
  const idx = arr.findIndex((x) => x.id === window._lastLiveId);
  const scaled = stars * 20;
  if (idx >= 0) {
    arr[idx].manualRating = stars;
    arr[idx].manualScore = scaled;
    arr[idx].evalNote = note;
    arr[idx].ratedBy = currentUser ? currentUser.user : "";
    saveInteractionsArr(arr);
  }
  awardPoints(document.getElementById("agInput").value || "FANTASTIC AI", {
    quality: scaled,
    training: 0,
    tag: "Live QA rating",
  });
  logAudit("Live call rated", stars + "★ (" + scaled + "/100)", "data");
  rm.className = "conn ok";
  rm.textContent =
    "✅ Rating submitted: " + stars + "★ (" + scaled + "/100). Saved & posted.";
  renderLibrary();
}
