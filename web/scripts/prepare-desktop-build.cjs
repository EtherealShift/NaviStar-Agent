const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release', 'win-unpacked');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
    windowsHide: true,
  });

  if (result.status !== 0 && result.stderr) {
    process.stdout.write(result.stderr);
  }
}

if (process.platform === 'win32') {
  run('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "Get-Process NaviStar,NaviStarBackend -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
  ]);
}

try {
  fs.rmSync(releaseDir, { recursive: true, force: true });
} catch (error) {
  console.error(`Failed to clean ${releaseDir}.`);
  console.error('Close any running NaviStar windows and retry the build.');
  throw error;
}
