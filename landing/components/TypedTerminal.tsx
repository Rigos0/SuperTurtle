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
    <div className="w-full bg-slate-950 rounded-lg border border-emerald-500/20 overflow-hidden">
      {/* Terminal header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-emerald-500/20 flex items-center gap-2">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-gray-500 ml-2">terminal</span>
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-sm text-gray-200 overflow-x-auto min-h-64">
        {displayLines.map((line, idx) => (
          <div
            key={idx}
            className={`leading-relaxed ${
              line.isCommand ? 'text-emerald-400' : line.isOutput ? 'text-gray-300' : ''
            }`}
          >
            {line.isCommand && <span className="text-gray-500">$ </span>}
            <span>{line.text}</span>
            {!line.isComplete && <span className="animate-pulse text-emerald-400">▊</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
