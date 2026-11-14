// A server whose beforeStop the shutdown tests drive through the environment:
// HOOK is what it does (wait, hang, throw), DELAY_MS how long it waits first,
// SHUTDOWN_TIMEOUT_MS the deadline it gives, OUT where the build goes, and MARK
// the file it writes once it has run, with whether the server still answered.
// FAIL_AFTER_LISTEN leaves a rejection unhandled once it listens, as a crash.
import { writeFileSync } from 'node:fs';

const { HOOK = 'wait', DELAY_MS = '0', SHUTDOWN_TIMEOUT_MS, OUT, MARK, FAIL_AFTER_LISTEN } = process.env;

let port = null;

export default {
  type: 'server',
  views: null,
  scripts: null,
  styles: null,
  assets: null,
  partials: null,
  outputDir: OUT,
  port: 0,
  open: false,
  ...(SHUTDOWN_TIMEOUT_MS ? { shutdownTimeoutMs: Number(SHUTDOWN_TIMEOUT_MS) } : {}),

  api: [{ method: 'GET', path: '/ping', handler: (ctx) => ctx.respond.json({ ok: true }) }],

  afterListen(useContext, opts, httpServer) {
    port = httpServer.address().port;
    console.log(`LISTENING ${port}`);
    if (FAIL_AFTER_LISTEN) setTimeout(() => Promise.reject(new Error('a crash')), 50);
  },

  async beforeStop() {
    await new Promise((resolve) => setTimeout(resolve, Number(DELAY_MS)));
    if (HOOK === 'hang') await new Promise(() => {});
    if (HOOK === 'throw') throw new Error('the hook failed');
    const answered = await fetch(`http://127.0.0.1:${port}/ping`).then((res) => res.ok, () => false);
    writeFileSync(MARK, JSON.stringify({ answered }));
  },
};
