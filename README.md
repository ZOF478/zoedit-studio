# Zoedit Studio

**AI-Directed Motion Graphics Studio — v1.3.2**

**Zoedit Studio — استوديو الموشن جرافيك بمساعدة الذكاء الاصطناعي**

Zoedit Studio turns an idea, script, logo, or screenshot into a rendered short-form video: AI-written Remotion scene code, multi-provider voiceover, synced captions, uploaded visual assets, and platform-aware framing. It is not a template carousel — every scene is custom code, so the visual language changes with the story.

- Live app: **https://studio.zoedit.com**
- Source: **https://github.com/ZOF478/zoedit-studio**
- Contact: **studio@zoedit.com**
- Current version: **1.3.2** (`zoedit-studio --version`)

## The Story Behind Zoedit Studio

Built by a freelance video editor ([zoedit.com](https://zoedit.com)) facing two real constraints: working on a low-spec computer where heavy motion tools slow everything down, and keeping up with the speed of the AI era. Instead of waiting to be replaced by generic AI tools, I engineered my own AI-directed motion system — combining the best Remotion primitives, custom skills, and smart framing to produce studio-grade videos at minimal cost. Originally built for my own client work, now shared open-source with creators and editors everywhere.

## What's New in v1.3.2

- **Self-Healing Scene Generation** — a 1-attempt automatic LLM self-heal retry now repairs sanitizer and TypeScript validation errors before falling back to built-in templates.
- **Hardened Offline & Remotion Sanitizer Rules** — strict offline enforcement blocks external URLs/media, and all generation and tweak prompts now require valid `interpolate()` ranges.
- **Cumulative Fallback Alerts & Timeline Badges** — a non-blocking warning banner and amber timeline badges mark fallback scenes so a single clip never forces the whole render to be canceled.
- **Direct Clip-to-Quick-Prompt Binding** — clicking a timeline clip or fallback badge targets `Scene{N}` in **Quick prompt tweak**, re-rendering only that scene while reusing cached segments and TTS audio.
- **Two-Step Cancel Export Confirmation** — an inline confirmation step (`Are you sure?` with a 4-second auto-reset) prevents accidental cancellation of long renders.

## What's New in v1.3.1

- **Restored rich scene generation** — rebuilt the custom Remotion scene pipeline with stronger creative direction, richer scene variety, and reliable asset injection.
- **Smoother voiceover setup** — added the empty-script confirmation modal and topic-driven prompt generator for faster project starts.

## What's New in v1.3.0

- **Multi-provider voiceover engine** — key-free Edge TTS, offline open-source Piper TTS, and ElevenLabs BYOK share one catalog, one filter bar, live auditioning, and word-level synced captions.
- **Secure image and logo uploads** — drag-and-drop PNG, JPG, WEBP, and sanitized SVG into the prompt composer, tag them as **Logo** or **Screenshot**, add notes, and let AI stage them with cinematic 2.5D motion.
- **Zero-scroll 100vh NLE workspace** — resizable multi-pane editor, ResizeObserver-contained Live Preview and Live Sandbox, adaptive toolbars, dark Remotion Studio splash, and full local persistence.
- **Full-library smart SFX** — context-aware audio cues from the complete local SFX library, plus an in-app SFX volume tester.
- **Deeper security hardening** — strict `127.0.0.1` binding, owner-only `0700/0600` permissions, SVG/MIME validation, path-traversal guards, and sandboxed scene imports.
- **Complete in-app guide refresh** — bilingual guidance for Edge TTS, Piper TTS, image/logo uploads, version `1.3.0`, and direct contact at `studio@zoedit.com`.

## The Evolution of Zoedit Studio

| Release | Focus | What changed |
| --- | --- | --- |
| **v1.0.0** | Prompt-to-Remotion foundation | Basic prompt-to-scene generation, ElevenLabs-only voiceover, simple scrollable dashboard, single visual workflow. |
| **v1.2.0** | Desktop NLE + reliability | Zero-scroll workspace, resizable panes, full local persistence, full-library SFX, dark Remotion Studio loading, and first security-hardening pass. |
| **v1.3.0** | Multi-provider audio + user visuals | Edge TTS and offline Piper TTS join ElevenLabs; secure image/logo uploads; cinematic asset motion; cleaner guide, metadata, and version alignment. |
| **v1.3.1** | Rich generation restoration | Restored rich scene generation, asset injection, voiceover confirmation modal, and topic prompt generator. |
| **v1.3.2** | Reliability & safety | Self-healing scene retries, strict offline sanitizer, cumulative fallback alerts, targeted quick tweaks, and two-step cancel confirmation. |

## Highlights

- **True creative variety** — AI writes real React/Remotion scene code instead of filling fixed templates.
- **Multi-provider voiceover** — free zero-key Edge TTS, offline CPU-friendly Piper TTS, or ElevenLabs BYOK.
- **Unified voice discovery** — language, regional accent, gender, search, and live auditioning across all three providers.
- **Secure user assets** — logos and screenshots become animated scene content with 2.5D tilt, spring physics, Ken Burns motion, and Clean B-Roll preservation.
- **Zero-scroll desktop workspace** — a 100vh NLE layout with resizable tool, preview, inspector, and timeline panes.
- **Word-level captions** — native Edge/ElevenLabs word timestamps and measured Piper alignment.
- **Full-library smart SFX** — all local sound effects are available to the scene agent, with contextual cue selection.
- **TikTok / Reels / Shorts ready** — safe-zone preview and automatic framing for vertical, square, and landscape output.
- **Automatic WCAG contrast** — text palettes are checked and corrected for readable contrast.
- **Secure by default** — local-only binding, owner-only secrets/assets, validated uploads, and sandboxed generated code.

## Architecture & Cost-Efficiency Philosophy

Zoedit Studio was engineered by curating and combining the best motion-design primitives, Remotion skill recipes, safe-zone framing, and smart prompt pipelines. The goal is studio-grade, custom-coded video at the lowest possible API cost — without rigid templates.

- **React dashboard** — a fast, bilingual control surface for direction, audio, colors, captions, renders, uploads, and usage.
- **Remotion renderer** — every scene is real React/Remotion code, rendered locally with zero per-frame platform cost.
- **OpenCode scene agent** — an autonomous scene-coding agent plans pacing, splits scenes, and writes bespoke motion code.
- **Multi-provider audio** — free Edge cloud voices, local Piper ONNX voices, or ElevenLabs, with native/estimated word timings for synced captions.
- **Secure local assets** — user images are stored in `public/user-assets` and referenced only through Remotion `staticFile`.
- **Smart prompt pipeline** — one master prompt becomes a scene breakdown, visual language, and render-ready composition.
- **Safe-zone by default** — captions and key content stay clear of TikTok, Reels, and Shorts interface overlays.
- **Cost-aware choices** — free or ultra-low-cost LLM providers, local rendering, and quick tweaks that reuse the existing voiceover instead of regenerating it.

## Credits

Zoedit Studio is built with care on:

- **[React](https://react.dev)** — interactive studio interface.
- **[Remotion](https://www.remotion.dev)** — programmatic video rendering.
- **[OpenCode](https://opencode.ai)** — autonomous scene-coding agent.
- **[Edge TTS](https://github.com/rany2/edge-tts)** — free Microsoft Edge cloud voices.
- **[Piper](https://github.com/rhasspy/piper)** — offline open-source neural TTS.
- **[ElevenLabs](https://elevenlabs.io)** — premium voiceover and sound design.

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
| `--version`, `-v` | — | Print the installed version (currently `1.3.2`). |

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

Configure provider keys in either of two ways:

1. **Dashboard UI (recommended)** — open the **API Settings Drawer** in the dashboard, paste your keys, and click **Save & Sync**. Keys are saved locally in `~/.zoedit-studio/settings.json`.
2. **Environment files** — copy the example files and fill in your keys:

```bash
cp .env.example .env
cp dashboard/.env.example dashboard/.env
```

Then replace `your_api_key_here` with your own keys. Real `.env` files are git-ignored. Keys entered in the Dashboard UI are stored locally in `~/.zoedit-studio/settings.json` and take precedence over `.env` values.

## Supported AI & Voice Providers

Every provider is optional and independent. Open the dashboard, choose **API & Keys**, paste the key, and click **Save & Sync**. The same guide is available from the footer under **API setup guide**.

| Provider | Purpose | Get a key |
| --- | --- | --- |
| OpenCode Free Models | Free scene-writing models via OpenCode | <https://opencode.ai> |
| DeepSeek | Low-cost structured script generation | <https://platform.deepseek.com/api_keys> |
| Edge TTS | Free cloud voiceover, 100+ languages and accents | No key required |
| Piper TTS | Offline open-source CPU voiceover with ONNX models | No key required |
| ElevenLabs | Premium voiceover, sound effects, and V4 voices | <https://elevenlabs.io/app/developers/api-keys> |
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

### 3. Edge TTS (Free, No Key)

1. Open **Audio Studio → Voiceover Provider**.
2. Choose **Edge TTS (Free)**.
3. Filter the catalog by language, regional accent, or gender.
4. Press the preview button to audition any voice before export.
5. Export normally — native word-boundary timestamps drive synced captions.

Edge TTS uses Microsoft's Edge Read Aloud service, so an internet connection is required during synthesis.

### 4. Piper TTS (Open-Source Offline)

1. Open **Audio Studio → Voiceover Provider**.
2. Choose **Piper TTS (Open-Source Offline)**.
3. Pick a voice; the runtime and selected ONNX model download on first use.
4. Preview or export entirely on CPU — no API key and no cloud audio.

Files are stored with owner-only permissions:

- Runtime: `~/.zoedit-studio/tts-runtime`
- Voices: `~/.zoedit-studio/voices` (`0700` directories, `0600` files)

Set `PIPER_BIN` if you already have a Piper executable you want to reuse.

### 5. ElevenLabs (BYOK)

1. Open <https://elevenlabs.io/app/developers/api-keys>.
2. Generate an API key (`sk_...`).
3. Grant **Text to Speech Access**, **Models Access**, **User Access**, and **History Read**.
4. Paste the key into Zoedit Studio under **API & Keys**.
5. Select **ElevenLabs (BYOK)** in Audio Studio.

### 6. OpenRouter

1. Open <https://openrouter.ai/keys>.
2. Generate a key (`sk-or-v1-...`).
3. Optionally add credit, or use the `:free` model tiers.
4. Paste the key into Zoedit Studio under **API & Keys**.

### 7. Kie.ai

1. Open <https://kie.ai/api-key>.
2. Create an API key for OpenAI-compatible chat completions.
3. Paste the key into Zoedit Studio under **API & Keys**.

### 8. Custom Provider

Connect any OpenAI-compatible endpoint — Groq, Together, Ollama, self-hosted vLLM, or your own gateway:

1. Enter a provider name under **API & Keys**.
2. Enter the full **Base URL** ending in `/v1` (for example `https://api.example.com/v1`).
3. Add the API key if your endpoint requires one.
4. Type or select the model ID.

## Multi-Provider Voiceover Engine

All three voice engines use the same Audio Studio controls:

- Language and regional accent filters, including Arabic dialects and English US/UK/AU variants.
- Male / Female / Neutral gender filters.
- Free-text search.
- Live voice auditioning before rendering.
- Smart video-language matching that pre-filters voices without locking you in.
- Word-level synced captions.
- Local persistence of provider, voice ID, and filter preferences.

| Engine | Cost | Connectivity | Caption timing |
| --- | --- | --- | --- |
| Edge TTS | Free | Cloud (Microsoft Edge Read Aloud) | Native word boundaries |
| Piper TTS | Free | Fully offline after model download | Measured WAV alignment |
| ElevenLabs | BYOK | Cloud | Native character/word alignment |

## Secure Image & Logo Uploads

Open the prompt composer and use **Attach Images / Logo** or drag files into the upload strip.

Supported files:

- PNG
- JPG / JPEG
- WEBP
- SVG (sanitized)

Limits and safeguards:

- Maximum **8 MB** per image and **12 images** per workspace.
- Files are stored in `public/user-assets` with random UUID names and owner-only permissions.
- SVG files are stripped of scripts, event handlers, embedded documents, and external URLs.
- MIME type and file signature are both validated.
- Path traversal is blocked by manifest lookups and resolved-path confinement.

Tag each upload as **Logo** or **Screenshot / Visual**, add a short note such as “Dashboard screen” or “Company logo,” then export. The scene agent receives the exact file path, role, dimensions/aspect ratio, and note, and is instructed to:

- Wrap screenshots in glassmorphic cards, browser windows, or device bezels with soft shadows, 2.5D perspective tilt, spring entrances, and Ken Burns motion.
- Preserve logo transparency and stage a hero entrance/outro reveal with brand-colored glow and spring physics.
- Keep uploaded assets visible in **Clean B-Roll Mode** — only decorative text overlays are removed.

Generated scenes may reference only local assets with:

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("user-assets/your-file.png")} />
```

External URLs, inline data images, and unsafe static paths are rejected by the scene validator.

## Zero-Scroll Desktop NLE Workspace

The dashboard is built as a fixed **100vh** NLE:

- Resizable tool, preview, inspector, and timeline panes.
- ResizeObserver-contained Live Preview and Live Sandbox.
- Adaptive toolbars that collapse gracefully on smaller screens.
- Dark Remotion Studio splash and launcher.
- Local persistence for layout, prompt, script, language, voice provider, voices, filters, captions, palette, watermark, SFX, display modes, and uploaded assets.

## Full-Library Smart SFX & Volume Tester

Every scene can draw from the full local SFX library with event-synced cues. There is no fixed cue-count cap: the agent selects sounds contextually for typing, clicks, card entrances, chart reveals, impacts, risers, whooshes, and transitions. Use the **Test Volume** button in Audio Studio to hear the current SFX gain before rendering.

## Why Three Voice Engines?

An honest founder note: ElevenLabs still delivers exceptional realism, especially with its V4 model. But professional production also needs free drafts, offline privacy, and broad language coverage. v1.3.0 therefore keeps ElevenLabs as a premium BYOK option while adding Edge TTS for zero-cost cloud voices and Piper for fully offline work. The codebase remains open, so you can customize or extend any voice engine.

## Security & Privacy

Zoedit Studio binds to `127.0.0.1` and is local-only by design. The server validates the `Host` header and checks `Origin`/`Referer` on state-changing requests to block DNS rebinding and cross-site request forgery. For remote access, use the SSH tunnel workflow above instead of exposing the port directly.

- API keys are stored locally in `~/.zoedit-studio/settings.json` with `0600` permissions inside a `0700` state directory.
- Keys are masked in API responses, never included in client bundles, and redacted from server logs.
- Uploaded images live in `public/user-assets` with `0700` directories and `0600` files.
- Uploads are validated by MIME type and file signature; SVGs are sanitized before storage.
- File-serving endpoints resolve paths inside their designated directories only.
- Generated scene imports are restricted to approved libraries; Node/system APIs, dynamic imports, network fetches, `process.env`, `eval`, `new Function`, global objects, and raw HTML injection are rejected.
- Uploaded assets may be referenced only through Remotion `staticFile` with a validated local `user-assets/...` path.

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
| `PIPER_BIN` | Optional path to an existing Piper binary (otherwise downloaded on demand). |
| `GEMINI_API_KEY` | Optional Gemini fallback for script generation. |
| `APP_URL` | Public URL of the deployed app. |

Keys entered in the dashboard take precedence and are persisted locally in `~/.zoedit-studio/settings.json`.

## Project Layout

```text
zoedit-studio/
├── bin/zoedit-studio.mjs       Smart CLI launcher
├── scripts/                    Setup, install, and maintenance scripts
├── dashboard/                  Express + Vite studio UI and API
│   ├── tts/                    Edge/Piper catalogs and providers
│   └── userAssets.ts           Secure upload, SVG sanitizer, manifest
├── src/                        Remotion composition and generated scenes
├── public/
│   ├── audio/                  Generated voiceover audio (git-ignored)
│   ├── sfx/                    Local sound-effect library
│   └── user-assets/            Uploaded logos/screenshots (git-ignored)
├── out/                        Rendered videos and caches (git-ignored)
└── build/                      Remotion bundle output (git-ignored)
```

## Release History

### v1.3.2 — Reliability, safety, and targeted recovery

- Added one automatic LLM self-heal retry for sanitizer and TypeScript validation failures before falling back to built-in scene templates.
- Enforced strict offline and Remotion sanitizer rules, including blocked external URLs/media and validated `interpolate()` ranges across generation and tweak prompts.
- Added cumulative fallback warnings, clickable scene references, and amber timeline badges so a single fallback clip does not cancel the render.
- Bound timeline clip selection to **Quick prompt tweak** targeting so only `Scene{N}.tsx` re-renders while reusing cached segments and TTS audio.
- Added the inline two-step **Cancel export** confirmation with a 4-second auto-reset.
- Bumped the root package, dashboard package, metadata, and UI badge to `1.3.2`.

### v1.3.1 — Rich scene generation restoration

- Restored rich custom scene generation, asset injection, and stronger creative direction.
- Added the smart voiceover confirmation modal and topic-driven prompt generator.

### v1.3.0 — Multi-provider audio and secure user visuals

- Added Edge TTS (free, zero-key, 100+ languages/accents) and Piper TTS (offline CPU, on-demand ONNX models) alongside ElevenLabs.
- Unified voice catalog, language/accent/gender filters, search, live preview, and word-level synced captions across all providers.
- Added secure drag-and-drop image/logo uploads with roles, notes, thumbnails, sanitized SVG support, and `public/user-assets` storage.
- Passed uploaded asset metadata into scene planning and code generation with cinematic screenshot/logo direction and Clean B-Roll preservation.
- Added scene-validator support for `<Img src={staticFile("user-assets/...")} />` while blocking external URLs.
- Refreshed the bilingual in-app guide, metadata, version badges, and documentation for v1.3.0.

### v1.2.0 — Zero-scroll desktop NLE and reliability

- Zero-scroll desktop NLE layout with compact toolbar, draggable split panels, unified responsive preview stage, pinned tools tabs, and a resizable scene/audio timeline.
- Full local workspace persistence with legacy-storage migration.
- Full-library context-aware SFX with a live volume test.
- Dark Remotion Studio loading and a sleek launcher overlay.
- Security hardening: owner-only permissions, secret redaction, stricter scene sandboxing, path confinement, and preserved loopback/Origin/Host protections.

### v1.0.0 — Initial foundation

- Basic prompt-to-Remotion scene generation.
- ElevenLabs-only voiceover.
- Single scrollable dashboard workflow.
- Initial scene renderer, captions, and local project storage.

## Development Checks

```bash
npm run lint
npm run build                    # root Remotion bundle
npm --prefix dashboard run build # dashboard production build
npx tsc --noEmit                 # root TypeScript check
```

Verify the CLI version:

```bash
zoedit-studio --version          # prints 1.3.2
```

## License

- **Zoedit Studio — MIT License.** Zoedit Studio is free and open-source software provided “as is”. Anyone can inspect, modify, and self-host it. See [LICENSE](./LICENSE).
- **Remotion License Notice.** **Remotion is free for individuals and for companies or teams of up to 3 people.** Organizations with **4 or more people** require a commercial Remotion license. Review <https://www.remotion.dev/license> before shipping commercially.
- **Third-Party Providers & Models.** OpenCode free models, DeepSeek, OpenRouter, Kie.ai, ElevenLabs, and the Edge TTS cloud service are independent third-party services governed by their own terms, pricing, and availability. Piper TTS runs locally under its open-source model. Zoedit Studio does not own these services or guarantee third-party availability or output quality.
- **Local Key & Asset Privacy.** API keys are stored strictly locally in `~/.zoedit-studio/settings.json`, and uploaded images live in `public/user-assets`. Keys and assets are never sent to Zoedit Studio servers. Users are responsible for their own API usage and generated content.

Built with care by the founder of **[zoedit.com](https://zoedit.com)** · **[studio.zoedit.com](https://studio.zoedit.com)** · **studio@zoedit.com**
