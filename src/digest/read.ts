import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus } from './types.js';

type RunLine = { at: string; job: string; status: RunStatus; owner?: string | null; error?: string };

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

function parseLine(line: string): RunLine | null {
  try {
    const value = JSON.parse(line) as Partial<RunLine>;
    if (typeof value.at !== 'string' || typeof value.job !== 'string') return null;
    if (typeof value.status !== 'string' || !STATUSES.includes(value.status)) return null;
    return value as RunLine;
  } catch {
    return null;
  }
}

// Reads runs/<night>.jsonl into one row per job. A line that doesn't parse is counted,
// never thrown; a missing file is null (the route turns that into a 404).
export const readNight: ReadNight = (runsDir, night) => {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const run = parseLine(line);
    if (!run) {
      badLines += 1;
      continue;
    }
    const row = byJob.get(run.job);
    if (!row) {
      byJob.set(run.job, {
        job: run.job,
        owner: run.owner ?? null,
        runs: 1,
        retries: run.status === 'retry' ? 1 : 0,
        lastStatus: run.status,
        lastError: run.error ?? null,
        first: run.at,
        last: run.at,
      });
      continue;
    }
    row.runs += 1;
    if (run.status === 'retry') row.retries += 1;
    row.lastStatus = run.status;
    if (run.error) row.lastError = run.error;
    row.owner = row.owner ?? run.owner ?? null;
    if (run.at < row.first) row.first = run.at;
    if (run.at > row.last) row.last = run.at;
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
};
