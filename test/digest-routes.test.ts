import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

const line = (at: string, job: string, status: string, owner: string | null) =>
  JSON.stringify({ at, job, status, owner });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-11-01.jsonl'),
    [
      line('2026-11-01T23:00:00+01:00', 'zeta/job', 'ok', 'rook'),
      line('2026-11-01T23:01:00+01:00', 'alpha/job', 'ok', null),
      line('2026-11-01T23:02:00+01:00', 'mid/job', 'fail', 'lane-07'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-11-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-11-03.jsonl'),
    [line('2026-11-03T23:00:00+01:00', 'good/job', 'ok', 'rook'), 'not json {'].join('\n') + '\n',
  );
  app = createApp({ ...base, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('renders the jobs of a night that has a file', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['alpha/job', 'mid/job', 'zeta/job']) expect(html).toContain(job);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-11-09');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty file', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('renders the good rows of a night with a bad line', async () => {
    const res = await app.request('/digest/2026-11-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('good/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the reader rows in the same order, badLines included', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    const body = await res.json();
    const expected = readNight(dir, '2026-11-01')!;
    expect(res.status).toBe(200);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    expect(body.rows).toEqual(expected.rows);
    expect(body.badLines).toBe(0);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-11-09');
    expect(res.status).toBe(404);
  });

  it('answers zero rows for an empty file', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('counts the bad line and still returns the good rows', async () => {
    const res = await app.request('/api/digest/2026-11-03');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['good/job']);
  });
});
