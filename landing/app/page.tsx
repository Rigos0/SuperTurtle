'use client';

import { StickyNav } from '@/components/StickyNav';
import { SectionDivider } from '@/components/SectionDivider';

const chatMessages = [
  { from: 'user', text: 'build me a landing page and wire screenshots' },
  { from: 'bot', text: '🚀 On it. I split this into 3 SubTurtles.' },
  { from: 'bot', text: '📍 Milestone: Hero shipped. Screenshot captured. Continuing.' },
];

const heroHighlights = [
  {
    title: 'Uses your Claude Code or Codex subscription',
    description: 'No extra API-token workflow for core use.',
    accent: 'olive',
  },
  {
    title: 'Mobile and voice control first',
    description: 'Run everything from Telegram by text or voice.',
    accent: 'terracotta',
  },
  {
    title: 'Designed for long-running, large jobs',
    description:
      'Breaks work into tasks, runs sub-agents, can open/test webpages, and iterates until done.',
    accent: 'sage',
  },
];

const valueProps = [
  {
    title: 'Uses your Claude Code or Codex subscription',
    description: 'No extra API-token workflow for core use.',
    accent: 'olive',
  },
  {
    title: 'Mobile and voice control first',
    description: 'Run everything from Telegram by text or voice.',
    accent: 'terracotta',
  },
  {
    title: 'Parallel sub-agents, managed for you',
    description:
      'Breaks work into tasks, runs sub-agents, can open/test webpages, and iterates until done.',
    accent: 'sage',
  },
  {
    title: 'Runs on your machine',
    description: 'Local-first today (cloud deployment coming up).',
    accent: 'olive',
  },
  {
    title: 'Usage-aware load balancing',
    description: 'Tracks remaining usage and balances work between Claude Code and Codex.',
    accent: 'terracotta',
  },
  {
    title: 'Autonomous supervision',
    description:
      'Scheduled cron check-ins monitor progress in the background and send important updates.',
    accent: 'sage',
  },
];

const executionFlow = [
  {
    title: 'You send one request',
    description: 'Example: "build X" in Telegram.',
  },
  {
    title: 'It decomposes and spawns SubTurtles',
    description: 'Parallel workers per task stream.',
  },
  {
    title: 'Workers implement and iterate',
    description: 'Code, test, browser checks, and retries.',
  },
  {
    title: 'Meta supervision keeps it moving',
    description: 'Cron check-ins detect drift and report milestones.',
  },
];

export default function Home() {
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs";
  const githubUrl = "https://github.com/Rigos0/superturtle";
  return (
    <div className="landing-root">
      <StickyNav />
      <main>
        <section id="hero" className="section-shell hero-shell relative">
          <div className="section-container max-w-5xl space-y-10">
            <div className="reveal" style={{ animationDelay: '80ms' }}>
              <div className="mb-4">
                <img src="/turtle-logo.png" alt="Super Turtle" width={104} height={104} />
              </div>
              <h1 className="headline">
                Super Turtle
              </h1>
              <p className="lead max-w-2xl">
                Code from anywhere with your voice.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={githubUrl}
                  className="btn-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a href={docsUrl} className="btn-ghost">
                  Docs
                </a>
              </div>
            </div>

            <div className="reveal" style={{ animationDelay: '220ms' }}>
              <div className="grid gap-4 md:grid-cols-3">
                {heroHighlights.map((item, index) => (
                  <article
                    className={`deck-card hero-value-card ${index === 0 ? 'olive' : index === 1 ? 'terracotta' : 'sage'}`}
                    key={item.title}
                  >
                    <div className="deck-mark" />
                    <h3 className="hero-value-title">{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-glow" />
        </section>

        <SectionDivider />

        <section id="value-proposition" className="section-shell alt-shell">
          <div className="section-container max-w-4xl">
            <div className="section-head reveal">
              <p className="eyebrow">Why Super Turtle</p>
              <h2>What you get</h2>
              <p>Clear priorities, in the order users care about.</p>
            </div>

            <div className="mt-10 grid gap-4 sm:gap-6">
              {valueProps.map((item, index) => (
                <article
                  className={`reveal deck-card ${index % 3 === 0 ? 'olive' : index % 3 === 1 ? 'terracotta' : 'sage'}`}
                  key={item.title}
                  style={{ animationDelay: `${220 + index * 90}ms` }}
                >
                  <div className="deck-mark" />
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider />

        <section id="execution" className="section-shell">
          <div className="section-container max-w-4xl space-y-10">
            <div>
              <div className="section-head reveal">
                <p className="eyebrow">Execution</p>
                <h2>How work runs</h2>
              </div>
              <div className="mt-8 grid gap-4">
                {executionFlow.map((step, index) => (
                  <article className="flow-step reveal" key={step.title} style={{ animationDelay: `${220 + index * 90}ms` }}>
                    <div className="flow-step-index">{index + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="reveal max-w-2xl" style={{ animationDelay: '260ms' }}>
              <div className="tg-chat">
                <div className="tg-chat-head">
                  <div className="tg-avatar">🐢</div>
                  <div>
                    <div className="tg-name">Super Turtle</div>
                    <div className="tg-status">scheduled check-ins active</div>
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
        </section>

        <SectionDivider />

        <section id="getting-started" className="section-shell alt-shell">
          <div className="section-container max-w-4xl">
            <div className="section-head reveal">
              <p className="eyebrow">Quick start</p>
              <h2>Get running in two minutes</h2>
            </div>

            <div className="mt-10 grid gap-5">
              {[
                'git clone <repo>',
                'cd super-turtle\nclaude\n# or codex',
                'say:\nSet up Super Turtle on this machine.',
                'chat from Telegram\n(text or voice)',
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
            Super Turtle is built using Super Turtle. Runs locally today; cloud deployment is coming up.
          </p>
        </div>
      </footer>
    </div>
  );
}
