'use client';

import { TypedTerminal } from '@/components/TypedTerminal';
import { StickyNav } from '@/components/StickyNav';

export default function Home() {
  const terminalLines = [
    { text: '$ ./ctl spawn auth-feature --type yolo --timeout 2h', isCommand: true },
    { text: '', isOutput: true },
    { text: 'Spawning SubTurtle "auth-feature"...', isOutput: true },
    { text: 'Writing state to .subturtles/auth-feature/CLAUDE.md', isOutput: true },
    { text: 'Creating workspace directory...', isOutput: true },
    { text: '', isOutput: true },
    { text: 'Started (PID 42891, timeout: 2h)', isOutput: true },
    { text: 'Registered cron check-in every 5m', isOutput: true },
    { text: '', isOutput: true },
    { text: 'SubTurtle is now running autonomously.', isOutput: true },
    { text: 'View logs: tail -f .subturtles/auth-feature/subturtle.log', isOutput: true },
  ];

  return (
    <div className="w-full text-[#2d2a26] font-sans" style={{ backgroundColor: '#faf8f5' }}>
      <StickyNav />
      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen w-full overflow-hidden bg-[#faf8f5]">
        {/* Content - Mobile-first, left-aligned layout */}
        <main className="relative z-10 min-h-screen w-full flex flex-col justify-center px-4 py-16 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column: Text content (left-aligned on mobile) */}
            <div className="flex flex-col justify-start lg:justify-center">
              {/* Turtle Logo - Mobile: smaller, above text. Desktop: beside text */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:hidden mb-8 flex-shrink-0">
                <img
                  src="/turtle-logo.png"
                  alt="Agentic Turtle Logo"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              {/* Badge */}
              <div className="mb-6 inline-block w-fit">
                <div className="px-4 py-2 rounded-full border border-[#4a5f3b] text-[#4a5f3b] bg-[rgba(74,95,59,0.08)] font-medium text-sm">
                  Autonomous Agent Coordination
                </div>
              </div>

              {/* Main heading - Big, bold, left-aligned */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tighter text-[#1a1815]">
                agentic
              </h1>

              {/* Tagline */}
              <p className="text-base sm:text-lg mb-8 max-w-lg leading-relaxed text-[#4a4642]">
                Spawn autonomous SubTurtles to handle complex tasks. They read, plan, execute, and commit—with supervision.
              </p>

              {/* Features teaser - Left-aligned on mobile */}
              <div className="flex flex-col gap-3 mb-10">
                <div className="flex items-center gap-2 text-[#4a5f3b] text-sm">
                  <span className="font-bold">✓</span>
                  <span>Spawn &amp; Supervise</span>
                </div>
                <div className="flex items-center gap-2 text-[#4a5f3b] text-sm">
                  <span className="font-bold">✓</span>
                  <span>Multiple Loop Types</span>
                </div>
                <div className="flex items-center gap-2 text-[#4a5f3b] text-sm">
                  <span className="font-bold">✓</span>
                  <span>Self-Supervising</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <a
                  href="https://github.com/anthropics/agentic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
                <a
                  href="#what-it-does"
                  className="btn-secondary flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Right column: Turtle Logo - Desktop only, larger */}
            <div className="hidden lg:flex justify-end items-center">
              <div className="w-40 h-40 flex-shrink-0">
                <img
                  src="/turtle-logo.png"
                  alt="Agentic Turtle Logo"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-4 sm:left-6 lg:left-8 text-sm flex flex-col items-start gap-2 animate-bounce text-[#6b6562]">
            <span>Scroll to explore</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </main>
      </section>

      {/* What it does Section */}
      <section id="what-it-does" className="relative w-full py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#faf8f5' }}>
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-[#1a1815]">
              What it does
            </h2>
            <p className="text-lg max-w-2xl mx-auto leading-relaxed text-[#4a4642]">
              Three core capabilities that power autonomous agent coordination.
            </p>
          </div>

          {/* Feature grid - 1 column on mobile, 3 columns on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1: Spawn workers - Olive Green */}
            <div className="card-accent p-6 sm:p-8 flex flex-col">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-[rgba(74,95,59,0.1)] border border-[rgba(74,95,59,0.2)]">
                <svg className="w-6 h-6 text-[#4a5f3b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-[#1a1815]">Spawn workers</h3>
              <p className="leading-relaxed text-[#4a4642]">
                Launch SubTurtles autonomously to handle complex tasks. Each worker gets its own workspace, state file, and supervision loop.
              </p>
            </div>

            {/* Feature 2: Multiple loop types - Terracotta */}
            <div className="card-accent terracotta p-6 sm:p-8 flex flex-col">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-[rgba(184,111,76,0.1)] border border-[rgba(184,111,76,0.2)]">
                <svg className="w-6 h-6 text-[#b86f4c]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-[#1a1815]">Multiple loop types</h3>
              <p className="leading-relaxed text-[#4a4642]">
                Choose your execution strategy: slow (thorough), yolo (fast), or yolo-codex (cost-optimized). Tailor to your needs.
              </p>
            </div>

            {/* Feature 3: Self-supervising - Sage Green */}
            <div className="card-accent sage p-6 sm:p-8 flex flex-col">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-[rgba(143,168,126,0.1)] border border-[rgba(143,168,126,0.2)]">
                <svg className="w-6 h-6 text-[#8fa87e]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-[#1a1815]">Self-supervising</h3>
              <p className="leading-relaxed text-[#4a4642]">
                Cron-based check-ins, automatic restarts, and progress tracking. Workers supervise themselves with minimal intervention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="relative w-full py-20 px-6 overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight" style={{ color: '#2d2a26' }}>
              How it works
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#6b6460' }}>
              Coordinate autonomous agents through a simple command-driven interface.
            </p>
          </div>

          {/* Step-by-step flow - vertical on mobile, 2-col on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: Vertical step flow (mobile-friendly) */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#5a7247' }}>
                  1
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#1a1815' }}>Initiate via CLI or Telegram</h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b6460' }}>
                    Send a command to spawn a SubTurtle with a specific task and loop type.
                  </p>
                </div>
              </div>

              {/* Connector line (hidden on mobile, visible on desktop) */}
              <div className="flex ml-6 justify-center">
                <div className="w-1 h-8" style={{ backgroundColor: 'rgba(90, 114, 71, 0.2)' }}></div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#c07a56' }}>
                  2
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#1a1815' }}>Meta Agent spawns SubTurtles</h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b6460' }}>
                    Each SubTurtle gets its own workspace, CLAUDE.md state file, and execution environment.
                  </p>
                </div>
              </div>

              {/* Connector line */}
              <div className="flex ml-6 justify-center">
                <div className="w-1 h-8" style={{ backgroundColor: 'rgba(90, 114, 71, 0.2)' }}></div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#8fa87e' }}>
                  3
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#1a1815' }}>SubTurtle executes its loop</h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b6460' }}>
                    Read state → Plan → Execute → Commit. Runs autonomously based on loop type selection.
                  </p>
                </div>
              </div>

              {/* Connector line */}
              <div className="flex ml-6 justify-center">
                <div className="w-1 h-8" style={{ backgroundColor: 'rgba(90, 114, 71, 0.2)' }}></div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#c07a56' }}>
                  4
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#1a1815' }}>Meta Agent supervises & progresses</h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b6460' }}>
                    Monitors progress via cron check-ins, course-corrects if needed, and advances to the next task.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Summary and highlight */}
            <div className="flex flex-col justify-start lg:justify-center space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold" style={{ color: '#1a1815' }}>Step-by-step coordination</h3>
                <p className="text-base leading-relaxed" style={{ color: '#6b6460' }}>
                  The Meta Agent orchestrates autonomous SubTurtles to tackle complex tasks across your codebase. Each step is tracked, auditable, and fully version-controlled.
                </p>
              </div>

              {/* Key benefits cards */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" style={{ color: '#5a7247' }}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    <span className="font-semibold" style={{ color: '#1a1815' }}>Autonomous execution:</span> SubTurtles work independently without human intervention
                  </p>
                </div>
                <div className="flex gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" style={{ color: '#c07a56' }}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    <span className="font-semibold" style={{ color: '#1a1815' }}>Fully auditable:</span> Every change is committed with complete state tracking
                  </p>
                </div>
                <div className="flex gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" style={{ color: '#8fa87e' }}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    <span className="font-semibold" style={{ color: '#1a1815' }}>Flexible strategies:</span> Choose execution speed and cost with loop types
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loop types Section */}
      <section id="loop-types" className="relative w-full py-20 px-6 overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight" style={{ color: '#2d2a26' }}>
              Loop types
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#6b6460' }}>
              Choose the execution strategy that fits your needs. Balance thoroughness, speed, and cost.
            </p>
          </div>

          {/* Loop type cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Loop type 1: Slow */}
            <div className="group relative">
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: 'rgba(90, 114, 71, 0.05)' }} />
              <div className="relative p-8 rounded-xl border transition-colors duration-300" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(90, 114, 71, 0.2)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1" style={{ color: '#2d2a26' }}>Slow</h3>
                    <p className="text-sm" style={{ color: '#5a7247' }}>Thorough & Comprehensive</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgba(90, 114, 71, 0.1)', borderColor: 'rgba(90, 114, 71, 0.3)', border: '1px solid' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6b6460' }}>
                  Full Plan→Groom→Execute→Review loop. Comprehensive analysis, multiple model calls, best for complex tasks.
                </p>

                {/* Details */}
                <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(90, 114, 71, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Multi-model reasoning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Detailed planning phase</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Review & validation</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(90, 114, 71, 0.1)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#5a7247' }}>Best for</p>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    Complex features, critical bugs, architectural decisions
                  </p>
                </div>
              </div>
            </div>

            {/* Loop type 2: Yolo */}
            <div className="group relative">
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: 'rgba(192, 122, 86, 0.05)' }} />
              <div className="relative p-8 rounded-xl border transition-colors duration-300" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(192, 122, 86, 0.2)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1" style={{ color: '#2d2a26' }}>Yolo</h3>
                    <p className="text-sm" style={{ color: '#c07a56' }}>Fast & Direct</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgba(192, 122, 86, 0.1)', borderColor: 'rgba(192, 122, 86, 0.3)', border: '1px solid' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#c07a56' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6b6460' }}>
                  Single Claude call with full context. Quick decisions without the planning overhead. Perfect for straightforward tasks.
                </p>

                {/* Details */}
                <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(192, 122, 86, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#c07a56' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Single API call</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#c07a56' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Direct execution</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#c07a56' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Fast turnaround</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(192, 122, 86, 0.1)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#c07a56' }}>Best for</p>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    Quick fixes, documentation, simple features
                  </p>
                </div>
              </div>
            </div>

            {/* Loop type 3: Yolo-Codex */}
            <div className="group relative">
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: 'rgba(143, 168, 126, 0.05)' }} />
              <div className="relative p-8 rounded-xl border transition-colors duration-300" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(143, 168, 126, 0.2)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1" style={{ color: '#2d2a26' }}>Yolo-Codex</h3>
                    <p className="text-sm" style={{ color: '#8fa87e' }}>Cost-Optimized</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgba(143, 168, 126, 0.1)', borderColor: 'rgba(143, 168, 126, 0.3)', border: '1px solid' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#8fa87e' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6b6460' }}>
                  Leverage Codex for cost-efficient operations. Fast and budget-friendly for high-volume or resource-constrained runs.
                </p>

                {/* Details */}
                <div className="space-y-3 pt-6" style={{ borderTop: '1px solid rgba(143, 168, 126, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8fa87e' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Codex-based execution</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8fa87e' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Lower token usage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8fa87e' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b6460' }}>Minimized costs</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(143, 168, 126, 0.1)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#8fa87e' }}>Best for</p>
                  <p className="text-sm" style={{ color: '#6b6460' }}>
                    Batch operations, large codebases, budget-conscious runs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border p-8" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: '#2d2a26' }}>Quick Comparison</h3>

            {/* Mobile: Stacked blocks layout */}
            <div className="md:hidden space-y-8">
              {/* Thoroughness */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base" style={{ color: '#6b6460' }}>Thoroughness</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#5a7247' }}>Slow</span>
                    <span className="font-semibold text-sm" style={{ color: '#5a7247' }}>★★★★★</span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#c07a56' }}>Yolo</span>
                    <span className="font-semibold text-sm" style={{ color: '#c07a56' }}>★★★☆☆</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm" style={{ color: '#8fa87e' }}>Yolo-Codex</span>
                    <span className="font-semibold text-sm" style={{ color: '#8fa87e' }}>★★☆☆☆</span>
                  </div>
                </div>
              </div>

              {/* Speed */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base" style={{ color: '#6b6460' }}>Speed</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#5a7247' }}>Slow</span>
                    <span className="font-semibold text-sm" style={{ color: '#5a7247' }}>★★☆☆☆</span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#c07a56' }}>Yolo</span>
                    <span className="font-semibold text-sm" style={{ color: '#c07a56' }}>★★★★★</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm" style={{ color: '#8fa87e' }}>Yolo-Codex</span>
                    <span className="font-semibold text-sm" style={{ color: '#8fa87e' }}>★★★★☆</span>
                  </div>
                </div>
              </div>

              {/* Cost */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base" style={{ color: '#6b6460' }}>Cost</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#5a7247' }}>Slow</span>
                    <span className="font-semibold text-sm" style={{ color: '#5a7247' }}>Higher</span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <span className="text-sm" style={{ color: '#c07a56' }}>Yolo</span>
                    <span className="font-semibold text-sm" style={{ color: '#c07a56' }}>Standard</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm" style={{ color: '#8fa87e' }}>Yolo-Codex</span>
                    <span className="font-semibold text-sm" style={{ color: '#8fa87e' }}>Lower</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottomColor: 'rgba(90, 114, 71, 0.15)', borderBottomWidth: '1px' }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: '#6b6460' }}>Dimension</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#5a7247' }}>Slow</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#c07a56' }}>Yolo</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: '#8fa87e' }}>Yolo-Codex</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: 'rgba(90, 114, 71, 0.1)' }}>
                  <tr style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <td className="py-3 px-4" style={{ color: '#6b6460' }}>Thoroughness</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#5a7247' }}>★★★★★</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#c07a56' }}>★★★☆☆</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#8fa87e' }}>★★☆☆☆</td>
                  </tr>
                  <tr style={{ borderBottomColor: 'rgba(90, 114, 71, 0.1)', borderBottomWidth: '1px' }}>
                    <td className="py-3 px-4" style={{ color: '#6b6460' }}>Speed</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#5a7247' }}>★★☆☆☆</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#c07a56' }}>★★★★★</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#8fa87e' }}>★★★★☆</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4" style={{ color: '#6b6460' }}>Cost</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#5a7247' }}>Higher</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#c07a56' }}>Standard</td>
                    <td className="py-3 px-4 text-center" style={{ color: '#8fa87e' }}>Lower</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <section id="terminal-demo" className="relative w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#faf8f5' }}>
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight" style={{ color: '#2d2a26' }}>
              See it in action
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: '#5a7247' }}>
              Spawning a SubTurtle is as simple as one command. Watch the system initialize and start executing autonomously.
            </p>
          </div>

          {/* Terminal demo - stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center">
            {/* Left: Terminal */}
            <div className="w-full min-w-0">
              <TypedTerminal
                lines={terminalLines}
                speed={20}
                startDelay={300}
              />
            </div>

            {/* Right: Explanation */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-semibold" style={{ color: '#2d2a26' }}>Instant autonomous execution</h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#5a7247' }}>
                  One command spawns a SubTurtle with a dedicated task. It immediately begins its execution loop, working independently with minimal supervision.
                </p>
              </div>

              {/* Key features */}
              <div className="space-y-3">
                {/* Feature 1 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: 'rgba(90, 114, 71, 0.1)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#2d2a26' }}>State file created</h4>
                    <p className="text-xs sm:text-sm" style={{ color: '#5a7247' }}>Isolated CLAUDE.md holds task requirements and execution state.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: 'rgba(90, 114, 71, 0.1)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#2d2a26' }}>Process spawned</h4>
                    <p className="text-xs sm:text-sm" style={{ color: '#5a7247' }}>SubTurtle process starts immediately with its own workspace and PID.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: 'rgba(90, 114, 71, 0.1)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#2d2a26' }}>Cron supervision registered</h4>
                    <p className="text-xs sm:text-sm" style={{ color: '#5a7247' }}>Periodic check-ins ensure the task stays on track and respects timeout.</p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: 'rgba(90, 114, 71, 0.1)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5a7247' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#2d2a26' }}>Running autonomously</h4>
                    <p className="text-xs sm:text-sm" style={{ color: '#5a7247' }}>Monitor progress via logs. No further input needed—SubTurtle handles the rest.</p>
                  </div>
                </div>
              </div>

              {/* Live log hint */}
              <div className="pt-4" style={{ borderTopColor: 'rgba(90, 114, 71, 0.2)', borderTopWidth: '1px' }}>
                <p className="text-xs sm:text-sm flex gap-2" style={{ color: '#5a7247' }}>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Check .subturtles/[name]/subturtle.log for full execution details</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section id="getting-started" className="relative w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#faf8f5' }}>
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight" style={{ color: '#2d2a26' }}>
              Get started
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: '#5a7247' }}>
              Clone the repository, install dependencies, and spawn your first SubTurtle in minutes.
            </p>
          </div>

          {/* Installation steps */}
          <div className="space-y-6 sm:space-y-8">
            {/* Step 1: Clone */}
            <div>
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center mt-0.5 sm:mt-0" style={{ backgroundColor: 'rgba(90, 114, 71, 0.15)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                  <span className="font-bold text-xs sm:text-sm" style={{ color: '#5a7247' }}>1</span>
                </div>
                <h3 className="text-base sm:text-xl font-semibold pt-1 sm:pt-0" style={{ color: '#2d2a26' }}>Clone the repository</h3>
              </div>
              <div className="sm:ml-11 rounded-lg border overflow-x-auto" style={{ backgroundColor: '#1e1c1a', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
                <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm whitespace-nowrap" style={{ color: '#e8e8e4' }}>
                  <div><span style={{ color: '#d4a574' }}>$</span> git clone https://github.com/yourusername/agentic</div>
                  <div><span style={{ color: '#d4a574' }}>$</span> cd agentic</div>
                </div>
              </div>
            </div>

            {/* Step 2: Install */}
            <div>
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center mt-0.5 sm:mt-0" style={{ backgroundColor: 'rgba(90, 114, 71, 0.15)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                  <span className="font-bold text-xs sm:text-sm" style={{ color: '#5a7247' }}>2</span>
                </div>
                <h3 className="text-base sm:text-xl font-semibold pt-1 sm:pt-0" style={{ color: '#2d2a26' }}>Install dependencies</h3>
              </div>
              <div className="sm:ml-11 rounded-lg border overflow-x-auto" style={{ backgroundColor: '#1e1c1a', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
                <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm whitespace-nowrap" style={{ color: '#e8e8e4' }}>
                  <div><span style={{ color: '#d4a574' }}>$</span> npm install</div>
                  <div className="text-xs mt-2" style={{ color: '#8fa87e' }}># or yarn, pnpm, bun</div>
                </div>
              </div>
            </div>

            {/* Step 3: Spawn */}
            <div>
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center mt-0.5 sm:mt-0" style={{ backgroundColor: 'rgba(90, 114, 71, 0.15)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                  <span className="font-bold text-xs sm:text-sm" style={{ color: '#5a7247' }}>3</span>
                </div>
                <h3 className="text-base sm:text-xl font-semibold pt-1 sm:pt-0" style={{ color: '#2d2a26' }}>Spawn your first SubTurtle</h3>
              </div>
              <div className="sm:ml-11 rounded-lg border overflow-x-auto" style={{ backgroundColor: '#1e1c1a', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
                <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm" style={{ color: '#e8e8e4' }}>
                  <div className="whitespace-nowrap"><span style={{ color: '#d4a574' }}>$</span> ./super_turtle/subturtle/ctl spawn my-task \</div>
                  <div className="whitespace-nowrap pl-4 sm:pl-0">--type yolo --timeout 1h</div>
                </div>
              </div>
            </div>

            {/* Step 4: Monitor */}
            <div>
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center mt-0.5 sm:mt-0" style={{ backgroundColor: 'rgba(90, 114, 71, 0.15)', borderColor: 'rgba(90, 114, 71, 0.3)' }}>
                  <span className="font-bold text-xs sm:text-sm" style={{ color: '#5a7247' }}>4</span>
                </div>
                <h3 className="text-base sm:text-xl font-semibold pt-1 sm:pt-0" style={{ color: '#2d2a26' }}>Monitor progress</h3>
              </div>
              <div className="sm:ml-11 rounded-lg border overflow-x-auto" style={{ backgroundColor: '#1e1c1a', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
                <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm whitespace-nowrap" style={{ color: '#e8e8e4' }}>
                  <div><span style={{ color: '#d4a574' }}>$</span> tail -f .subturtles/my-task/subturtle.log</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional options */}
          <div className="mt-12 sm:mt-16 p-4 sm:p-8 rounded-xl border" style={{ backgroundColor: '#f5f3f0', borderColor: 'rgba(90, 114, 71, 0.2)' }}>
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6" style={{ color: '#2d2a26' }}>Available loop types</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm">
              <div>
                <p className="font-semibold mb-2" style={{ color: '#5a7247' }}>--type slow</p>
                <p style={{ color: '#5a7247' }}>Thorough planning and execution. Best for complex tasks.</p>
              </div>
              <div>
                <p className="font-semibold mb-2" style={{ color: '#c07a56' }}>--type yolo</p>
                <p style={{ color: '#5a7247' }}>Fast, direct execution. Perfect for quick fixes and simple tasks.</p>
              </div>
              <div>
                <p className="font-semibold mb-2" style={{ color: '#8fa87e' }}>--type yolo-codex</p>
                <p style={{ color: '#5a7247' }}>Cost-optimized using Codex. Great for batch operations.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 sm:mt-12 text-center">
            <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: '#5a7247' }}>Ready to automate your workflow?</p>
            <a
              href="https://github.com/yourusername/agentic"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#5a7247', color: 'white' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a5f3b')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5a7247')}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full py-12 px-6" style={{ backgroundColor: '#faf8f5', borderTop: '1px solid rgba(90, 114, 71, 0.15)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Left: Project info */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#2d2a26' }}>
                <span>🐢</span> agentic
              </h3>
              <p className="text-sm mb-4" style={{ color: '#5a7247' }}>
                Autonomous agent coordination for Claude Code. Spawn, supervise, and scale your AI workflows.
              </p>
              <p className="text-xs" style={{ color: '#7a8562' }}>
                Made with <span style={{ color: '#c07a56' }}>❤️</span> for developers who love building intelligent systems.
              </p>
            </div>

            {/* Center: Quick links */}
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#2d2a26' }}>Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#what-it-does"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('what-it-does')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#getting-started"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('getting-started')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    Get started
                  </a>
                </li>
              </ul>
            </div>

            {/* Right: Social & external */}
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#2d2a26' }}>Community</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/yourusername/agentic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://claude.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    <span>🤖</span> Built with Claude
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/yourusername/agentic/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{ color: '#5a7247' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c07a56')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7247')}
                  >
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(90, 114, 71, 0.15)', paddingTop: '2rem', marginBottom: '2rem' }} />

          {/* Bottom section: Badges and copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Copyright */}
            <div className="text-center md:text-left text-sm" style={{ color: '#7a8562' }}>
              <p>
                © {new Date().getFullYear()} agentic. Open source & freely available under the MIT License.
              </p>
            </div>

            {/* Right: Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
              <a
                href="https://github.com/yourusername/agentic"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: 'rgba(90, 114, 71, 0.3)',
                  backgroundColor: 'rgba(90, 114, 71, 0.08)',
                  color: '#5a7247',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(90, 114, 71, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(90, 114, 71, 0.08)';
                }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-xs font-semibold">View on GitHub</span>
              </a>

              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: 'rgba(192, 122, 86, 0.3)',
                  backgroundColor: 'rgba(192, 122, 86, 0.08)',
                  color: '#c07a56',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(192, 122, 86, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(192, 122, 86, 0.08)';
                }}
              >
                <span className="text-xs">🤖</span>
                <span className="text-xs font-semibold">Claude Code</span>
              </a>

              <div
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full border"
                style={{
                  borderColor: 'rgba(143, 168, 126, 0.3)',
                  backgroundColor: 'rgba(143, 168, 126, 0.08)',
                  color: '#8fa87e',
                }}
              >
                <span className="text-xs">📝</span>
                <span className="text-xs font-semibold">MIT License</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
