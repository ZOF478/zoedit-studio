#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'zoedit-studio.mjs');
const DASHBOARD_DIR = path.join(ROOT, 'dashboard');
const IS_WINDOWS = process.platform === 'win32';

function log(message) {
  console.log(`zoedit-studio: ${message}`);
}

function warn(message) {
  console.warn(`zoedit-studio: ${message}`);
}

function runNpm(args, capture = false) {
  const options = {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  };
  if (process.env.npm_execpath) {
    return spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
      ...options,
      shell: false,
    });
  }
  return spawnSync(IS_WINDOWS ? 'npm.cmd' : 'npm', args, {
    ...options,
    shell: IS_WINDOWS,
  });
}

function ensureExecutable() {
  if (IS_WINDOWS) return;
  try {
    fs.chmodSync(BIN, 0o755);
  } catch {
    return;
  }
}

function dashboardDependenciesReady() {
  return ['express', 'tsx', 'vite', 'react', 'remotion'].every((name) =>
    fs.existsSync(path.join(DASHBOARD_DIR, 'node_modules', name)),
  );
}

function installDashboardDependencies() {
  if (process.env.ZOEDIT_SKIP_DASHBOARD_INSTALL === '1') return;
  if (!fs.existsSync(path.join(DASHBOARD_DIR, 'package.json'))) return;
  if (dashboardDependenciesReady()) {
    log('dashboard dependencies are ready.');
    return;
  }

  log('installing dashboard dependencies (one-time setup)...');
  const result = runNpm([
    'install',
    '--prefix',
    DASHBOARD_DIR,
    '--legacy-peer-deps',
    '--no-audit',
    '--no-fund',
    '--loglevel=error',
  ]);

  if (result.error) {
    warn(`could not install dashboard dependencies automatically (${result.error.message}).`);
    warn(`Run: npm --prefix "${DASHBOARD_DIR}" install`);
    return;
  }
  if (result.status !== 0) {
    warn('dashboard dependency installation did not finish successfully.');
    warn(`Run: npm --prefix "${DASHBOARD_DIR}" install`);
    return;
  }
  log('dashboard dependencies installed.');
}

function normalizePathEntry(entry) {
  const resolved = path.resolve(entry);
  return IS_WINDOWS ? resolved.toLowerCase() : resolved;
}

function isOnPath(dir) {
  const target = normalizePathEntry(dir);
  return (process.env.PATH || '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => normalizePathEntry(entry) === target);
}

function readGlobalPrefix() {
  if (process.env.npm_config_prefix) return process.env.npm_config_prefix;
  const result = runNpm(['prefix', '-g'], true);
  if (result.status === 0 && result.stdout) return result.stdout.trim();
  return '';
}

function writePosixLauncher(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const binPath = path.join(dir, 'zoedit-studio');
  fs.writeFileSync(binPath, `#!/bin/sh\nexec node ${JSON.stringify(BIN)} "$@"\n`, {
    mode: 0o755,
  });
  try {
    fs.chmodSync(binPath, 0o755);
  } catch {
    return binPath;
  }
  return binPath;
}

function linkIntoPath(globalBinDir) {
  if (isOnPath(globalBinDir)) return true;
  if (IS_WINDOWS) return false;

  const candidates = [
    path.join(os.homedir(), '.local', 'bin'),
    path.join(os.homedir(), 'bin'),
  ];
  const targetDir = candidates.find((candidate) => isOnPath(candidate));
  if (!targetDir) return false;

  const binPath = writePosixLauncher(targetDir);
  log(`linked ${binPath} so zoedit-studio is available from any directory.`);
  return true;
}

function verifyGlobalCommand() {
  if (process.env.npm_config_global !== 'true') return;
  const prefix = readGlobalPrefix();
  if (!prefix) return;
  const globalBinDir = IS_WINDOWS ? prefix : path.join(prefix, 'bin');
  if (linkIntoPath(globalBinDir)) return;

  warn(`npm's global bin directory is not on your PATH: ${globalBinDir}`);
  if (IS_WINDOWS) {
    warn('Add it to PATH, or run: npm config get prefix');
  } else {
    warn(`Add this to your shell profile: export PATH="${globalBinDir}:$PATH"`);
  }
}

function main() {
  ensureExecutable();
  installDashboardDependencies();
  verifyGlobalCommand();
}

try {
  main();
} catch (error) {
  warn(`postinstall check skipped: ${error instanceof Error ? error.message : String(error)}`);
}
