'use client';

import { useEffect, useState } from 'react';

export function StickyNav() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav when scrolled past the hero section (roughly 500px)
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`sticky-nav ${isVisible ? 'translate-y-0' : '-translate-y-full'} h-16 flex items-center px-4 sm:px-6 lg:px-8 border-b border-[rgba(74,95,59,0.08)]`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        {/* Left: Logo + Text */}
        <div className="flex items-center gap-3">
	          <div className="w-8 h-8 flex-shrink-0">
	            <img
	              src="/turtle-logo.png"
	              alt="SuperTurtle"
	              className="w-full h-full object-contain"
	            />
	          </div>
	          <span className="text-lg font-bold text-[#1a1815]">SuperTurtle</span>
	        </div>

        {/* Right: GitHub CTA */}
        <a
          href="https://github.com/Rigos0/superturtle"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-[#4a5f3b] text-white hover:bg-[#3d4d31] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(74,95,59,0.2)]"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.544 2.914 1.181.092-.916.35-1.544.636-1.9-2.22-.253-4.555-1.113-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.270.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.195 22 16.44 22 12.017 22 6.484 17.523 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          GitHub
        </a>
      </div>
    </nav>
  );
}
