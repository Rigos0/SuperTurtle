import { WORKING_DIR, DASHBOARD_ENABLED, DASHBOARD_AUTH_TOKEN, DASHBOARD_BIND_ADDR, DASHBOARD_PORT } from "./config";
import { getJobs } from "./cron";
import { parseCtlListOutput, getSubTurtleElapsed, type ListedSubTurtle } from "./handlers/commands";
import { logger } from "./logger";

type TurtleView = ListedSubTurtle & {
  elapsed: string;
};

type DashboardState = {
  generatedAt: string;
  turtles: TurtleView[];
  cronJobs: Array<{
    id: string;
    type: "one-shot" | "recurring";
    promptPreview: string;
    fireInMs: number;
    chatId: number;
  }>;
};

const dashboardLog = logger.child({ module: "dashboard" });

function unauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function isAuthorized(request: Request): boolean {
  if (!DASHBOARD_AUTH_TOKEN) return true;
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token") || "";
  const tokenFromHeader = request.headers.get("x-dashboard-token") || "";
  const authorization = request.headers.get("authorization") || "";
  const tokenFromAuthorization = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : authorization.trim();

  return (
    tokenFromQuery === DASHBOARD_AUTH_TOKEN
    || tokenFromHeader === DASHBOARD_AUTH_TOKEN
    || tokenFromAuthorization === DASHBOARD_AUTH_TOKEN
  );
}

async function readSubturtles(): Promise<ListedSubTurtle[]> {
  try {
    const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
    const proc = Bun.spawnSync([ctlPath, "list"], { cwd: WORKING_DIR });
    const output = proc.stdout.toString().trim();
    return parseCtlListOutput(output);
  } catch {
    return [];
  }
}

export function safeSubstring(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max)}...`;
}

async function buildDashboardState(): Promise<DashboardState> {
  const turtles = await readSubturtles();
  const elapsedByName = await Promise.all(
    turtles.map(async (turtle) => {
      const elapsed = turtle.status === "running" ? await getSubTurtleElapsed(turtle.name) : "0";
      return { ...turtle, elapsed };
    })
  );

  const allJobs = getJobs();
  const cronJobs = allJobs.map((job) => {
    return {
      id: job.id,
      type: job.type,
      promptPreview: safeSubstring(job.prompt, 100),
      fireInMs: Math.max(0, job.fire_at - Date.now()),
      chatId: job.chat_id || 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    turtles: elapsedByName,
    cronJobs,
  };
}

function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Super Turtle Dashboard</title>
    <style>
      :root {
        --bg: #050816;
        --panel: #111936;
        --edge: rgba(255, 255, 255, 0.14);
        --text: #e6edf7;
        --muted: #8fa0bf;
        --good: #4cd97b;
        --warn: #f6cb58;
        --bad: #ff7a7a;
      }
      html, body {
        margin: 0;
        font-family: "Trebuchet MS", "Verdana", "Segoe UI", sans-serif;
        background: radial-gradient(circle at 10% 15%, #13234a, var(--bg));
        color: var(--text);
      }
      .wrap {
        max-width: 1000px;
        margin: 0 auto;
        padding: 24px;
      }
      h1 {
        margin: 0 0 12px;
        letter-spacing: 0.02em;
        animation: title-pop 260ms cubic-bezier(0.2, 1, 0.3, 1);
      }
      .row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
        align-items: center;
      }
      .pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--panel);
        border: 1px solid var(--edge);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--edge);
        border-radius: 14px;
        padding: 14px;
        min-height: 160px;
        animation: slide-up 260ms cubic-bezier(0.2, 1, 0.3, 1);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead th {
        font-size: 12px;
        color: var(--muted);
        text-align: left;
        border-bottom: 1px dashed var(--edge);
        padding-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      td {
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        vertical-align: top;
        font-size: 14px;
      }
      .dot {
        font-size: 10px;
      }
      .dot-ok { color: var(--good); }
      .dot-bad { color: var(--bad); }
      .dot-warn { color: var(--warn); }
      .small {
        color: var(--muted);
        font-size: 12px;
      }
      a { color: #92c4ff; }
      .empty {
        color: var(--muted);
        text-align: center;
        padding: 20px 0;
      }
      .status {
        margin-top: 14px;
        color: var(--muted);
        font-size: 12px;
      }
      @keyframes title-pop {
        from { transform: translateY(-4px); opacity: .8; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slide-up {
        from { transform: translateY(6px); opacity: .8; }
        to { transform: translateY(0); opacity: 1; }
      }
      @media (max-width: 700px) {
        .wrap { padding: 16px; }
        h1 { font-size: 24px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>Super Turtle Dashboard</h1>
      <div class="row">
        <span class="pill" id="updateBadge">Loading…</span>
        <span class="pill" id="countBadge">Turtles: 0</span>
        <span class="pill" id="cronBadge">Cron jobs: 0</span>
      </div>
      <div class="grid">
        <section class="card">
          <h2>Running Turtles</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>State</th><th>Time</th><th>Task</th></tr>
            </thead>
            <tbody id="turtleRows">
              <tr><td class="empty" colspan="5">No turtles yet.</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card">
          <h2>Upcoming Cron Jobs</h2>
          <table>
            <thead>
              <tr><th>Type</th><th>Next in</th><th>Prompt</th></tr>
            </thead>
            <tbody id="cronRows">
              <tr><td class="empty" colspan="3">No jobs scheduled.</td></tr>
            </tbody>
          </table>
        </section>
      </div>
      <p class="status" id="statusLine">Status: waiting for first sync…</p>
    </main>
    <script>
      const turtleRows = document.getElementById("turtleRows");
      const cronRows = document.getElementById("cronRows");
      const updateBadge = document.getElementById("updateBadge");
      const countBadge = document.getElementById("countBadge");
      const cronBadge = document.getElementById("cronBadge");
      const statusLine = document.getElementById("statusLine");

      function setRunningBadge(value) {
        countBadge.textContent = "Turtles: " + value;
      }

      function setCronBadge(value) {
        cronBadge.textContent = "Cron jobs: " + value;
      }

      function dot(status) {
        if (status === "running") return '<span class="dot dot-ok">●</span>';
        if (status === "overdue") return '<span class="dot dot-bad">●</span>';
        return '<span class="dot">●</span>';
      }

      function humanMs(ms) {
        if (ms <= 0) return "0s";
        const total = Math.floor(ms / 1000);
        const sec = total % 60;
        const min = Math.floor(total / 60) % 60;
        const hr = Math.floor(total / 3600);
        if (hr > 0) return hr + "h " + min + "m";
        if (min > 0) return min + "m " + sec + "s";
        return sec + "s";
      }

      async function loadData() {
        try {
          const res = await fetch("/api/subturtles", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed request");
          const data = await res.json();

          updateBadge.textContent = "Updated " + new Date(data.generatedAt).toLocaleTimeString();
          setRunningBadge(data.turtles.length);
          setCronBadge(data.cronJobs.length);

          if (!data.turtles.length) {
            turtleRows.innerHTML = '<tr><td class="empty" colspan="5">No turtles found.</td></tr>';
          } else {
            turtleRows.innerHTML = "";
            for (const t of data.turtles.sort((a, b) => {
              if (a.status === b.status) return a.name.localeCompare(b.name);
              if (a.status === "running") return -1;
              if (b.status === "running") return 1;
              return a.name.localeCompare(b.name);
            })) {
              const tr = document.createElement("tr");
              tr.innerHTML =
                "<td>" + dot(t.status) + " " + t.name + "</td>" +
                "<td>" + (t.type || "unknown") + "</td>" +
                "<td>" + t.status + "</td>" +
                "<td>" + t.elapsed + "</td>" +
                "<td>" + (t.task || "") + "</td>";
              turtleRows.appendChild(tr);
            }
          }

          if (!data.cronJobs.length) {
            cronRows.innerHTML = '<tr><td class="empty" colspan="3">No jobs scheduled.</td></tr>';
          } else {
            cronRows.innerHTML = "";
            for (const j of data.cronJobs) {
              const tr = document.createElement("tr");
              tr.innerHTML =
                "<td>" + j.type + "</td>" +
                "<td>" + humanMs(j.fireInMs) + "</td>" +
                "<td>" + j.promptPreview + "</td>";
              cronRows.appendChild(tr);
            }
          }

          statusLine.textContent =
            "Status: " + data.turtles.length + " turtles, " + data.cronJobs.length + " cron jobs";
        } catch (error) {
          statusLine.textContent = "Status: failed to fetch data";
        }
      }

      loadData();
      setInterval(loadData, 5000);
    </script>
  </body>
</html>`;
}

export function startDashboardServer(): void {
  if (!DASHBOARD_ENABLED) {
    return;
  }

  if (!DASHBOARD_AUTH_TOKEN) {
    dashboardLog.info(
      { host: DASHBOARD_BIND_ADDR, port: DASHBOARD_PORT, authEnabled: false },
      `Starting dashboard on http://${DASHBOARD_BIND_ADDR}:${DASHBOARD_PORT}/dashboard`
    );
  } else {
    dashboardLog.info(
      { host: DASHBOARD_BIND_ADDR, port: DASHBOARD_PORT, authEnabled: true },
      `Starting dashboard on http://${DASHBOARD_BIND_ADDR}:${DASHBOARD_PORT}/dashboard?token=<redacted>`
    );
  }

  Bun.serve({
    port: DASHBOARD_PORT,
    hostname: DASHBOARD_BIND_ADDR,
    async fetch(req) {
      if (!isAuthorized(req)) return unauthorizedResponse();

      const url = new URL(req.url);
      if (url.pathname === "/api/subturtles") {
        const data = await buildDashboardState();
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (url.pathname === "/" || url.pathname === "/dashboard" || url.pathname === "/index.html") {
        return new Response(renderDashboardHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  });
}
