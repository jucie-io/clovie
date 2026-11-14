// `clovie serve` stopped by a signal: the config's beforeStop runs to the end
// before HTTP closes, within a deadline the config can raise, and a hook that
// fails or overruns still ends the process, with a non-zero code.
import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = resolve('bin/cli.js');
const CONFIG = resolve('__tests__/fixtures/shutdown/clovie.config.js');

const dirs = [];
const children = [];
afterEach(() => {
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Serves the fixture with `env`, then `signals` once it listens, `apartMs` apart; answers how it ended. */
async function serveThenStop(env, { signals = ['SIGTERM'], apartMs = 100 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'clovie-shutdown-'));
  dirs.push(dir);
  const mark = join(dir, 'mark.json');
  const child = spawn(process.execPath, [CLI, 'serve', '--config', CONFIG], {
    cwd: dir,
    env: { ...process.env, ...env, OUT: join(dir, 'dist'), MARK: mark },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let output = '';
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exited = new Promise((done) => child.once('exit', (code) => done(code)));

  await new Promise((listening, failed) => {
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('LISTENING')) listening();
    });
    exited.then((code) => failed(new Error(`exited ${code} before listening:\n${output}`)));
  });

  const signalledAt = Date.now();
  for (const [index, signal] of signals.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, apartMs));
    child.kill(signal);
  }
  const code = await exited;
  return {
    code,
    tookMs: Date.now() - signalledAt,
    mark: existsSync(mark) ? JSON.parse(readFileSync(mark, 'utf8')) : null,
    output,
  };
}

describe('clovie serve, stopped by SIGTERM', () => {
  it('runs beforeStop to the end while the server still answers, then exits 0', async () => {
    const { code, mark } = await serveThenStop({ HOOK: 'wait', DELAY_MS: '200' });
    expect(mark).toEqual({ answered: true });
    expect(code).toBe(0);
  });

  it('waits past the default 5 seconds for a hook when the config raises the deadline', async () => {
    const { code, mark, tookMs } = await serveThenStop({ HOOK: 'wait', DELAY_MS: '5500', SHUTDOWN_TIMEOUT_MS: '9000' });
    expect(tookMs).toBeGreaterThanOrEqual(5500);
    expect(mark).toEqual({ answered: true });
    expect(code).toBe(0);
  }, 15_000);

  it('exits 1 at the config\'s deadline when the hook never finishes', async () => {
    const { code, tookMs } = await serveThenStop({ HOOK: 'hang', SHUTDOWN_TIMEOUT_MS: '300' });
    expect(code).toBe(1);
    expect(tookMs).toBeLessThan(3000);
  });

  // Ctrl-C through `npm run` arrives twice, and a second `docker stop` once more.
  it('lets a second signal go by while the hook runs', async () => {
    const { code, mark } = await serveThenStop({ HOOK: 'wait', DELAY_MS: '500' }, { signals: ['SIGTERM', 'SIGTERM'] });
    expect(mark).toEqual({ answered: true });
    expect(code).toBe(0);
  });

  it('runs beforeStop and exits 1 after a crash, however the stop goes', async () => {
    const { code, mark } = await serveThenStop({ HOOK: 'wait', FAIL_AFTER_LISTEN: '1' }, { signals: [] });
    expect(mark).toEqual({ answered: true });
    expect(code).toBe(1);
  });

  it('exits 1 when the hook throws, and says why', async () => {
    const { code, output } = await serveThenStop({ HOOK: 'throw' });
    expect(code).toBe(1);
    expect(output).toContain('the hook failed');
  });
});
