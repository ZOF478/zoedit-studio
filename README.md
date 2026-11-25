# Zoedit Studio

**Zoedit Studio — AI-Directed Motion Graphics Studio**
**Zoedit Studio — استوديو الموشن جرافيك بمساعدة الذكاء الاصطناعي**

Zoedit Studio turns an idea or script into an animated, rendered video: AI-written scene code, voiceover, synced captions, and platform-aware framing. It is not a template carousel. Every scene is custom code, so the visual language can change with the story instead of repeating one look.

Live app: **https://studio.zoedit.com** · Source: **https://github.com/ZOF478/zoedit-studio**

## The Story Behind Zoedit Studio

Built by a freelance video editor ([zoedit.com](https://zoedit.com)) facing two real constraints: working on a low-spec computer where heavy motion tools slow everything down, and keeping up with the speed of the AI era. Instead of waiting to be replaced by generic AI tools, I engineered my own AI-directed motion system — combining the best Remotion primitives, custom skills, and smart framing to produce studio-grade videos at minimal cost. Originally built for my own client work, now shared open-source with creators and editors everywhere.

Explore the live studio at **[studio.zoedit.com](https://studio.zoedit.com)** and the editor's work at **[zoedit.com](https://zoedit.com)**.

## Highlights

- **True creative variety** — AI writes real React/Remotion scene code instead of filling fixed templates.
- **2.5D depth and clean B-Roll modes** — cinematic parallax, layered depth, or crisp supporting footage.
- **TikTok / Reels / Shorts ready** — safe-zone preview and automatic framing for vertical, square, and landscape output.
- **ElevenLabs TTS** — natural voiceover with word-level and karaoke-style captions.
- **Automatic WCAG contrast** — text palettes are checked and corrected for readable contrast.
- **Smart port CLI** — one command starts the dashboard, finds free ports, and opens the browser when a display is available.

## Architecture & Cost-Efficiency Philosophy

Zoedit Studio was engineered by curating and combining the best motion-design primitives, Remotion skill recipes, safe-zone framing, and smart prompt pipelines. The goal is studio-grade, custom-coded video at the lowest possible API cost — without rigid templates.

- **React dashboard** — a fast, bilingual control surface for direction, audio, colors, captions, renders, and usage.
- **Remotion renderer** — every scene is real React/Remotion code, rendered locally with zero per-frame platform cost.
- **OpenCode scene agent** — an autonomous scene-coding agent plans pacing, splits scenes, and writes bespoke motion code.
- **ElevenLabs audio** — realistic voiceover and sound design, with synced captions.
- **Smart prompt pipeline** — one master prompt becomes a scene breakdown, visual language, and render-ready composition.
- **Safe-zone by default** — captions and key content stay clear of TikTok, Reels, and Shorts interface overlays.
- **Cost-aware choices** — free or ultra-low-cost LLM providers, local rendering, and quick tweaks that reuse the existing voiceover instead of regenerating it.

## Credits

Zoedit Studio is built with care on:

- **[React](https://react.dev)** — interactive studio interface.
- **[Remotion](https://www.remotion.dev)** — programmatic video rendering.
- **[OpenCode](https://opencode.ai)** — autonomous scene-coding agent.
- **[ElevenLabs](https://elevenlabs.io)** — voiceover and sound design.

## Prerequisites

- **Node.js v20+** — use `20.19+`, `22.13+`, or `24+`.
- **npm** — included with Node.js.
- **FFmpeg** — required for video rendering and audio muxing.

Verify everything in one command:

```bash
node -v && ffmpeg -version
```

FFmpeg install examples: `brew install ffmpeg` (macOS), `sudo apt install ffmpeg` (Debian/Ubuntu), `winget install Gyan.FFmpeg` (Windows).

## Installation & Quick Start

### Step 1 — Clone & install globally

```bash
git clone https://github.com/ZOF478/zoedit-studio.git zoedit-studio
cd zoedit-studio
npm install -g .
```

`npm install -g .` registers the `zoedit-studio` command in the global PATH on Windows, macOS, and Linux. Its `postinstall` step automatically installs the dashboard dependencies and verifies the global command, so the first launch works immediately. If the global npm prefix is not writable, run `npm run setup`; it falls back to a user-local launcher under `~/.local/bin` (or `~/bin`). For development from a clone, `npm link` links the same command without reinstalling.

### Step 2 — Launch Zoedit Studio (choose your setup)

#### Option A: Local computer (Windows / macOS / Linux)

```bash
zoedit-studio
```

Run it from any folder. The CLI resolves the project, `.env`, dashboard, and Remotion assets relative to the package installation directory. It binds only to `127.0.0.1`, starts the dashboard at `http://localhost:4789`, and opens your browser automatically once `/api/health` is ready. Closing the terminal cleanly stops the dashboard and all background Remotion processes.

#### Option B: Remote VPS / server (secure SSH tunnel)

`zoedit-studio` stays bound to `127.0.0.1` by design, so the dashboard is never exposed directly to the internet. Access it through an encrypted SSH tunnel.

1. **From your local computer terminal**, open the tunnel:

   ```bash
   ssh -L 4789:127.0.0.1:4789 -L 3333:127.0.0.1:3333 user@your-server-ip
   ```

2. **Inside that SSH session**, run `zoedit-studio` (installed once in Step 1):

   ```bash
   zoedit-studio
   ```

3. **Open `http://localhost:4789` in your local browser.** The CLI prints the exact tunnel command for your server, including the detected IP and both ports.

### CLI options & troubleshooting

| Flag | Default | Description |
| --- | --- | --- |
| `--port <number>` | `4789` | Dashboard port. If busy, the CLI scans `4789`–`4809` for the first free port. |
| `--no-open` | off | Do not open a browser. Useful for VPS, containers, and headless machines. |
| `--open` | off | Force-open the browser even when an SSH session is detected. |
| `--help`, `-h` | — | Print usage, flags, and examples. |
| `--version`, `-v` | — | Print the installed version. |

The CLI reuses an already-running Zoedit Studio instance and automatically reclaims stale Zoedit Studio listeners. Remotion Studio uses the first free port in `3333`–`3353`. The dashboard is served at `/`; open `/studio/` to launch Remotion Studio.

If a port still looks stuck, reclaim it manually:

```bash
# macOS / Linux
lsof -ti tcp:4789 | xargs kill -9
# or
fuser -k 4789/tcp
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 4789 |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### Provider keys

Configure your provider keys in either of two ways:

1. **Dashboard UI (recommended)** — open the **API Settings Drawer** in the dashboard, paste your keys, and click **Save & Sync**. Keys are saved locally in `~/.zoedit-studio/settings.json`.
2. **Environment files** — copy the example files and fill in your keys:

```bash
cp .env.example .env
cp dashboard/.env.example dashboard/.env
```

Then replace `your_api_key_here` with your own keys. Real `.env` files are git-ignored. Keys entered in the Dashboard UI are stored locally in `~/.zoedit-studio/settings.json` and take precedence over `.env` values.

## Supported AI & Voice Providers (API Setup)

Every provider is optional and independent. Open the dashboard, choose **API & Keys**, paste the key, and click **Save & Sync**. The same guide is available from the footer under **API setup guide**.

| Provider | Purpose | Get a key |
| --- | --- | --- |
| OpenCode Free Models | Free scene-writing models (via OpenCode) | <https://opencode.ai> |
| DeepSeek | Low-cost structured script generation | <https://platform.deepseek.com/api_keys> |
| ElevenLabs | Voiceover, sound effects, and V4 voices | <https://elevenlabs.io/app/developers/api-keys> |
| OpenRouter | Access to hundreds of models with one key | <https://openrouter.ai/keys> |
| Kie.ai | OpenAI-compatible chat completions | <https://kie.ai/api-key> |
| Custom provider | Any OpenAI-compatible endpoint (Groq, Together, Ollama, vLLM) | Your own endpoint |

> **Disclaimer:** **OpenCode Free Models** are provided by **OpenCode and its upstream partners** — they are **not owned or hosted by Zoedit Studio**. They are subject to third-party availability, rate limits, and may change at any time, without any guarantee from Zoedit Studio.

### 1. OpenCode Free Models

OpenCode free models are provided by **OpenCode and its upstream partners** — they are **not hosted or owned by Zoedit Studio**. They may have rate limits or change availability at any time. No Zoedit Studio account is required.

OpenCode CLI is **already bundled and installed automatically** with the global `npm install -g .` step (or `npm run setup`) — there is no separate manual install. Zoedit Studio prepends its bundled `node_modules/.bin` to `PATH`, so the `opencode` binary is always resolved automatically. Just sign in to enable the free models:

```bash
opencode auth login
```

Then select **OpenCode Free Models** in Zoedit Studio. Website: <https://opencode.ai>.

### 2. DeepSeek

1. Sign up at <https://platform.deepseek.com/api_keys>.
2. Create an API key (`sk-...`).
3. Top up a small balance — DeepSeek is ultra-low cost.
4. Paste the key into Zoedit Studio under **API & Keys**.

### 3. ElevenLabs

1. Open <https://elevenlabs.io/app/developers/api-keys>.
2. Generate an API key (`sk_...`).
3. Grant the **Text to Speech Access**, **Models Access**, **User Access**, and **History Read** permissions. These permissions let Zoedit Studio's built-in usage and history viewer display your remaining quota and past generations.
4. Paste the key into Zoedit Studio under **API & Keys**.

### 4. OpenRouter

1. Open <https://openrouter.ai/keys>.
2. Generate a key (`sk-or-v1-...`).
3. Optionally add credit, or use the `:free` model tiers.
4. Paste the key into Zoedit Studio under **API & Keys**.

### 5. Kie.ai

1. Open <https://kie.ai/api-key>.
2. Create an API key for OpenAI-compatible chat completions.
3. Paste the key into Zoedit Studio under **API & Keys**.

### 6. Custom Provider

Connect any OpenAI-compatible endpoint — Groq, Together, Ollama, self-hosted vLLM, or your own gateway:

1. Enter a provider name under **API & Keys**.
2. Enter the full **Base URL** ending in `/v1` (for example `https://api.example.com/v1`).
3. Add the API key if your endpoint requires one.
4. Type or select the model ID.

## Why ElevenLabs V4?

An honest founder note: ElevenLabs was selected after extensive real-world production experience because it delivers unmatched vocal realism — especially the **V4** model — at a fair price. The codebase stays fully open, so you can add other TTS providers later or customize your own copy freely.

## Security & Key Privacy

Zoedit Studio binds to `127.0.0.1` and is local-only by design. The server validates the `Host` header and checks `Origin`/`Referer` on state-changing requests to block DNS rebinding and cross-site request forgery. For remote access, use the SSH tunnel workflow above instead of exposing the port directly.

API keys are stored strictly locally in `~/.zoedit-studio/settings.json` with owner-only `0600` permissions, inside a `0700` state directory. They are masked in API responses, never included in client bundles, and redacted from server logs. Usage and generated content are your responsibility.

AI-generated scene code is validated before rendering: imports are restricted to the approved visual/motion/icon/chart/audio libraries, and dangerous Node/system APIs, dynamic imports, network fetch APIs, `process.env`, `eval`, `new Function`, global objects, and raw HTML injection are rejected. File-serving endpoints resolve paths inside their designated directories only.

## Headless VPS / PM2

Use `--no-open` on servers without a desktop session, then connect through the SSH tunnel shown above:

```bash
npm install -g pm2
pm2 start ./bin/zoedit-studio.mjs --name zoedit-studio -- --no-open
pm2 save
pm2 startup
```

The dashboard still binds to `127.0.0.1`; it is not exposed publicly.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Dashboard port. Normally set by the CLI. |
| `HOST` | Dashboard bind address. Defaults to `127.0.0.1`. |
| `REMOTION_STUDIO_PORT` | Embedded Remotion Studio preview port. |
| `OPENROUTER_API_KEY` | OpenRouter script-generation models. |
| `DEEPSEEK_API_KEY` | Direct DeepSeek API key. |
| `KIEAI_API_KEY` | Kie.ai OpenAI-compatible chat completions. |
| `ELEVENLABS_API_KEY` | ElevenLabs voices, models, and text-to-speech. |
| `GEMINI_API_KEY` | Optional Gemini fallback for script generation. |
| `APP_URL` | Public URL of the deployed app. |

Keys entered in the dashboard take precedence and are persisted locally in `~/.zoedit-studio/settings.json`.

## Project Layout

```text
zoedit-studio/
├── bin/zoedit-studio.mjs       Smart CLI launcher
├── scripts/                Setup, install, and maintenance scripts
├── dashboard/              Express + Vite studio UI and API
├── src/                    Remotion composition and generated scenes
├── public/                 SFX and generated audio (audio is git-ignored)
├── out/                    Rendered videos and caches (git-ignored)
└── build/                  Remotion bundle output (git-ignored)
```

## Changelog

### v1.2.0

- **Zero-scroll desktop NLE layout** — compact toolbar, draggable split panels, unified responsive preview stage, pinned tools tabs, and a resizable scene/audio timeline.
- **Full local workspace persistence** — duration, aspect ratio, FPS, languages, voiceover/captions, SFX, display modes, palette, watermark, and AI provider/model now survive hard reloads with legacy-storage migration.
- **Full-library context-aware SFX** — all 18 local SFX assets are wired to scene code and cue generation with no fixed cue-count cap, plus a live `Test Volume` preview that matches the selected gain.
- **Dark Remotion Studio loading** — dark Chromium/Studio mode, a dark launcher shell, and a sleek loading overlay in the Live Preview while Studio initializes.
- **Security hardening** — owner-only key/state permissions, secret redaction in logs, stricter generated-scene sandboxing, path-confinement checks, security headers, and preserved loopback/Origin/Host protections.

## Development Checks

```bash
npm run lint
npm run build                    # root Remotion bundle
npm --prefix dashboard run build # dashboard production build
npx tsc --noEmit                 # root TypeScript check
```

## License

- **Zoedit Studio — MIT License.** Zoedit Studio is free and open-source software provided “as is”. Anyone can inspect, modify, and self-host it. See [LICENSE](./LICENSE).
- **Remotion License Notice.** **Remotion is free for individuals and for companies or teams of up to 3 people.** Organizations with **4 or more people** require a commercial Remotion license. Review <https://www.remotion.dev/license> before shipping commercially.
- **Third-Party Providers & Models.** OpenCode free models, DeepSeek, OpenRouter, Kie.ai, and ElevenLabs are independent third-party services governed by their own terms, pricing, and availability. Zoedit Studio does not own or guarantee third-party free models.
- **Local Key Privacy & User Responsibility.** API keys are stored strictly locally in `~/.zoedit-studio/settings.json` and never sent to Zoedit Studio servers. Users are responsible for their own API usage and generated content.

Built with care by the founder of **[zoedit.com](https://zoedit.com)** · **[studio.zoedit.com](https://studio.zoedit.com)**.
