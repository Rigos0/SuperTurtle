'use client';

import { TypedTerminal } from '@/components/TypedTerminal';

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
    <div className="w-full bg-black text-white font-sans">
      {/* Hero Section */}
      <section className="relative min-h-screen w-full bg-black overflow-hidden">
        {/* Animated background with gradient and subtle grid pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-black opacity-100" />

        {/* Subtle animated grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, 0.05) 25%, rgba(16, 185, 129, 0.05) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.05) 75%, rgba(16, 185, 129, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, 0.05) 25%, rgba(16, 185, 129, 0.05) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.05) 75%, rgba(16, 185, 129, 0.05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Accent blur effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl opacity-20" />

        {/* Content */}
        <main className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center px-6 py-16 max-w-6xl mx-auto">
          <div className="w-full max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-block">
              <div className="px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-sm font-medium">
                Autonomous Agent Coordination
              </div>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-teal-400 bg-clip-text text-transparent">
                agentic
              </span>
            </h1>

            {/* Tagline */}
            <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Spawn autonomous SubTurtles to handle complex tasks. They read, plan, execute, and commit—with supervision.
            </p>

            {/* Features teaser */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-sm text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Spawn &amp; Supervise</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Multiple Loop Types</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Self-Supervising</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/yourusername/agentic"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
              <a
                href="#features"
                className="px-8 py-4 border border-emerald-600/50 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 font-semibold rounded-lg transition-colors duration-200"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm flex flex-col items-center gap-2 animate-bounce">
            <span>Scroll to explore</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </main>
      </section>

      {/* What it does Section */}
      <section id="features" className="relative w-full bg-gradient-to-b from-black to-slate-950 py-20 px-6">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Subtle accent blur */}
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              What it does
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Three core capabilities that power autonomous agent coordination.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Spawn workers */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-white">Spawn workers</h3>
                <p className="text-gray-400 leading-relaxed">
                  Launch SubTurtles autonomously to handle complex tasks. Each worker gets its own workspace, state file, and supervision loop.
                </p>
              </div>
            </div>

            {/* Feature 2: Multiple loop types */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-white">Multiple loop types</h3>
                <p className="text-gray-400 leading-relaxed">
                  Choose your execution strategy: slow (thorough), yolo (fast), or yolo-codex (cost-optimized). Tailor to your needs.
                </p>
              </div>
            </div>

            {/* Feature 3: Self-supervising */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-white">Self-supervising</h3>
                <p className="text-gray-400 leading-relaxed">
                  Cron-based check-ins, automatic restarts, and progress tracking. Workers supervise themselves with minimal intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="relative w-full bg-black py-20 px-6">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Subtle accent blur */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl opacity-20" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              How it works
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Coordinate autonomous agents through a simple command-driven interface.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Flow diagram */}
            <div className="flex justify-center">
              <svg viewBox="0 0 400 600" className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
                {/* Define gradients */}
                <defs>
                  <linearGradient id="humanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#14b8a6', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="metaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>

                {/* Title */}
                <text x="200" y="30" fontSize="18" fontWeight="bold" fill="#ffffff" textAnchor="middle">
                  Agent Coordination Flow
                </text>

                {/* Step 1: Human/Developer */}
                <rect x="100" y="60" width="200" height="70" rx="8" fill="url(#humanGrad)" fillOpacity="0.1" stroke="#10b981" strokeWidth="2" />
                <circle cx="150" cy="95" r="6" fill="#10b981" />
                <text x="160" y="100" fontSize="14" fontWeight="bold" fill="#ffffff">You (Developer)</text>
                <circle cx="250" cy="95" r="6" fill="#10b981" />
                <text x="170" y="115" fontSize="12" fill="#cbd5e1">Telegram / CLI command</text>

                {/* Arrow 1 */}
                <line x1="200" y1="130" x2="200" y2="160" stroke="#10b981" strokeWidth="2" />
                <polygon points="200,160 195,150 205,150" fill="#10b981" />

                {/* Step 2: Meta Agent */}
                <rect x="80" y="160" width="240" height="70" rx="8" fill="url(#metaGrad)" fillOpacity="0.1" stroke="#06b6d4" strokeWidth="2" />
                <circle cx="120" cy="195" r="6" fill="#06b6d4" />
                <text x="130" y="200" fontSize="14" fontWeight="bold" fill="#ffffff">Meta Agent</text>
                <circle cx="310" cy="195" r="6" fill="#06b6d4" />
                <text x="145" y="220" fontSize="12" fill="#cbd5e1">Spawns SubTurtles with scoped tasks</text>

                {/* Arrow 2 */}
                <line x1="200" y1="230" x2="200" y2="260" stroke="#10b981" strokeWidth="2" />
                <polygon points="200,260 195,250 205,250" fill="#10b981" />

                {/* Step 3: SubTurtles (multiple) */}
                {/* SubTurtle 1 */}
                <rect x="20" y="260" width="110" height="100" rx="8" fill="#10b981" fillOpacity="0.05" stroke="#10b981" strokeWidth="1.5" />
                <text x="75" y="285" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="middle">SubTurtle 1</text>
                <text x="75" y="310" fontSize="10" fill="#d1fae5" textAnchor="middle">Read State</text>
                <text x="75" y="330" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Plan</text>
                <text x="75" y="350" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Execute ↓ Commit</text>

                {/* SubTurtle 2 */}
                <rect x="145" y="260" width="110" height="100" rx="8" fill="#10b981" fillOpacity="0.05" stroke="#10b981" strokeWidth="1.5" />
                <text x="200" y="285" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="middle">SubTurtle 2</text>
                <text x="200" y="310" fontSize="10" fill="#d1fae5" textAnchor="middle">Read State</text>
                <text x="200" y="330" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Plan</text>
                <text x="200" y="350" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Execute ↓ Commit</text>

                {/* SubTurtle N */}
                <rect x="270" y="260" width="110" height="100" rx="8" fill="#10b981" fillOpacity="0.05" stroke="#10b981" strokeWidth="1.5" />
                <text x="325" y="285" fontSize="12" fontWeight="bold" fill="#a7f3d0" textAnchor="middle">SubTurtle N</text>
                <text x="325" y="310" fontSize="10" fill="#d1fae5" textAnchor="middle">Read State</text>
                <text x="325" y="330" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Plan</text>
                <text x="325" y="350" fontSize="10" fill="#d1fae5" textAnchor="middle">↓ Execute ↓ Commit</text>

                {/* Arrow 3 */}
                <line x1="200" y1="360" x2="200" y2="390" stroke="#10b981" strokeWidth="2" />
                <polygon points="200,390 195,380 205,380" fill="#10b981" />

                {/* Step 4: Codebase & Meta Supervision */}
                <rect x="60" y="390" width="280" height="80" rx="8" fill="#06b6d4" fillOpacity="0.1" stroke="#06b6d4" strokeWidth="2" />
                <circle cx="100" cy="420" r="6" fill="#06b6d4" />
                <text x="110" y="425" fontSize="13" fontWeight="bold" fill="#ffffff">Codebase Modified</text>
                <circle cx="310" cy="430" r="6" fill="#06b6d4" />
                <text x="110" y="450" fontSize="11" fill="#cbd5e1">Git commits, state files, artifacts</text>
                <text x="110" y="470" fontSize="11" fill="#cbd5e1">Meta Agent supervises, progresses tasks</text>

                {/* Feedback arrow back to Meta Agent */}
                <path d="M 360 420 Q 380 300 240 200" stroke="#14b8a6" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                <polygon points="240,200 245,210 235,210" fill="#14b8a6" />
              </svg>
            </div>

            {/* Right: Description */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-white">Step-by-step coordination</h3>
                <p className="text-gray-400 leading-relaxed">
                  The Meta Agent orchestrates autonomous SubTurtles to tackle complex tasks across your codebase.
                </p>
              </div>

              {/* Step descriptions */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Initiate via CLI or Telegram</h4>
                    <p className="text-sm text-gray-400">Send a command to spawn a SubTurtle with a specific task and loop type.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <span className="text-cyan-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Meta Agent spawns SubTurtles</h4>
                    <p className="text-sm text-gray-400">Each SubTurtle gets its own workspace, CLAUDE.md state file, and execution environment.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">SubTurtle executes its loop</h4>
                    <p className="text-sm text-gray-400">Read state → Plan → Execute → Commit. Runs autonomously based on loop type selection.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <span className="text-cyan-400 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Meta Agent supervises & progresses</h4>
                    <p className="text-sm text-gray-400">Monitors progress via cron check-ins, course-corrects if needed, and advances to the next task.</p>
                  </div>
                </div>
              </div>

              {/* Visual emphasis */}
              <div className="pt-4 border-t border-emerald-500/20">
                <p className="text-sm text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Everything is version-controlled and auditable
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loop types Section */}
      <section id="loop-types" className="relative w-full bg-gradient-to-b from-black to-slate-950 py-20 px-6">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Subtle accent blur */}
        <div className="absolute bottom-1/2 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Loop types
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Choose the execution strategy that fits your needs. Balance thoroughness, speed, and cost.
            </p>
          </div>

          {/* Loop type cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Loop type 1: Slow */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Slow</h3>
                    <p className="text-sm text-emerald-400">Thorough & Comprehensive</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Full Plan→Groom→Execute→Review loop. Comprehensive analysis, multiple model calls, best for complex tasks.
                </p>

                {/* Details */}
                <div className="space-y-3 border-t border-emerald-500/10 pt-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Multi-model reasoning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Detailed planning phase</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Review & validation</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6 border-t border-emerald-500/10">
                  <p className="text-xs text-emerald-300 font-semibold mb-2">Best for</p>
                  <p className="text-sm text-gray-400">
                    Complex features, critical bugs, architectural decisions
                  </p>
                </div>
              </div>
            </div>

            {/* Loop type 2: Yolo */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Yolo</h3>
                    <p className="text-sm text-cyan-400">Fast & Direct</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors duration-300">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Single Claude call with full context. Quick decisions without the planning overhead. Perfect for straightforward tasks.
                </p>

                {/* Details */}
                <div className="space-y-3 border-t border-cyan-500/10 pt-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Single API call</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Direct execution</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Fast turnaround</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6 border-t border-cyan-500/10">
                  <p className="text-xs text-cyan-300 font-semibold mb-2">Best for</p>
                  <p className="text-sm text-gray-400">
                    Quick fixes, documentation, simple features
                  </p>
                </div>
              </div>
            </div>

            {/* Loop type 3: Yolo-Codex */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 rounded-xl border border-purple-500/20 group-hover:border-purple-500/40 transition-colors duration-300 bg-slate-900/30 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Yolo-Codex</h3>
                    <p className="text-sm text-purple-400">Cost-Optimized</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors duration-300">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Leverage Codex for cost-efficient operations. Fast and budget-friendly for high-volume or resource-constrained runs.
                </p>

                {/* Details */}
                <div className="space-y-3 border-t border-purple-500/10 pt-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Codex-based execution</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Lower token usage</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-sm text-gray-400">Minimized costs</span>
                  </div>
                </div>

                {/* Best for */}
                <div className="mt-6 pt-6 border-t border-purple-500/10">
                  <p className="text-xs text-purple-300 font-semibold mb-2">Best for</p>
                  <p className="text-sm text-gray-400">
                    Batch operations, large codebases, budget-conscious runs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/30 backdrop-blur-sm p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Quick Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-500/20">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Dimension</th>
                    <th className="text-center py-3 px-4 font-semibold text-emerald-400">Slow</th>
                    <th className="text-center py-3 px-4 font-semibold text-cyan-400">Yolo</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-400">Yolo-Codex</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Throughness</td>
                    <td className="py-3 px-4 text-center text-emerald-400">★★★★★</td>
                    <td className="py-3 px-4 text-center text-cyan-400">★★★☆☆</td>
                    <td className="py-3 px-4 text-center text-purple-400">★★☆☆☆</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Speed</td>
                    <td className="py-3 px-4 text-center text-emerald-400">★★☆☆☆</td>
                    <td className="py-3 px-4 text-center text-cyan-400">★★★★★</td>
                    <td className="py-3 px-4 text-center text-purple-400">★★★★☆</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-400">Cost</td>
                    <td className="py-3 px-4 text-center text-emerald-400">Higher</td>
                    <td className="py-3 px-4 text-center text-cyan-400">Standard</td>
                    <td className="py-3 px-4 text-center text-purple-400">Lower</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <section id="terminal-demo" className="relative w-full bg-black py-20 px-6">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, 0.03) 25%, rgba(16, 185, 129, 0.03) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, 0.03) 75%, rgba(16, 185, 129, 0.03) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Subtle accent blur */}
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              See it in action
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Spawning a SubTurtle is as simple as one command. Watch the system initialize and start executing autonomously.
            </p>
          </div>

          {/* Terminal demo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Terminal */}
            <div>
              <TypedTerminal
                lines={terminalLines}
                speed={20}
                startDelay={300}
              />
            </div>

            {/* Right: Explanation */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-white">Instant autonomous execution</h3>
                <p className="text-gray-400 leading-relaxed">
                  One command spawns a SubTurtle with a dedicated task. It immediately begins its execution loop, working independently with minimal supervision.
                </p>
              </div>

              {/* Key features */}
              <div className="space-y-4">
                {/* Feature 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">State file created</h4>
                    <p className="text-sm text-gray-400">Isolated CLAUDE.md holds task requirements and execution state.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Process spawned</h4>
                    <p className="text-sm text-gray-400">SubTurtle process starts immediately with its own workspace and PID.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Cron supervision registered</h4>
                    <p className="text-sm text-gray-400">Periodic check-ins ensure the task stays on track and respects timeout.</p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Running autonomously</h4>
                    <p className="text-sm text-gray-400">Monitor progress via logs. No further input needed—SubTurtle handles the rest.</p>
                  </div>
                </div>
              </div>

              {/* Live log hint */}
              <div className="pt-4 border-t border-emerald-500/20">
                <p className="text-sm text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Check .subturtles/[name]/subturtle.log for full execution details
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
