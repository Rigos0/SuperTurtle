import { WORKING_DIR } from "../config";
import { session } from "../session";
import { stopActiveDriverQuery } from "./driver-routing";
import { streamLog } from "../logger";

const CTL_PATH = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
const stopLog = streamLog.child({ handler: "stop" });

export interface StopSubturtlesResult {
  attempted: string[];
  stopped: string[];
  failed: string[];
}

export interface StopAllRunningWorkResult extends StopSubturtlesResult {
  driverStopResult: "stopped" | "pending" | false;
}

function parseRunningSubturtleNames(output: string): string[] {
  const names = new Set<string>();

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("→")) {
      continue;
    }

    const match = line.match(/^([a-zA-Z0-9._-]+)\s+running\b/);
    if (match?.[1]) {
      names.add(match[1]);
    }
  }

  return Array.from(names);
}

export function stopAllRunningSubturtles(): StopSubturtlesResult {
  let runningNames: string[] = [];

  try {
    const listProc = Bun.spawnSync([CTL_PATH, "list"], { cwd: WORKING_DIR });
    const listOutput = `${listProc.stdout.toString()}\n${listProc.stderr.toString()}`;
    runningNames = parseRunningSubturtleNames(listOutput);
  } catch (error) {
    stopLog.warn({ err: error }, "Failed to list running SubTurtles");
    return { attempted: [], stopped: [], failed: [] };
  }

  const stopped: string[] = [];
  const failed: string[] = [];

  for (const name of runningNames) {
    try {
      const stopProc = Bun.spawnSync([CTL_PATH, "stop", name], { cwd: WORKING_DIR });
      if (stopProc.exitCode === 0) {
        stopped.push(name);
      } else {
        failed.push(name);
      }
    } catch (error) {
      stopLog.warn({ err: error, name }, "Failed to stop SubTurtle");
      failed.push(name);
    }
  }

  return {
    attempted: runningNames,
    stopped,
    failed,
  };
}

export async function stopAllRunningWork(): Promise<StopAllRunningWorkResult> {
  session.stopTyping();
  const driverStopResult = await stopActiveDriverQuery();
  const subturtleResult = stopAllRunningSubturtles();
  return {
    driverStopResult,
    ...subturtleResult,
  };
}
