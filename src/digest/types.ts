// The digest's shared shape: section 2 of plan.md builds against this file alone.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job seen in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

// A night read from runs/<night>.jsonl. Lines that don't parse are counted, never thrown.
export type NightDigest = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// readNight(runsDir, night): null when the night has no file; rows sorted by job.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
