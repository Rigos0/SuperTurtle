'use client';

import { StickyNav } from '@/components/StickyNav';
import { SectionDivider } from '@/components/SectionDivider';

const chatMessages = [
  { from: 'user', text: 'build me an API client with tests' },
  { from: 'bot', text: '🚀 On it. Starting worker "api-client" (yolo-codex, 2h timeout).' },
  { from: 'bot', text: '🎉 Done. 4 files changed, 12 tests passing.' },
];

const pillars = [
  {
    title: 'Player-coach model',
    description:
      'The Meta Agent is your conversational interface and project coach. It can code directly for quick tasks, and delegates bigger work to SubTurtles.',
    accent: 'olive',
  },
  {
    title: 'Milestone-driven',
    description:
      'Updates only when there is meaningful news. Milestone reached, blocker found, or work complete.',
    accent: 'terracotta',
  },
  {
    title: 'Self-improving',
    description:
      'Super Turtle builds and maintains itself. The system develops its own features, supervises its own improvements, and commits its own code.',
    accent: 'sage',
  },
];

const loopModes = [
  {
    title: 'slow',
    cadence: 'Plan → Groom → Execute → Review',
    copy: 'Full four-step pass each cycle. For ambiguous requirements, refactors, or architecture changes.',
    budget: '4 calls/iteration',
    tone: 'olive',
  },
  {
    title: 'yolo',
    cadence: 'Single Claude call per iteration',
    copy: 'One Claude pass per loop. For tasks that need stronger reasoning without the full slow cycle.',
    budget: '1 call/iteration',
    tone: 'terracotta',
  },
  {
    title: 'yolo-codex',
    cadence: 'Single Codex call per iteration',
    copy: 'Default. Keeps costs low on routine implementation, tests, and cleanup.',
    budget: '1 call/iteration (default)',
    tone: 'sage',
  },
  {
    title: 'yolo-codex-spark',
    cadence: 'Single Codex Spark call per iteration',
    copy: 'Shortest loop for tiny edits and rapid retries. Quick frontend tweaks, docs, follow-up fixes.',
    budget: 'Fastest iteration',
    tone: 'sage',
  },
];

export default function Home() {
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs";
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
                An autonomous coding system you talk to on Telegram. You describe what you want built, by typing or voice, and it decomposes the work, runs autonomous workers, supervises progress, and ships results.
              </p>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="feature-chip"><span className="feature-dot" /> Voice-first: talk to it naturally, it handles transcription quirks and infers intent</li>
                <li className="feature-chip"><span className="feature-dot" /> Usage-aware: monitors your Claude Code and Codex quota in real time, defaults to cheapest execution</li>
                <li className="feature-chip"><span className="feature-dot" /> Runs on your machine, your hardware, your existing subscriptions</li>
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#"
                  className="btn-primary"
                >
                  GitHub
                </a>
                <a href={docsUrl} className="btn-ghost">
                  Docs
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
              <p className="eyebrow">Philosophy</p>
              <h2>Say what, get results</h2>
              <p>
                You should not think about infrastructure, loop orchestration, or process management. It runs on your Claude Code or Codex subscription, no API tokens needed.
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

        <section id="loop-types" className="section-shell alt-shell">
          <div className="section-container">
            <div className="section-head reveal">
              <p className="eyebrow">Execution modes</p>
              <h2>Four loop types</h2>
              <p>Trade off depth, speed, and cost per task.</p>
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
