'use client';

import { StickyNav } from '@/components/StickyNav';
import { SectionDivider } from '@/components/SectionDivider';

const chatMessages = [
  { from: 'user', text: 'build me an API client with tests' },
  { from: 'bot', text: '🚀 On it. Starting worker "api-client" (yolo-codex, 2h timeout). I\'ll stay quiet unless there\'s news.' },
  { from: 'bot', text: '🎉 Done. 4 files changed, 12 tests passing.\nCommitted: feat(api): add client with retry logic and test suite' },
];

const pillars = [
  {
    title: 'Use the seats you already pay for',
    description:
      'Connect your existing Claude Code or Codex subscription. No API token setup and no token-meter billing.',
    accent: 'olive',
  },
  {
    title: 'Provider-agnostic from day one',
    description:
      'Run Claude or Codex through one interface. Super Turtle picks the right one per task based on complexity and quota.',
    accent: 'terracotta',
  },
  {
    title: 'Milestones, not noise',
    description:
      'You get meaningful updates only: milestone reached, blocker found, or work complete. Silence means it is still running.',
    accent: 'sage',
  },
];

const workflowSteps = [
  {
    title: 'Define the outcome',
    description: 'Give one clear request with acceptance criteria and repo context.',
  },
  {
    title: 'Split into parallel tracks',
    description: 'The meta agent breaks the ask into scoped subtasks and starts multiple workers at once.',
  },
  {
    title: 'Run the worker loop',
    description: 'Each worker follows state -> code -> test -> commit, then updates its task file for the next pass.',
  },
  {
    title: 'Supervise and advance',
    description: 'Watchdogs monitor progress, restart stuck runs, and post milestone updates as finished work lands.',
  },
];

const loopModes = [
  {
    title: 'slow',
    cadence: 'Plan → Groom → Execute → Review',
    copy: 'Four-phase cycle. Best for complex multi-file architecture work.',
    budget: 'Most thorough',
    tone: 'olive',
  },
  {
    title: 'yolo',
    cadence: 'Single Claude call per iteration',
    copy: 'Fast, focused passes using Claude Code. Good when the path is clear.',
    budget: 'Fast',
    tone: 'terracotta',
  },
  {
    title: 'yolo-codex',
    cadence: 'Single Codex call per iteration',
    copy: 'Default. Uses Codex for maximum cost efficiency on straightforward work.',
    budget: 'Default — cheapest',
    tone: 'sage',
  },
  {
    title: 'yolo-codex-spark',
    cadence: 'Single Codex Spark call per iteration',
    copy: 'Fastest loop cycles. Good for rapid iterations on small changes.',
    budget: 'Fastest',
    tone: 'sage',
  },
];

export default function Home() {
  return (
    <div className="landing-root">
      <StickyNav />
      <main>
        <section id="hero" className="section-shell hero-shell relative">
          <div className="section-container grid gap-10 xl:gap-16 items-start xl:items-center xl:grid-cols-[1.05fr_0.95fr]">
            <div className="reveal" style={{ animationDelay: '80ms' }}>
              <div className="mb-4">
                <img src="/turtle-logo.png" alt="Super Turtle" width={72} height={72} />
              </div>
              <h1 className="headline">
                Super Turtle
              </h1>
              <p className="lead max-w-2xl">
                Super Turtle is an autonomous coding system you chat with on Telegram. You send a request, it runs workers that code, test, and commit in your repo.
              </p>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="feature-chip"><span className="feature-dot" /> Use the Claude Code or Codex subscription you already have</li>
                <li className="feature-chip"><span className="feature-dot" /> Send voice or text in Telegram to start work</li>
                <li className="feature-chip"><span className="feature-dot" /> Big asks get split into parallel workers automatically</li>
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#"
                  className="btn-primary"
                >
                  GitHub
                </a>
                <a href="#how-it-works" className="btn-ghost">
                  How it works
                </a>
              </div>
            </div>

            <div className="reveal" style={{ animationDelay: '220ms' }}>
              <div className="tg-chat">
                <div className="tg-chat-head">
                  <div className="tg-avatar">🐢</div>
                  <div>
                    <div className="tg-name">Super Turtle</div>
                    <div className="tg-status">online</div>
                  </div>
                </div>
                <div className="tg-chat-body">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`tg-bubble ${msg.from === 'user' ? 'tg-bubble-user' : 'tg-bubble-bot'}`}>
                      {msg.text.split('\n').map((line, j) => (
                        <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="hero-glow" />
        </section>

        <SectionDivider />

        <section id="what-it-does" className="section-shell alt-shell">
          <div className="section-container">
            <div className="section-head reveal">
              <p className="eyebrow">What it is</p>
              <h2>Your existing subscription, working autonomously</h2>
              <p>
                You already pay for Claude Code or Codex. Super Turtle puts them to work as autonomous agents — no API tokens, no extra billing.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {pillars.map((pillar, index) => (
                <article
                  className={`reveal deck-card ${index === 0 ? 'olive' : index === 1 ? 'terracotta' : 'sage'}`}
                  key={pillar.title}
                  style={{ animationDelay: `${320 + index * 120}ms` }}
                >
                  <div className="deck-mark" />
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider />

        <section id="how-it-works" className="section-shell">
          <div className="section-container">
            <div className="section-head reveal">
              <p className="eyebrow">How it works</p>
              <h2>Message in, commits out</h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div
                    className="reveal flow-step"
                    key={step.title}
                    style={{ animationDelay: `${200 + index * 110}ms` }}
                  >
                    <div className="flow-step-index">0{index + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <article className="reveal control-pane" style={{ animationDelay: '560ms' }}>
                <h3>Under the hood</h3>
                <ul className="space-y-3 text-sm">
                  <li className="check-row">
                    <span className="check-dot" /> Each worker gets its own workspace, state file, and git branch
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Automatically routes to Claude or Codex based on task complexity and quota
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Cron supervision detects stuck workers and restarts them
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Frontend work gets a live Cloudflare tunnel preview link
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Workers self-stop when done — no orphan processes
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <SectionDivider />

        <section id="loop-types" className="section-shell alt-shell">
          <div className="section-container">
            <div className="section-head reveal">
              <p className="eyebrow">Execution modes</p>
              <h2>Four ways to run a worker</h2>
              <p>Trade off depth, speed, and cost. The system defaults to the cheapest mode and escalates when needed.</p>
            </div>

            <div className="mt-10 grid gap-4 lg:gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {loopModes.map((mode, index) => (
                <article
                  className={`reveal mode-card ${mode.tone}`}
                  key={mode.title}
                  style={{ animationDelay: `${260 + index * 130}ms` }}
                >
                  <div className="mode-head">
                    <h3 className="text-xl">--type {mode.title}</h3>
                    <p>{mode.cadence}</p>
                  </div>
                  <p>{mode.copy}</p>
                  <p className="muted-label">{mode.budget}</p>
                  <div className="mode-strip" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider />

        <section id="getting-started" className="section-shell">
          <div className="section-container">
            <div className="section-head reveal">
              <p className="eyebrow">Quick start</p>
              <h2>Get running</h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                'git clone <repo>',
                'cd super-turtle',
                './super_turtle/subturtle/\nctl spawn my-task \\\n  --type yolo-codex \\\n  --timeout 1h',
                'tail -f .subturtles/\n  my-task/subturtle.log',
              ].map((command, index) => (
                <div className="reveal step-card" key={index} style={{ animationDelay: `${280 + index * 100}ms` }}>
                  <div className="step-label">Step {index + 1}</div>
                  <div className="step-code">{command}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative section-shell footer-shell">
        <div className="section-container text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Super Turtle is built using Super Turtle.
          </p>
        </div>
      </footer>
    </div>
  );
}
