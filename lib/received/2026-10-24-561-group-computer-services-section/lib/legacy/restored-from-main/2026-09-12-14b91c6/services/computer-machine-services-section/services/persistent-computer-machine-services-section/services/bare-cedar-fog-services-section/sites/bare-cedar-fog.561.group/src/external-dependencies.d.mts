declare module "@red-cup-engineering/systemd-unit-inventory-observation-service" {
  export function observeUnitInventory(scope: string): {
    host: string;
    units: readonly Record<string, unknown>[];
    timers: readonly Record<string, unknown>[];
  };
}

declare module "@red-cup-engineering/codex-session-activity-provider/collect-colony-activity" {
  export function collectCodexSessionActivity(options: {
    window: { fromExclusive: string; toInclusive: string };
    recordedAt: string;
  }): Promise<Record<string, unknown>>;
}

declare module "@red-cup-engineering/claude-session-activity-provider/collect-colony-activity" {
  export function collectClaudeSessionActivity(options: {
    window: { fromExclusive: string; toInclusive: string };
    recordedAt: string;
  }): Promise<Record<string, unknown>>;
}
