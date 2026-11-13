import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('run log reader', () => {
  it('reads the 2026-10-28 fixture into 5 jobs and counts the bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night!.badLines).toBe(1);
  });

  it('keeps retries, last status and last error per job', () => {
    const night = readNight('runs', '2026-10-28')!;
    const refresh = night.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh.retries).toBe(3);
    expect(refresh.lastStatus).toBe('ok');
    expect(refresh.lastError).toBe('upstream 503');
    const backup = night.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');
  });

  it('keeps a row whose owner is null', () => {
    const night = readNight('runs', '2026-10-28')!;
    const render = night.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
  });

  it('answers null for a night with no file', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
  });
});
