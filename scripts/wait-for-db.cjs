const net = require('net');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5432;
const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_INTERVAL_MS = 1000;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDatabaseTarget() {
  const fromUrl = process.env.DATABASE_URL;
  if (fromUrl) {
    try {
      const url = new URL(fromUrl);
      return {
        host: url.hostname || DEFAULT_HOST,
        port: parsePositiveInt(url.port, DEFAULT_PORT),
      };
    } catch {
      // Fall back to DB_HOST/DB_PORT below. Config validation will catch bad DATABASE_URL later.
    }
  }

  return {
    host: process.env.DB_HOST || DEFAULT_HOST,
    port: parsePositiveInt(process.env.DB_PORT, DEFAULT_PORT),
  };
}

function canConnect(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function main() {
  const { host, port } = resolveDatabaseTarget();
  const timeoutMs = parsePositiveInt(process.env.DB_WAIT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const intervalMs = parsePositiveInt(process.env.DB_WAIT_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const deadline = Date.now() + timeoutMs;

  process.stdout.write(`Waiting for PostgreSQL at ${host}:${port}...\n`);

  while (Date.now() <= deadline) {
    if (await canConnect(host, port, Math.min(intervalMs, 1000))) {
      process.stdout.write(`PostgreSQL is ready at ${host}:${port}.\n`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  process.stderr.write(
    [
      `PostgreSQL is not ready at ${host}:${port}.`,
      'Start PostgreSQL first, then run the dev server again.',
      'On this project you can use startup script "启动项目.bat" or start the local PostgreSQL service.',
    ].join('\n') + '\n'
  );
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`PostgreSQL readiness check failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
