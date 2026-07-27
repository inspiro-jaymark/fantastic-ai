const APP_SCRIPTS = [
  "./src/scripts/core/utils.js",
  "./src/scripts/core/config.js",
  "./src/scripts/core/auth-rbac.js",
  "./src/scripts/features/users-audit.js",
  "./src/scripts/features/messages-training.js",
  "./src/scripts/features/knowledge-base.js",
  "./src/scripts/features/language-sentiment.js",
  "./src/scripts/features/speech.js",
  "./src/scripts/features/live-call.js",
  "./src/scripts/features/branding-charts.js",
  "./src/scripts/features/fraud-supervisor-qa.js",
  "./src/scripts/features/ai-providers.js",
  "./src/scripts/features/agent-conversation.js",
  "./src/scripts/features/agents-batch-export.js",
  "./src/scripts/features/team-leaderboard.js",
  "./src/scripts/features/interactions-live-qa.js",
  "./src/scripts/features/dashboards-workflows.js",
  "./src/scripts/features/insights-feebe.js",
  "./src/scripts/bootstrap.js",
  "./src/scripts/modules/v32-extensions.js",
];

async function loadHtmlIncludes() {
  let includeNodes = [...document.querySelectorAll("[data-include]")];

  while (includeNodes.length) {
    await Promise.all(
      includeNodes.map(async (node) => {
        const path = node.dataset.include;
        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status}`);
        }

        const template = document.createElement("template");
        template.innerHTML = await response.text();
        node.replaceWith(template.content.cloneNode(true));
      }),
    );

    includeNodes = [...document.querySelectorAll("[data-include]")];
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function bootApp() {
  try {
    await loadHtmlIncludes();

    for (const script of APP_SCRIPTS) {
      await loadScript(script);
    }
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="padding:16px;color:#dc2626;font-weight:700">
        Unable to load the app layout. Run through the local server and check the console.
      </div>`,
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
