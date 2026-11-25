#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_TARGET = path.join(BIN_DIR, 'zoedit-studio.mjs');

function isOnPath(dir) {
  const pathEntries = (process.env.PATH || '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return pathEntries.includes(dir);
}

function warnIfOffPath(dir, binPath) {
  if (isOnPath(dir)) {
    console.log(`zoedit-studio: linked ${binPath} (no global permissions required).`);
    return;
  }
  console.warn(
    `zoedit-studio: launcher created at ${binPath}, but ${dir} is not on your PATH.\n` +
      `Add ${dir} to your PATH to run zoedit-studio from any directory.`,
  );
}

function linkPosix() {
  const candidates = [
    path.join(os.homedir(), '.local', 'bin'),
    path.join(os.homedir(), 'bin'),
  ];
  const dir = candidates.find((candidate) => fs.existsSync(candidate) && isOnPath(candidate))
    || candidates[0];
  fs.mkdirSync(dir, { recursive: true });

  const binPath = path.join(dir, 'zoedit-studio');
  fs.rmSync(binPath, { force: true });
  try {
    fs.chmodSync(CLI_TARGET, 0o755);
    fs.symlinkSync(CLI_TARGET, binPath);
  } catch {
    fs.writeFileSync(binPath, `#!/bin/sh\nexec node "${CLI_TARGET}" "$@"\n`, { mode: 0o755 });
  }
  warnIfOffPath(dir, binPath);
}

function linkWindows() {
  const npmDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : '';
  const dir = npmDir && isOnPath(npmDir)
    ? npmDir
    : path.join(os.homedir(), '.zoedit-studio', 'bin');
  fs.mkdirSync(dir, { recursive: true });
  const binPath = path.join(dir, 'zoedit-studio.cmd');
  fs.writeFileSync(binPath, `@echo off\r\nnode "${CLI_TARGET}" %*\r\n`);
  warnIfOffPath(dir, binPath);
}

function main() {
  if (!fs.existsSync(CLI_TARGET)) {
    console.warn(`zoedit-studio: launcher not found at ${CLI_TARGET}; skipping user-local link.`);
    return;
  }

  console.warn(
    'zoedit-studio: using a user-local launcher because the global `npm link` prefix is not writable.',
  );

  try {
    if (process.platform === 'win32') {
      linkWindows();
    } else {
      linkPosix();
    }
  } catch (error) {
    console.warn(
      `zoedit-studio: could not create a user-local launcher (${error instanceof Error ? error.message : String(error)}).`,
    );
    console.warn(`Run this directly instead: node "${CLI_TARGET}"`);
  }
}

main();
