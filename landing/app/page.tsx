'use client';

import { useEffect, useState } from 'react';
import { StickyNav } from '@/components/StickyNav';

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

const turtleMessagePool = [
  'I built this site',
  'step by step',
  'slow and steady',
  'sub-turtles',
  'mobile first',
  'browser checks',
  'headless mode',
  'autonomy',
  'code review',
  'voice controlled',
  'screenshots',
  'thank you',
  'still here',
  'no panic, only progress',
  'ship ship ship',
];

type SocialKind = 'substack' | 'linkedin' | 'twitter' | 'github' | 'docs';

type SocialLink = {
  label: string;
  href: string;
  kind: SocialKind;
  external: boolean;
};

function SocialIcon({ kind }: { kind: SocialKind }) {
  switch (kind) {
    case 'substack':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 5h16M4 10h16M4 15h16M4 19h16" strokeLinecap="round" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.22 8.28h4.56V24H.22V8.28Zm7.23 0h4.37v2.15h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 6.99V24h-4.56v-7.98c0-1.9-.03-4.34-2.65-4.34-2.66 0-3.07 2.08-3.07 4.21V24H7.45V8.28Z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.9 2.25h3.68l-8.04 9.19L24 21.75h-7.41l-5.8-6.57-5.75 6.57H1.35l8.6-9.83L.94 2.25h7.6l5.24 5.96 5.12-5.96Zm-1.29 17.3h2.04L7.43 4.34H5.24l12.37 15.21Z" />
        </svg>
      );
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.3 1.5 2.9 1.2.1-.7.3-1.2.6-1.5-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.7 0 0 .8-.3 2.8 1 .8-.2 1.6-.3 2.5-.3.9 0 1.7.1 2.5.3 1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.5.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10Z" />
        </svg>
      );
    case 'docs':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6V3Zm8 1.5V8h3.5L14 4.5ZM8 10h8v1.6H8V10Zm0 3.2h8v1.6H8v-1.6Zm0 3.2h5.5V18H8v-1.6Z" />
        </svg>
      );
  }
}

export default function Home() {
  const [hasClickedTurtleTip, setHasClickedTurtleTip] = useState(false);
  const [turtleBubbleText, setTurtleBubbleText] = useState('I built this site');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [bubbleHideTimeout, setBubbleHideTimeout] = useState<number | null>(null);

  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? '/docs';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '/';
  const githubUrl = 'https://github.com/Rigos0/superturtle';
  const substackUrl = 'https://richardmladek.substack.com/';
  const linkedinUrl = 'https://www.linkedin.com/in/richard-mladek/';
  const twitterUrl = 'https://x.com/rmladek';

  const socialLinks: SocialLink[] = [
    { label: 'Substack', href: substackUrl, kind: 'substack', external: true },
    { label: 'LinkedIn', href: linkedinUrl, kind: 'linkedin', external: true },
    { label: 'Twitter', href: twitterUrl, kind: 'twitter', external: true },
  ];

  const resourceLinks: SocialLink[] = [
    { label: 'GitHub', href: githubUrl, kind: 'github', external: true },
    {
      label: 'Docs',
      href: docsUrl,
      kind: 'docs',
      external: docsUrl.startsWith('http://') || docsUrl.startsWith('https://'),
    },
  ];

  const handleTurtleClick = () => {
    const available = turtleMessagePool.filter((msg) => msg !== lastMessage);
    const next = available[Math.floor(Math.random() * available.length)] ?? turtleMessagePool[0];

    setLastMessage(next);
    setHasClickedTurtleTip(true);
    setTurtleBubbleText(next);

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
    <div className="landing-root min-h-screen flex flex-col">
      <StickyNav />

      <main className="flex-1">
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
                  <img
                    className="turtle-sticker-image"
                    src="/turtle-logo.png"
                    alt="SuperTurtle"
                    width={104}
                    height={104}
                    style={{ width: 'var(--turtle-size)', height: 'var(--turtle-size)' }}
                  />
                </div>
              </div>
              <h1 className="headline mt-6 sm:mt-7 md:mt-8">SuperTurtle!</h1>
              <p className="lead max-w-2xl">Code from anywhere with your voice</p>

              <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3">
                <a href={githubUrl} className="btn-primary" target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href={docsUrl} className="btn-ghost" target={docsUrl.startsWith('http') ? '_blank' : undefined} rel={docsUrl.startsWith('http') ? 'noreferrer' : undefined}>
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
      </main>

      <footer className="relative mt-16 footer-shell py-8 sm:mt-20 sm:py-10 md:mt-28 lg:mt-40">
        <div className="section-container">
          <div className="mx-auto max-w-6xl">
            <div className="space-y-6 sm:space-y-7">
              <div className="mx-auto w-full max-w-[28rem] text-center">
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  <a href={siteUrl} className="font-semibold text-[var(--text-heading)] hover:text-[var(--accent-olive)] transition-colors">SuperTurtle</a> was built using <a href={siteUrl} className="font-semibold text-[var(--text-heading)] hover:text-[var(--accent-olive)] transition-colors">SuperTurtle</a>. Runs locally today; cloud deployment is coming up.
                </p>
              </div>

              <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
                <nav className="w-full max-w-[12rem] space-y-2 text-left" aria-label="Social links">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer noopener' : undefined}
                    >
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[var(--accent-olive)]">
                        <SocialIcon kind={link.kind} />
                      </span>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </nav>

                <nav className="w-full max-w-[12rem] space-y-2 text-left" aria-label="Resource links">
                  {resourceLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer noopener' : undefined}
                    >
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[var(--accent-olive)]">
                        <SocialIcon kind={link.kind} />
                      </span>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
