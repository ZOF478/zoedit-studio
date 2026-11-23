#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const DASHBOARD_DIR = path.join(PROJECT_ROOT, 'dashboard');
const SERVER_ENTRY = path.join(DASHBOARD_DIR, 'server.ts');

const DEFAULT_PORT = 4789;
const DEFAULT_HOST = '127.0.0.1';
const PORT_SCAN_START = 4789;
const PORT_SCAN_END = 4809;
const REMOTION_PORT_START = 3333;
const REMOTION_PORT_END = 3353;
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 400;

let serverProcess = null;
let shuttingDown = false;

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printHelp() {
  const version = readVersion();
  console.log(`zofstudio ${version}

AI-directed motion graphics studio built on React and Remotion.

Usage:
  zofstudio [options]

Options:
  --port <number>   Dashboard port (default: ${DEFAULT_PORT})
  --host <addr>     Bind address (default: ${DEFAULT_HOST}, local-only)
  --open            Force-open the browser, even over SSH/port-forwarding
  --no-open         Do not open the browser (VPS/headless friendly)
  --version, -v     Print the version
  --help, -h        Print this help

Examples:
  zofstudio
  zofstudio --port 4800
  zofstudio --open
  zofstudio --host 0.0.0.0 --no-open
`);
}

function fail(message) {
  console.error(`zofstudio: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    port: DEFAULT_PORT,
    host: DEFAULT_HOST,
    open: true,
    forceOpen: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const [flag, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, undefined];

    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      if (index >= argv.length) fail(`missing value for ${flag}`);
      return argv[index];
    };

    switch (flag) {
      case '--port': {
        const value = takeValue();
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          fail(`invalid port: ${value}`);
        }
        options.port = port;
        break;
      }
      case '--host': {
        const value = takeValue();
        if (!value || value.startsWith('-')) fail(`invalid host: ${value}`);
        options.host = value;
        break;
      }
      case '--open':
        options.open = true;
        options.forceOpen = true;
        break;
      case '--no-open':
        options.open = false;
        options.forceOpen = false;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        fail(`unknown option: ${raw} (try --help)`);
    }
  }

  return options;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeHost(host) {
  if (host === '0.0.0.0' || host === '::' || host === '[::]') return '127.0.0.1';
  return host;
}

function isPortFree(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

function isPortOpen(port, host, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function fetchHealth(port, host) {
  try {
    const response = await fetch(`http://${probeHost(host)}:${port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const health = await response.json();
    if (health && (health.app === 'zof-studio' || health.service === 'Zof Studio API')) {
      return health;
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveServerPort(requestedPort, host) {
  if (await isPortOpen(requestedPort, probeHost(host))) {
    const health = await fetchHealth(requestedPort, host);
    if (health) return { port: requestedPort, existing: true };
  } else if (await isPortFree(requestedPort, host)) {
    return { port: requestedPort, existing: false };
  }

  for (let port = PORT_SCAN_START; port <= PORT_SCAN_END; port += 1) {
    if (port === requestedPort) continue;
    if (await isPortOpen(port, probeHost(host))) {
      if (await fetchHealth(port, host)) return { port, existing: true };
      continue;
    }
    if (await isPortFree(port, host)) return { port, existing: false };
  }

  fail(`no free port found in range ${PORT_SCAN_START}-${PORT_SCAN_END}`);
  return null;
}

async function resolveRemotionPort(host) {
  for (let port = REMOTION_PORT_START; port <= REMOTION_PORT_END; port += 1) {
    if (await isPortFree(port, host)) return port;
  }
  fail(`no free port found for Remotion Studio in range ${REMOTION_PORT_START}-${REMOTION_PORT_END}`);
  return null;
}

function resolveServerCommand() {
  const tsxCli = path.join(DASHBOARD_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (fs.existsSync(tsxCli)) {
    return { command: process.execPath, args: [tsxCli, SERVER_ENTRY], shell: false };
  }
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsx', SERVER_ENTRY],
    shell: process.platform === 'win32',
  };
}

function spawnServer(port, host, remotionPort) {
  const { command, args, shell } = resolveServerCommand();
  return spawn(command, args, {
    cwd: DASHBOARD_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: host,
      REMOTION_STUDIO_PORT: String(remotionPort),
    },
    stdio: 'inherit',
    shell,
    windowsHide: true,
  });
}

function shouldOpenBrowser(options) {
  if (options.forceOpen) return true;
  return options.open && !process.env.SSH_CONNECTION;
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true });
    child.once('error', () => {});
    child.unref();
  } catch {
    // Opening a browser is best-effort; the URL is printed regardless.
  }
}

async function waitForReady(port, host, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) return null;
    const health = await fetchHealth(port, host);
    if (health) return health;
    await delay(POLL_INTERVAL_MS);
  }
  return null;
}

function stopChild(signal) {
  if (!serverProcess) return;
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  try {
    serverProcess.kill(signal);
  } catch {
    // The process may already be gone.
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
    process.exit(code);
  }
  stopChild('SIGTERM');
  const forceTimer = setTimeout(() => {
    stopChild('SIGKILL');
    process.exit(code);
  }, 3000);
  forceTimer.unref();
  serverProcess.once('exit', () => process.exit(code));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(readVersion());
    return;
  }

  process.once('SIGINT', () => shutdown(130));
  process.once('SIGTERM', () => shutdown(143));

  const resolution = await resolveServerPort(options.port, options.host);
  const url = `http://localhost:${resolution.port}`;

  if (resolution.existing) {
    console.log(`Zof Studio is already running at ${url}`);
    if (shouldOpenBrowser(options)) openBrowser(url);
    return;
  }

  const remotionPort = await resolveRemotionPort(options.host);
  console.log(`Starting Zof Studio at ${url} (Remotion Studio port: ${remotionPort})`);

  serverProcess = spawnServer(resolution.port, options.host, remotionPort);
  serverProcess.once('error', (error) => {
    console.error(`zofstudio: failed to start dashboard server: ${error.message}`);
    process.exit(1);
  });
  serverProcess.once('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`zofstudio: dashboard server exited (${reason})`);
    process.exit(code ?? 1);
  });

  const health = await waitForReady(resolution.port, options.host, serverProcess);
  if (!health) {
    console.error('zofstudio: dashboard server did not become ready in time.');
    shutdown(1);
    return;
  }

  console.log(`Zof Studio is ready at ${url}`);
  if (shouldOpenBrowser(options)) openBrowser(url);
}

main().catch((error) => {
  console.error(`zofstudio: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
