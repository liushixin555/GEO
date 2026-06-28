const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

const envFiles = ['.env', '.env.local', '.env.development.local'];

for (const [index, file] of envFiles.entries()) {
  const envPath = path.resolve(process.cwd(), file);
  dotenv.config({ path: envPath, override: index > 0 });
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-local-env.cjs <command> [...args]');
  process.exit(1);
}

const quoteArg = (value) => {
  if (!/[\s"&|<>^]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
};

const commandLine = [command, ...args.map(quoteArg)].join(' ');

const child = spawn(commandLine, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
