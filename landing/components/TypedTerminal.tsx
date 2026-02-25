'use client';

import { useEffect, useState } from 'react';

interface TerminalLine {
  text: string;
  isCommand?: boolean;
  isOutput?: boolean;
}

interface TypedTerminalProps {
  lines: TerminalLine[];
  speed?: number; // milliseconds per character
  startDelay?: number; // milliseconds before starting
}

export function TypedTerminal({ lines, speed = 30, startDelay = 500 }: TypedTerminalProps) {
  const [displayLines, setDisplayLines] = useState<{ text: string; isCommand?: boolean; isOutput?: boolean; isComplete?: boolean }[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!lines.length) return;

    const timer = setTimeout(() => {
      let charIndex = 0;
      let lineIndex = 0;
      let currentLineText = '';
      const result: { text: string; isCommand?: boolean; isOutput?: boolean; isComplete?: boolean }[] = [];

      const typeNextChar = () => {
        if (lineIndex >= lines.length) {
          setIsComplete(true);
          return;
        }

        const currentLine = lines[lineIndex];
        if (charIndex < currentLine.text.length) {
          currentLineText += currentLine.text[charIndex];
          charIndex++;

          // Update display with current progress
          const displayResult = [...result];
          displayResult[lineIndex] = {
            text: currentLineText,
            isCommand: currentLine.isCommand,
            isOutput: currentLine.isOutput,
            isComplete: false,
          };
          setDisplayLines(displayResult);

          setTimeout(typeNextChar, speed);
        } else {
          // Line complete, move to next line
          result.push({
            text: currentLineText,
            isCommand: currentLine.isCommand,
            isOutput: currentLine.isOutput,
            isComplete: true,
          });
          setDisplayLines([...result]);

          lineIndex++;
          charIndex = 0;
          currentLineText = '';

          // Add delay between lines for output lines
          const delayBetweenLines = currentLine.isOutput ? 100 : 50;
          setTimeout(typeNextChar, delayBetweenLines);
        }
      };

      typeNextChar();
    }, startDelay);

    return () => clearTimeout(timer);
  }, [lines, speed, startDelay]);

  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--terminal-bg)', border: '1px solid rgba(212, 165, 116, 0.3)' }}>
      {/* Terminal header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--terminal-bg)', borderBottom: '1px solid rgba(212, 165, 116, 0.2)' }}>
        <div className="flex gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs ml-2" style={{ color: 'rgba(232, 232, 228, 0.5)' }}>terminal</span>
      </div>

      {/* Terminal content */}
      <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto min-h-48 sm:min-h-64" style={{ color: 'var(--terminal-text)' }}>
        {displayLines.map((line, idx) => (
          <div
            key={idx}
            className="leading-relaxed"
            style={{
              color: line.isCommand ? 'var(--terminal-accent)' : line.isOutput ? 'var(--terminal-text)' : 'var(--terminal-text)',
            }}
          >
            {line.isCommand && <span style={{ color: 'rgba(212, 165, 116, 0.7)' }}>$ </span>}
            <span>{line.text}</span>
            {!line.isComplete && <span className="animate-pulse" style={{ color: 'var(--terminal-accent)' }}>▊</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
