import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite';
import http from 'http';
import { execSync, spawn } from 'child_process';

// ============================================================
// QMD JSON-RPC Bridge Plugin
// 1. Calls `initialize` against QMD's HTTP endpoint.
//    If QMD says "already initialized", restarts the daemon
//    and tries again (up to 3 times).
// 2. Captures the `mcp-session-id` response header.
// 3. Exposes /api/search, /api/vector-search,
//    /api/deep-search, and /api/get REST endpoints.
// ============================================================
const QMD_PORT = 8181;

function qmdBridgePlugin(): Plugin {
  let reqId = 1;
  let sessionId: string | null = null;
  let initPromise: Promise<void> | null = null;

  function post(
    body: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: string }> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: QMD_PORT,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Content-Length': Buffer.byteLength(body),
          ...extraHeaders,
        },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, data }));
      });
      req.on('error', (err) => reject(err));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('QMD request timed out'));
      });
      req.write(body);
      req.end();
    });
  }

  function parseRpc(raw: string) {
    const stripped = raw.replace(/^data:\s*/gm, '').trim();
    try { return JSON.parse(stripped || '{}'); } catch { return {}; }
  }

  function restartQmdDaemon(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Kill the running HTTP daemon on port 8181
        execSync(`pkill -f "qmd.js mcp --http --port ${QMD_PORT}"`, { stdio: 'ignore' });
      } catch { /* ok if nothing to kill */ }

      // Wait 500ms then start fresh
      setTimeout(() => {
        const nodeExec = process.execPath;
        const qmdScript = execSync('which qmd 2>/dev/null || true').toString().trim()
          || `${process.env.HOME}/.nvm/versions/node/v22.11.0/lib/node_modules/@tobilu/qmd/dist/qmd.js`;

        // Resolve the actual qmd.js path
        let qmdJs: string;
        try {
          qmdJs = execSync(`node -e "require.resolve('@tobilu/qmd/dist/qmd.js')" 2>/dev/null || true`).toString().trim();
        } catch { qmdJs = ''; }

        if (!qmdJs) {
          // Find by pattern
          try {
            qmdJs = execSync(`find "${process.env.HOME}/.nvm" -name "qmd.js" -path "*/dist/qmd.js" 2>/dev/null | head -1`).toString().trim();
          } catch { qmdJs = ''; }
        }

        if (!qmdJs) {
          console.error('[qmd-bridge] Could not locate qmd.js — please restart the QMD daemon manually');
          resolve();
          return;
        }

        console.log('[qmd-bridge] Starting QMD HTTP daemon...', qmdJs);
        const proc = spawn(nodeExec, [qmdJs, 'mcp', '--http', '--port', String(QMD_PORT)], {
          detached: true,
          stdio: 'ignore',
        });
        proc.unref();
        // Give it 1.5s to start
        setTimeout(resolve, 1500);
      }, 500);
    });
  }

  async function tryInitialize(): Promise<void> {
    const body = JSON.stringify({
      jsonrpc: '2.0', id: reqId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'qmd-search-vite-bridge', version: '1.0.0' },
        capabilities: {},
      },
    });

    const { status, headers, data } = await post(body);
    if (status >= 400) {
      const parsed = parseRpc(data);
      throw new Error(parsed?.error?.message ?? `Init HTTP ${status}: ${data.slice(0, 200)}`);
    }

    const sid = (headers['mcp-session-id'] as string | undefined);
    if (!sid) throw new Error('QMD did not return mcp-session-id header');
    sessionId = sid;
    console.log('[qmd-bridge] Session ready:', sessionId);

    // Notify initialized (QMD wants this but we ignore errors)
    const notif = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
    post(notif, { 'mcp-session-id': sid }).catch(() => { });
  }

  async function initialize(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await tryInitialize();
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already initialized') || msg.includes('Server already initialized')) {
          console.warn(`[qmd-bridge] QMD already initialized (attempt ${attempt}/3) — restarting daemon...`);
          await restartQmdDaemon();
        } else {
          throw err;
        }
      }
    }
    throw new Error('[qmd-bridge] Could not claim a fresh QMD session after 3 attempts');
  }

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    if (!initPromise) {
      initPromise = initialize().catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    await initPromise;
    return sessionId!;
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const sid = await ensureSession();
    const body = JSON.stringify({
      jsonrpc: '2.0', id: reqId++,
      method: 'tools/call',
      params: { name, arguments: args },
    });
    const { status, data } = await post(body, { 'mcp-session-id': sid });
    if (status >= 400) {
      throw new Error(parseRpc(data)?.error?.message ?? `HTTP ${status}: ${data.slice(0, 200)}`);
    }
    const parsed = parseRpc(data);
    if (parsed?.error) throw new Error(parsed.error.message ?? JSON.stringify(parsed.error));

    const result = parsed.result ?? parsed;
    if (result?.content && Array.isArray(result.content)) {
      // 1. Try to find a plain text block
      const textBlock = result.content.find((c: any) => c.type === 'text');
      if (textBlock?.text) return textBlock.text;

      // 2. Try to find a resource block (common in QMD 'get' tool)
      const resourceBlock = result.content.find((c: any) => c.type === 'resource');
      if (resourceBlock?.resource?.text) return resourceBlock.resource.text;

      // 3. Fallback to stringifying the whole content array
      return JSON.stringify(result.content);
    }
    return JSON.stringify(result);
  }

  return {
    name: 'qmd-bridge',
    configureServer(server) {
      ensureSession().catch((err) =>
        console.error('[qmd-bridge] Startup init failed:', err.message)
      );

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const q = url.searchParams.get('q') ?? '';
        const collection = url.searchParams.get('collection') || undefined;
        const file = url.searchParams.get('file') ?? '';

        let toolName: string;
        let toolArgs: Record<string, unknown>;

        switch (url.pathname) {
          case '/api/search':
            toolName = 'search';
            toolArgs = { query: q, ...(collection && { collection }), limit: 20 };
            break;
          case '/api/vector-search':
            toolName = 'vector_search';
            toolArgs = { query: q, ...(collection && { collection }), limit: 20, minScore: 0.3 };
            break;
          case '/api/deep-search':
            toolName = 'deep_search';
            toolArgs = { query: q, ...(collection && { collection }), limit: 20 };
            break;
          case '/api/get':
            toolName = 'get';
            toolArgs = { file };
            break;
          default:
            return next();
        }

        try {
          const text = await callTool(toolName, toolArgs);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[qmd-bridge] ${toolName} failed:`, msg);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: msg }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), qmdBridgePlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
})
