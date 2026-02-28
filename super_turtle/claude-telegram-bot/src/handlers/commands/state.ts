/**
 * Claude state/backlog parsing utilities.
 *
 * Reads and parses CLAUDE.md state files for SubTurtle and root task tracking.
 */

export type ClaudeStateSummary = {
  currentTask: string;
  backlogDone: number;
  backlogTotal: number;
  backlogCurrent: string;
};

export type ClaudeBacklogItem = {
  text: string;
  done: boolean;
  current: boolean;
};

function extractMarkdownSection(content: string, headingPattern: string): string {
  const headingRegex = new RegExp(`^#{1,6}\\s*${headingPattern}\\s*$`, "im");
  const headingMatch = headingRegex.exec(content);
  if (!headingMatch) return "";

  const afterHeading = content.slice(headingMatch.index + headingMatch[0].length);
  const nextHeadingMatch = /\n#{1,6}\s+/.exec(afterHeading);
  const section = nextHeadingMatch ? afterHeading.slice(0, nextHeadingMatch.index) : afterHeading;
  return section.trim();
}

function sanitizeTaskLine(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/\s*<-\s*current\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseClaudeBacklogItems(content: string): ClaudeBacklogItem[] {
  const backlogSection = extractMarkdownSection(content, "Backlog");
  if (!backlogSection) return [];

  return backlogSection
    .split("\n")
    .map((line) => line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const rawText = match[2] || "";
      const text = sanitizeTaskLine(rawText);
      return {
        text,
        done: match[1]?.toLowerCase() === "x",
        current: /<-\s*current/i.test(rawText),
      };
    })
    .filter((item) => item.text.length > 0);
}

export function parseClaudeStateSummary(content: string): ClaudeStateSummary {
  const currentTaskSection = extractMarkdownSection(content, "Current\\s+Task");
  const currentTask = currentTaskSection
    .split("\n")
    .map((line) => sanitizeTaskLine(line))
    .find((line) => line.length > 0) || "";

  const backlogItems = parseClaudeBacklogItems(content);

  const currentBacklogItem =
    backlogItems.find((item) => item.current && !item.done)?.text ||
    backlogItems.find((item) => item.current)?.text ||
    backlogItems.find((item) => !item.done)?.text ||
    "";

  return {
    currentTask,
    backlogDone: backlogItems.filter((item) => item.done).length,
    backlogTotal: backlogItems.length,
    backlogCurrent: currentBacklogItem,
  };
}

export async function readClaudeStateSummary(path: string): Promise<ClaudeStateSummary | null> {
  try {
    const content = await Bun.file(path).text();
    return parseClaudeStateSummary(content);
  } catch {
    return null;
  }
}

export async function readClaudeBacklogItems(path: string): Promise<ClaudeBacklogItem[]> {
  try {
    const content = await Bun.file(path).text();
    return parseClaudeBacklogItems(content);
  } catch {
    return [];
  }
}

export function formatBacklogSummary(summary: ClaudeStateSummary): string {
  if (summary.backlogTotal === 0) {
    return "No backlog checklist";
  }

  const progress = `${summary.backlogDone}/${summary.backlogTotal} done`;
  if (!summary.backlogCurrent) return progress;
  return `${progress} • Current: ${summary.backlogCurrent}`;
}
