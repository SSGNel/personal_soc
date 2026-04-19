const { spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const processes = [];

function spawnProcess(name, command, args, cwd) {
  console.log(`Starting ${name}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
  });

  processes.push(child);

  child.on('exit', (code, signal) => {
    console.log(`${name} exited with code ${code} signal ${signal}`);
    process.exit(code || (signal ? 1 : 0));
  });

  child.on('error', (err) => {
    console.error(`${name} failed to start:`, err);
    process.exit(1);
  });
}

function shutdown() {
  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

spawnProcess('dev-backend', 'cargo', ['run', '--manifest-path', 'apps/tauri-shell/src-tauri/Cargo.toml', '--bin', 'dev_backend'], repoRoot);
spawnProcess('frontend', 'pnpm', ['--filter', 'desktop-ui', 'dev'], repoRoot);
