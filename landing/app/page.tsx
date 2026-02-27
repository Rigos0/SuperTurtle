'use client';

import { TypedTerminal } from '@/components/TypedTerminal';
import { StickyNav } from '@/components/StickyNav';
import { SectionDivider } from '@/components/SectionDivider';

const terminalLines = [
  { text: '$ ./ctl spawn api-hardening --type yolo-codex --timeout 2h', isCommand: true },
  { text: 'Spawning SubTurtle "api-hardening"...', isOutput: true },
  { text: 'Writing state to .subturtles/api-hardening/CLAUDE.md', isOutput: true },
  { text: 'Registering autonomous loop: yolo-codex', isOutput: true },
  { text: '', isOutput: true },
  { text: 'Started (PID 42891) | timeout: 2h', isOutput: true },
  { text: 'Cron supervision interval set to 5m', isOutput: true },
  { text: '', isOutput: true },
  { text: 'Task execution: Phase 1/4 complete', isOutput: true },
  { text: 'Task execution: Drafting patch for target module', isOutput: true },
];

const operatingPillars = [
  {
    title: 'Launch',
    description:
      'Spawn autonomous SubTurtles with isolated workspaces and scoped state so they can act immediately without setup friction.',
    accent: 'olive',
  },
  {
    title: 'Supervise',
    description:
      'Cron-based supervision keeps loops healthy, applies timeouts, and self-repairs stalled workers without your intervention.',
    accent: 'terracotta',
  },
  {
    title: 'Scale',
    description:
      'Coordinate many tasks as a fleet, track each run in its CLAUDE.md log, and keep a clean commit history of every move.',
    accent: 'sage',
  },
];

const workflowSteps = [
  {
    title: 'Request',
    description: 'You send one instruction to Meta Turtle. The task gets decomposed and assigned to SubTurtles.',
  },
  {
    title: 'Deploy',
    description: 'Agents receive dedicated state files and loop controls, then execute with the loop strategy you chose.',
  },
  {
    title: 'Inspect',
    description: 'Progress is reported in periodic check-ins with actionable summaries and safe recovery hooks.',
  },
  {
    title: 'Deliver',
    description: 'Each agent commits outputs autonomously and hands control back only when complete or blocked.',
  },
];

const loopModes = [
  {
    title: 'slow',
    cadence: 'Thorough mode',
    copy: 'Plan → Groom → Execute → Review loop. Best for complex refactors or sensitive changes.',
    budget: 'Highest quality, highest cost',
    tone: 'olive',
  },
  {
    title: 'yolo',
    cadence: 'Direct mode',
    copy: 'One-shot execution with minimal overhead. Best for quick fixes and simple improvements.',
    budget: 'Fast, focused',
    tone: 'terracotta',
  },
  {
    title: 'yolo-codex',
    cadence: 'Cost-aware mode',
    copy: 'Cost-optimized Codex path for bulk work and steady, repeatable operations.',
    budget: 'Balanced speed and budget',
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
              <p className="pill">Super Turtle</p>
              <h1 className="headline mt-4">
                Build in silence, ship in waves
              </h1>
              <p className="lead max-w-2xl">
                Super Turtle orchestrates autonomous SubTurtles to execute multi-step work with
                structured supervision and audit-ready commits.
              </p>

              <ul className="mt-8 space-y-2 text-sm">
                <li className="feature-chip"><span className="feature-dot" /> No babysitting loops</li>
                <li className="feature-chip"><span className="feature-dot" /> Self-healing check-ins and restarts</li>
                <li className="feature-chip"><span className="feature-dot" /> CLI-first control with clear progress signals</li>
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://github.com/anthropics/super-turtle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Open on GitHub
                </a>
                <a href="#loop-types" className="btn-ghost">
                  Explore loop types
                </a>
              </div>
            </div>

            <div className="reveal" style={{ animationDelay: '220ms' }}>
              <div className="control-dash">
                <div className="control-dash-head">
                  <span>Autonomy command console</span>
                </div>
                <div className="p-2 sm:p-3">
                  <TypedTerminal lines={terminalLines} speed={20} />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-xs md:text-sm">
                <span className="metric-pill">24/7 supervision</span>
                <span className="metric-pill">3 loop strategies</span>
                <span className="metric-pill">Commit-per-sprint</span>
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
              <h2>The autonomous operating model</h2>
              <p>
                A single message turns into a coordinated set of autonomous workers. Super Turtle keeps execution
                visible, recoverable, and tuned for cost.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {operatingPillars.map((pillar, index) => (
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
              <h2>From message to merged result</h2>
              <p>A dependable cycle that keeps noisy work from becoming noisy coordination.</p>
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
                <h3>What you gain by default</h3>
                <ul className="space-y-3 text-sm">
                  <li className="check-row">
                    <span className="check-dot" /> Safe checkpointing between loop phases
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Automatic logs + resumable progress in one place
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Clean commit flow with auditable state artifacts
                  </li>
                  <li className="check-row">
                    <span className="check-dot" /> Explicit exits when tasks finish or need human input
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
              <p className="eyebrow">Loop configuration</p>
              <h2>Choose the execution profile</h2>
              <p>Shift quality, speed, and cost from one command.</p>
            </div>

            <div className="mt-10 grid gap-4 lg:gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
              <h2>Get your first SubTurtle running</h2>
              <p>Four steps, one predictable path.</p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                'git clone https://github.com/anthropics/super-turtle',
                'cd super-turtle',
                './super_turtle/subturtle/ctl spawn my-task --type yolo-codex --timeout 1h',
                'tail -f .subturtles/my-task/subturtle.log',
              ].map((command, index) => (
                <div className="reveal step-card" key={command} style={{ animationDelay: `${280 + index * 100}ms` }}>
                  <div className="step-label">Step {index + 1}</div>
                  <div className="step-code">{command}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 reveal" style={{ animationDelay: '700ms' }}>
              <p className="text-sm text-[var(--text-muted)] text-center">Ready for autonomy without the noise?</p>
              <div className="mt-4 text-center">
                <a href="#hero" className="btn-primary">
                  Try Super Turtle now
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative section-shell footer-shell">
        <div className="section-container text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Super Turtle • Built for autonomous coordination, open-source, MIT
          </p>
          <nav className="mt-4 flex items-center justify-center gap-6 text-sm">
            <a href="#hero">Home</a>
            <a href="#what-it-does">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#getting-started">Get started</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
