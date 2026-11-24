#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const DASHBOARD_DIR = path.join(PROJECT_ROOT, 'dashboard');
const SERVER_ENTRY = path.join(DASHBOARD_DIR, 'server.ts');
const LOCAL_BIN_DIR = path.join(PROJECT_ROOT, 'node_modules', '.bin');
const STATE_DIR = path.join(os.homedir(), '.zof-studio');
const RUNTIME_STATE_FILE = path.join(STATE_DIR, 'runtime.json');

process.env.PATH = [LOCAL_BIN_DIR, process.env.PATH].filter(Boolean).join(path.delimiter);
process.chdir(PROJECT_ROOT);

const DEFAULT_PORT = 4789;
const DEFAULT_HOST = '127.0.0.1';
const PORT_SCAN_START = 4789;
const PORT_SCAN_END = 4809;
const REMOTION_PORT_START = 3333;
const REMOTION_PORT_END = 3353;
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 400;
const SSH_ENV_KEYS = ['SSH_CONNECTION', 'SSH_CLIENT', 'SSH_TTY'];

let serverProcess = null;
let shuttingDown = false;

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function readRuntimeState() {
  try {
    const state = JSON.parse(fs.readFileSync(RUNTIME_STATE_FILE, 'utf8'));
    if (state && typeof state === 'object') return state;
  } catch {
    // Missing or corrupt state is treated as no state.
  }
  return null;
}

function writeRuntimeState(state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const tempPath = `${RUNTIME_STATE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, RUNTIME_STATE_FILE);
  } catch {
    // Runtime state is best-effort; it must never block startup.
  }
}

function clearRuntimeState(serverPid) {
  const state = readRuntimeState();
  if (serverPid && state && state.serverPid !== serverPid) return;
  try {
    fs.rmSync(RUNTIME_STATE_FILE, { force: true });
  } catch {
    // Ignore cleanup failures.
  }
}

function isZombiePid(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const state = stat.slice(stat.lastIndexOf(')') + 2).charAt(0);
    return state === 'Z' || state === 'X' || state === 'x';
  } catch {
    return false;
  }
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (!error || error.code !== 'EPERM') return false;
  }
  return !isZombiePid(pid);
}

function printHelp() {
  const version = readVersion();
  console.log(`zofstudio ${version}

AI-directed motion graphics studio built on React and Remotion.

Usage:
  zofstudio [options]

Options:
  --port <number>   Dashboard port (default: ${DEFAULT_PORT})
  --host <addr>     Loopback bind address (default: ${DEFAULT_HOST})
  --open            Force-open the browser, even over SSH/port-forwarding
  --no-open         Do not open the browser (VPS/headless friendly)
  --version, -v     Print the version
  --help, -h        Print this help

Examples:
  zofstudio
  zofstudio --port 4800
  zofstudio --open
  zofstudio --no-open
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
        if (value !== '127.0.0.1' && value !== 'localhost') {
          fail('only loopback hosts are supported; use an SSH tunnel for remote access');
        }
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
      signal: AbortSignal.timeout(1200),
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

async function fetchDashboardRoute(port, host) {
  try {
    const response = await fetch(`http://${probeHost(host)}:${port}/api/project`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return Boolean(payload && payload.ok === true && typeof payload.projectFile === 'string');
  } catch {
    return false;
  }
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 4000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      resolve(error && !stdout ? '' : String(stdout || ''));
    });
  });
}

async function findPidsOnPort(port) {
  const collectors = [
    async () => runCommand('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']),
    async () => {
      const output = await runCommand('ss', ['-ltnpH', `sport = :${port}`]);
      return Array.from(output.matchAll(/pid=(\d+)/g), (match) => match[1]).join('\n');
    },
    async () => {
      const output = await runCommand('fuser', ['-n', 'tcp', String(port)]);
      return output.replace(/[^\d\s]/g, ' ');
    },
  ];

  for (const collect of collectors) {
    let output = '';
    try {
      output = await collect();
    } catch {
      continue;
    }
    const pids = output
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((pid) => Number.isInteger(pid) && pid > 1 && pid !== process.pid);
    if (pids.length > 0) return Array.from(new Set(pids));
  }
  return [];
}

function isZofServerPid(pid) {
  try {
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ');
    if (cmdline.includes('server.ts') && cmdline.includes('zof-studio')) return true;
    try {
      const cwd = fs.realpathSync(`/proc/${pid}/cwd`);
      return cmdline.includes('server.ts') && cwd.includes('zof-studio');
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

async function inspectServerPort(port, host) {
  if (!(await isPortOpen(port, probeHost(host), 900))) {
    if (await isPortFree(port, host)) return { status: 'free' };
    return { status: 'busy' };
  }

  const health = await fetchHealth(port, host);
  if (!health) {
    const pids = await findPidsOnPort(port);
    if (pids.some(isZofServerPid)) return { status: 'stale', pids };
    return { status: 'busy' };
  }

  if (!(await fetchDashboardRoute(port, host))) {
    return { status: 'stale', health };
  }

  const state = readRuntimeState();
  if (state && state.port === port && state.serverPid) {
    if (!isProcessRunning(state.launcherPid)) {
      return { status: 'stale', health, state };
    }
  }

  return { status: 'running', health };
}

async function reclaimStaleServer(port, host, state) {
  const pids = await findPidsOnPort(port);
  const remotionPort = state && Number.isInteger(state.remotionPort) ? state.remotionPort : null;
  const remotionPids = remotionPort ? await findPidsOnPort(remotionPort) : [];
  const targets = Array.from(new Set([...pids, ...remotionPids])).filter(
    (pid) => pid !== process.pid,
  );
  if (targets.length === 0) return false;

  for (const signal of ['SIGTERM', 'SIGKILL']) {
    for (const pid of targets) {
      try {
        process.kill(pid, signal);
      } catch {
        // Process already exited.
      }
    }
    const attempts = signal === 'SIGTERM' ? 10 : 5;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!(await isPortOpen(port, probeHost(host), 300))) {
        clearRuntimeState();
        return true;
      }
      await delay(200);
    }
  }

  if (!(await isPortOpen(port, probeHost(host), 500))) {
    clearRuntimeState();
    return true;
  }
  return false;
}

async function resolveServerPort(requestedPort, host) {
  const direct = await inspectServerPort(requestedPort, host);
  if (direct.status === 'running') return { port: requestedPort, existing: true };
  if (direct.status === 'free') return { port: requestedPort, existing: false };
  if (direct.status === 'stale') {
    console.log(`zofstudio: reclaiming stale dashboard listener on port ${requestedPort}...`);
    if (await reclaimStaleServer(requestedPort, host, direct.state)) {
      return { port: requestedPort, existing: false };
    }
  }

  for (let port = PORT_SCAN_START; port <= PORT_SCAN_END; port += 1) {
    if (port === requestedPort) continue;
    const inspection = await inspectServerPort(port, host);
    if (inspection.status === 'running') return { port, existing: true };
    if (inspection.status === 'stale') {
      if (await reclaimStaleServer(port, host, inspection.state)) {
        return { port, existing: false };
      }
      continue;
    }
    if (inspection.status === 'free') return { port, existing: false };
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
      ZOF_LAUNCHER_PID: String(process.pid),
    },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell,
    windowsHide: true,
  });
}

function isRemoteSession() {
  return SSH_ENV_KEYS.some((key) => Boolean(process.env[key]));
}

function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

function isPrivateIPv4(address) {
  if (/^10\./.test(address) || /^192\.168\./.test(address) || /^127\./.test(address)) return true;
  const match = address.match(/^172\.(\d+)\./);
  if (match) {
    const second = Number(match[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function listIPv4Addresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (!entry || entry.internal) continue;
      if (entry.family !== 'IPv4' && entry.family !== 4) continue;
      if (entry.address.startsWith('169.254.')) continue;
      addresses.push(entry.address);
    }
  }
  return addresses;
}

async function detectPublicIPv4() {
  const endpoints = ['https://api.ipify.org?format=json', 'https://ifconfig.me/ip'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(1500),
        headers: { 'User-Agent': 'zofstudio' },
      });
      if (!response.ok) continue;
      const text = (await response.text()).trim();
      const candidate = text.startsWith('{') ? JSON.parse(text).ip : text;
      if (typeof candidate === 'string' && net.isIP(candidate) === 4) return candidate;
    } catch {
      // Try the next endpoint.
    }
  }
  return null;
}

async function detectServerIPv4() {
  const addresses = listIPv4Addresses();
  const publicAddress = addresses.find((address) => !isPrivateIPv4(address));
  if (publicAddress) return publicAddress;
  const fetched = await detectPublicIPv4();
  if (fetched) return fetched;
  if (addresses.length > 0) return addresses[0];
  return '127.0.0.1';
}

function getRemoteUser() {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER || process.env.USERNAME || 'user';
  }
}

function printHeader() {
  console.log('');
  console.log(`  Zof Studio ${readVersion()}`);
  console.log('  ----------------------------------------');
}

function printLocalBanner(port, remotionPort, host) {
  const display = isLoopbackHost(host) ? 'localhost' : host;
  const scope = isLoopbackHost(host) ? ' (local only)' : '';
  printHeader();
  console.log(`  Dashboard   http://${display}:${port}`);
  console.log(`  Remotion    http://${display}:${remotionPort}`);
  console.log(`  Binding     ${host}${scope}`);
  console.log('');
}

async function printRemoteBanner(port, remotionPort) {
  const ip = await detectServerIPv4();
  const target = ip === '127.0.0.1' ? os.hostname() : ip;
  const user = getRemoteUser();
  printHeader();
  console.log(`  Dashboard   http://127.0.0.1:${port} (server)`);
  console.log(`  Remotion    http://127.0.0.1:${remotionPort} (server)`);
  console.log('  Binding     127.0.0.1 (local only)');
  console.log(`  Server IP   ${ip}`);
  console.log('');
  console.log('  SSH / headless session detected - no browser was opened.');
  console.log('');
  console.log('  Recommended: forward the ports over SSH, then open the dashboard locally:');
  console.log('');
  console.log(
    `    ssh -L ${port}:127.0.0.1:${port} -L ${remotionPort}:127.0.0.1:${remotionPort} ${user}@${target}`,
  );
  console.log('');
  console.log(`    Then open http://localhost:${port} on your computer.`);
  console.log('');
}

async function printBanner(options, port, remotionPort, existing) {
  if (isRemoteSession()) {
    await printRemoteBanner(port, remotionPort);
  } else {
    printLocalBanner(port, remotionPort, options.host);
  }
  if (existing) console.log('  Reusing the existing Zof Studio instance.');
  console.log('');
}

function readRemotionPortForBanner(port) {
  const state = readRuntimeState();
  if (state && state.port === port && Number.isInteger(state.remotionPort)) {
    return state.remotionPort;
  }
  return REMOTION_PORT_START;
}

function shouldOpenBrowser(options) {
  if (options.forceOpen) return true;
  if (!options.open) return false;
  return !isRemoteSession();
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
    if (process.platform !== 'win32' && serverProcess.pid) {
      process.kill(-serverProcess.pid, signal);
    } else {
      serverProcess.kill(signal);
    }
  } catch {
    // The process may already be gone.
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
    clearRuntimeState(serverProcess?.pid);
    process.exit(code);
    return;
  }
  stopChild('SIGTERM');
  const forceTimer = setTimeout(() => {
    stopChild('SIGKILL');
    clearRuntimeState(serverProcess.pid);
    process.exit(code);
  }, 3000);
  forceTimer.unref();
  serverProcess.once('exit', () => {
    clearRuntimeState(serverProcess.pid);
    process.exit(code);
  });
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

  process.once('SIGHUP', () => shutdown(129));
  process.once('SIGINT', () => shutdown(130));
  process.once('SIGTERM', () => shutdown(143));

  if (process.stdin.isTTY) {
    process.stdin.on('end', () => shutdown(0));
    process.stdin.on('close', () => shutdown(0));
    process.stdin.resume();
  }

  const resolution = await resolveServerPort(options.port, options.host);
  const url = `http://localhost:${resolution.port}`;

  if (resolution.existing) {
    const remotionPort = readRemotionPortForBanner(resolution.port);
    await printBanner(options, resolution.port, remotionPort, true);
    if (shouldOpenBrowser(options)) openBrowser(url);
    return;
  }

  const remotionPort = await resolveRemotionPort(options.host);
  console.log(`Starting Zof Studio on port ${resolution.port}...`);

  serverProcess = spawnServer(resolution.port, options.host, remotionPort);
  writeRuntimeState({
    launcherPid: process.pid,
    serverPid: serverProcess.pid ?? null,
    port: resolution.port,
    remotionPort,
    host: options.host,
    startedAt: new Date().toISOString(),
  });
  serverProcess.once('error', (error) => {
    clearRuntimeState(serverProcess?.pid);
    console.error(`zofstudio: failed to start dashboard server: ${error.message}`);
    process.exit(1);
  });
  serverProcess.once('exit', (code, signal) => {
    clearRuntimeState(serverProcess?.pid);
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

  await printBanner(options, resolution.port, remotionPort, false);
  if (shouldOpenBrowser(options)) openBrowser(url);
}

main().catch((error) => {
  console.error(`zofstudio: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
