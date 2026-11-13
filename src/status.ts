import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  nightCounts: Record<string, NightCounts | null>;
};

export type NightCounts = { ok: number; retry: number; fail: number };

// counts = jobs by their last status. null when the night has no readable file.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  const digest = readNight(runsDir, night);
  if (!digest) return null;
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of digest.rows) counts[row.lastStatus] += 1;
  return counts;
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    nightCounts: Object.fromEntries(nights.map((n) => [n, nightCounts(config.runsDir, n)])),
  };
}
