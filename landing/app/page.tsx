const agenda = [
  { time: '18:30', title: 'Doors Open + Networking', detail: 'Meet builders, founders, and growth teams over coffee.' },
  { time: '19:00', title: 'Welcome: Why Product Analytics Matters', detail: 'Quick kickoff on measurable product bets in 2026.' },
  { time: '19:20', title: 'Apify x PostHog Session', detail: 'How event instrumentation and autonomous agents work together.' },
  { time: '20:00', title: 'Lightning Demos', detail: 'Three 7-minute demos from local teams shipping fast.' },
  { time: '20:45', title: 'Q&A + Open Hangout', detail: 'Bring your stack questions and architecture tradeoffs.' },
];

const highlights = [
  'Happening today: Thursday, February 26, 2026',
  'Mobile-friendly agenda and practical sessions',
  'Real-world setup: Apify automation + PostHog analytics',
];

export default function Home() {
  return (
    <main className="meetup-page">
      <div className="background-grid" aria-hidden="true" />

      <section className="hero-card">
        <p className="eyebrow">Prague Product Community</p>
        <h1>Apify Meetup with PostHog</h1>
        <p className="hero-lead">Today only. One evening focused on product analytics, growth loops, and agentic workflows.</p>

        <div className="hero-badge-row">
          <span className="hero-badge">Epify Puzlo Edition</span>
          <span className="hero-badge hero-badge--soft">Red-forward Design</span>
        </div>

        <div className="status-row">
          <span className="live-dot" />
          <p>Live today, Thu Feb 26, 2026</p>
        </div>

        <div className="cta-row">
          <a className="cta-primary" href="#agenda">View Agenda</a>
          <a className="cta-secondary" href="#venue">Get Directions</a>
        </div>
      </section>

      <section className="panel">
        <h2>Why show up</h2>
        <ul className="highlight-list">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="agenda" className="panel">
        <div className="section-head">
          <h2>Tonight&apos;s agenda</h2>
          <p>Compact timeline built for mobile scanning.</p>
        </div>
        <div className="agenda-stack">
          {agenda.map((item) => (
            <article key={`${item.time}-${item.title}`} className="agenda-item">
              <p className="agenda-time">{item.time}</p>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel dual">
        <article className="info-tile apify">
          <p className="tile-label">Host</p>
          <h3>Apify</h3>
          <p>Automation and web data workflows for teams moving from idea to production quickly.</p>
        </article>
        <article className="info-tile posthog">
          <p className="tile-label">Featured</p>
          <h3>PostHog</h3>
          <p>Product analytics, feature flags, and experiments that close the loop from usage to decisions.</p>
        </article>
      </section>

      <section id="venue" className="panel venue">
        <h2>Venue and access</h2>
        <p>Apify HQ, Prague. Doors open at 18:30. Metro + tram friendly. Bring your phone for live demos.</p>
        <div className="cta-row">
          <a className="cta-primary" href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Open Maps</a>
          <a className="cta-secondary" href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Add to Calendar</a>
        </div>
      </section>
    </main>
  );
}
