import { session } from "../session";
import { ClaudeDriver } from "./claude-driver";
import { CodexDriver } from "./codex-driver";
import type { ChatDriver, DriverId } from "./types";

const drivers: Record<DriverId, ChatDriver> = {
  claude: new ClaudeDriver(),
  codex: new CodexDriver(),
};

export function getDriver(driverId: DriverId): ChatDriver {
  return drivers[driverId];
}

export function getCurrentDriver(): ChatDriver {
  return getDriver(session.activeDriver);
}
