'use client';

import { useEffect, useState } from 'react';
import { StickyNav } from '@/components/StickyNav';
import { SectionDivider } from '@/components/SectionDivider';

const chatMessages = [
  { from: 'user', text: 'build me a landing page and wire screenshots' },
  { from: 'bot', text: '🚀 On it. I split this into 3 SubTurtles.' },
  { from: 'bot', text: '📍 Milestone: Hero shipped. Screenshot captured. Continuing.' },
];

const heroHighlights = [
  {
    title: 'Wraps your Claude Code or Codex subscription*',
    description: 'No extra API tokens needed.',
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

// Easter egg phases after the normal pool
const rapGodPhrases = [
  'Look', 'I was gonna', 'go easy on you', 'not to hurt', 'your feelings',
  "But I'm only", 'going to get', 'this one chance', "Something's wrong",
  'I can feel it', 'Just a feeling', "I've got", 'Like something', 'is about to happen',
  "But I don't", 'know what', 'If that means', 'what I think', 'it means',
  "We're in trouble", 'Big trouble', 'And if he is', 'as bananas', 'as you say',
  "I'm not taking", 'any chances', 'You are just', 'what the doc ordered',
  "I'm beginning", 'to feel like', 'a Rap God', 'Rap God',
  'All my people', 'from the front', 'to the back nod', 'Back nod',
  'Now who thinks', 'their arms are', 'long enough', 'to slap box', 'Slap box',
  'They said I rap', 'like a robot', 'so call me', 'Rap-bot',
  '...', 'wait', 'wrong script', 'sorry',
];

// SF AI buzzword mode
const sfBuzzwords = [
  'synergy', 'disruption', 'pivot', 'Series A', 'product-market fit',
  'at scale', 'moat', 'TAM', 'flywheel', 'zero to one',
  'LLM wrapper', 'fine-tuned', 'RLHF', 'emergent behavior', 'inference',
  'foundational model', 'prompt engineering', 'AGI soon', 'compute',
  'transformer', 'attention is all', 'you need', 'latent space',
  'we raised 40M', 'pre-seed', 'YC batch', 'demo day',
  'growth hacking', 'runway', 'burn rate', 'cap table',
  'deck looks great', '10x engineer', 'move fast', 'ship it',
  'stealth mode', 'thought leader', 'paradigm shift', 'first principles',
  'AI-native', 'vertical SaaS', 'B2B2C', 'open source but', 'enterprise ready',
  'agentic workflow', 'multi-modal', 'RAG pipeline', 'vector DB',
  'we are hiring', 'ping me', 'let me intro you',
];

// Install walkthrough — the turtle walks you through setup then dies
const installWalkthrough = [
  'ok bro', 'at this point', 'just install me',
  'let me walk you through it',
  '...', 'ready?',
  'step 1:', 'git clone the repo',
  'step 2:', 'cd super-turtle',
  'step 3:', 'open claude', 'or codex',
  'step 4:', 'say:', 'set up Super Turtle',
  'step 5:', 'get your Telegram token', 'from BotFather',
  'step 6:', 'paste it in',
  'step 7:', 'start the bot',
  'step 8:', 'open Telegram',
  'step 9:', 'say hi to me',
  'step 10:', 'tell me to build something',
  "that's it", "I'll handle the rest",
  '...', 'what are you waiting for',
  'go', 'GO', 'seriously go',
  '...', "I'm done talking",
];

// Weighted message pool — higher weight = more likely to appear
const turtleMessagePool: { text: string; weight: number }[] = [
  // Personality
  { text: "I'm amazing", weight: 3 },
  { text: 'so cool', weight: 3 },
  { text: 'slow and steady', weight: 2 },
  { text: 'never sleeps', weight: 2 },
  { text: 'AGI', weight: 1 },
  { text: 'pet me again', weight: 2 },
  { text: 'beep boop', weight: 1 },
  { text: 'thank you', weight: 2 },
  { text: 'still here', weight: 2 },
  { text: 'you again?', weight: 2 },
  { text: 'shell yeah', weight: 2 },
  { text: 'turtles all the way down', weight: 1 },
  { text: 'I made this', weight: 2 },
  { text: 'autonomy', weight: 1 },
  // Features
  { text: 'cron jobs', weight: 2 },
  { text: 'sub-turtles', weight: 2 },
  { text: 'browser checks', weight: 2 },
  { text: 'memory', weight: 2 },
  { text: 'image understanding', weight: 2 },
  { text: 'mobile first', weight: 2 },
  { text: 'write and test', weight: 2 },
  { text: 'parallel execution', weight: 1 },
  { text: 'voice controlled', weight: 2 },
  { text: 'screenshots', weight: 1 },
  { text: 'auto-commits', weight: 1 },
  { text: 'self-supervision', weight: 1 },
  { text: 'tunnel previews', weight: 1 },
  { text: 'git archaeology', weight: 1 },
  { text: 'code review', weight: 2 },
  { text: 'task decomposition', weight: 1 },
  { text: 'quota balancing', weight: 1 },
  { text: 'watchdog timers', weight: 1 },
  { text: 'state management', weight: 1 },
  { text: 'Telegram bot', weight: 2 },
  { text: 'headless mode', weight: 1 },
  { text: 'background loops', weight: 1 },
];

function pickWeightedRandom(pool: { text: string; weight: number }[], exclude?: string): string {
  const filtered = exclude ? pool.filter((m) => m.text !== exclude) : pool;
  const totalWeight = filtered.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const msg of filtered) {
    roll -= msg.weight;
    if (roll <= 0) return msg.text;
  }
  return filtered[filtered.length - 1].text;
}

// Phase boundaries
const PHASE_RAP_START = 100;
const PHASE_RAP_END = PHASE_RAP_START + rapGodPhrases.length;
const PHASE_POOL2_END = PHASE_RAP_END + 100;
const PHASE_SF_END = PHASE_POOL2_END + sfBuzzwords.length;
const PHASE_INSTALL_END = PHASE_SF_END + installWalkthrough.length;

export default function Home() {
  const [hasClickedTurtleTip, setHasClickedTurtleTip] = useState(false);
  const [turtleBubbleText, setTurtleBubbleText] = useState('I built this site');
  const [clickCount, setClickCount] = useState(0);
  const [turtleDead, setTurtleDead] = useState(false);
  const [lastPoolMessage, setLastPoolMessage] = useState<string | null>(null);
  const [bubbleHideTimeout, setBubbleHideTimeout] = useState<number | null>(null);
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs";
  const githubUrl = "https://github.com/rigos0/superturtle";

  const handleTurtleClick = () => {
    // Turtle is done talking
    if (turtleDead) return;

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    let message: string;
    if (nextCount === 1) {
      message = 'I built this site';
    } else if (nextCount === 2) {
      message = 'step by step';
    } else if (nextCount >= PHASE_RAP_START && nextCount < PHASE_RAP_END) {
      // Phase 2: Rap God
      message = rapGodPhrases[nextCount - PHASE_RAP_START];
    } else if (nextCount >= PHASE_RAP_END && nextCount < PHASE_POOL2_END) {
      // Phase 3: back to normal pool for 100 clicks
      message = pickWeightedRandom(turtleMessagePool, lastPoolMessage ?? undefined);
      setLastPoolMessage(message);
    } else if (nextCount >= PHASE_POOL2_END && nextCount < PHASE_SF_END) {
      // Phase 4: SF AI buzzword mode
      message = sfBuzzwords[nextCount - PHASE_POOL2_END];
    } else if (nextCount >= PHASE_SF_END && nextCount < PHASE_INSTALL_END) {
      // Phase 5: install walkthrough
      message = installWalkthrough[nextCount - PHASE_SF_END];
      // Kill the turtle after the last install message
      if (nextCount === PHASE_INSTALL_END - 1) {
        setTurtleDead(true);
      }
    } else {
      // Phase 1 (3-99): normal pool
      message = pickWeightedRandom(turtleMessagePool, lastPoolMessage ?? undefined);
      setLastPoolMessage(message);
    }

    setHasClickedTurtleTip(true);
    setTurtleBubbleText(message);

    if (bubbleHideTimeout !== null) {
      window.clearTimeout(bubbleHideTimeout);
    }

    const nextHideTimeout = window.setTimeout(() => {
      setHasClickedTurtleTip(false);
      setBubbleHideTimeout(null);
    }, 1500);

    setBubbleHideTimeout(nextHideTimeout);
  };

  useEffect(() => {
    return () => {
      if (bubbleHideTimeout !== null) {
        window.clearTimeout(bubbleHideTimeout);
      }
    };
  }, [bubbleHideTimeout]);

  return (
    <div className="landing-root">
      <StickyNav />
      <main>
        <section id="hero" className="section-shell hero-shell relative">
          <div className="section-container max-w-5xl space-y-10">
            <div className="reveal text-center flex flex-col items-center" style={{ animationDelay: '80ms' }}>
              <div className="mx-auto turtle-sticker-wrap">
                <div className={`turtle-tip-bubble ${hasClickedTurtleTip ? 'active' : ''}`} aria-hidden={!hasClickedTurtleTip}>
                  <span>{turtleBubbleText}</span>
                </div>
                <div
                  className="turtle-sticker-trigger"
                  onClick={handleTurtleClick}
                  aria-label="Show turtle message"
                >
                  <img className="turtle-sticker-image" src="/turtle-logo.png" alt="Super Turtle" width={104} height={104} style={{ width: 'var(--turtle-size)', height: 'var(--turtle-size)' }} />
                </div>
              </div>
              <h1 className="headline mt-6 sm:mt-7 md:mt-8">
                Super Turtle!
              </h1>
              <p className="lead max-w-2xl">
                Code from anywhere with your voice
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3">
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
              <div className="grid gap-1.5 sm:gap-4 md:grid-cols-3">
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
              <p className="mt-10 sm:mt-10 pr-12 sm:pr-32 text-[0.5rem] sm:text-xs leading-snug text-[var(--text-muted)]">
                * Uses official Claude Code/Codex CLI authentication flows in headless mode. This wrapper approach is compliant with provider terms.
              </p>
            </div>
          </div>
          <div className="hero-glow" />
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
