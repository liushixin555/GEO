const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'wait-for-db.cjs');

const result = spawnSync(process.execPath, [script], {
  cwd: root,
  env: {
    ...process.env,
    DB_HOST: '127.0.0.1',
    DB_PORT: '1',
    DB_WAIT_TIMEOUT_MS: '50',
    DB_WAIT_INTERVAL_MS: '10',
  },
  encoding: 'utf8',
});

if (result.status === 0) {
  console.error('Expected wait-for-db to fail when the database port is unavailable.');
  process.exit(1);
}

const output = `${result.stdout || ''}${result.stderr || ''}`;
if (!output.includes('PostgreSQL is not ready')) {
  console.error('Expected a clear PostgreSQL readiness message.');
  console.error(output);
  process.exit(1);
}

console.log('wait-for-db unavailable-port behavior ok');
