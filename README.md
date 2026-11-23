# Zof Studio

**Zof Studio — AI-Directed Motion Graphics Studio**
**Zof Studio — استوديو الموشن جرافيك بمساعدة الذكاء الاصطناعي**

Zof Studio turns an idea or script into an animated, rendered video: AI-written scene code, voiceover, synced captions, and platform-aware framing. It is not a template carousel. Every scene is custom code, so the visual language can change with the story instead of repeating one look.

Live app: **https://studio.zoedit.com** · Source: **https://github.com/ZOF478/zofstudio**

## The Story Behind Zof Studio

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

Zof Studio was engineered by curating and combining the best motion-design primitives, Remotion skill recipes, safe-zone framing, and smart prompt pipelines. The goal is studio-grade, custom-coded video at the lowest possible API cost — without rigid templates.

- **React dashboard** — a fast, bilingual control surface for direction, audio, colors, captions, renders, and usage.
- **Remotion renderer** — every scene is real React/Remotion code, rendered locally with zero per-frame platform cost.
- **OpenCode scene agent** — an autonomous scene-coding agent plans pacing, splits scenes, and writes bespoke motion code.
- **ElevenLabs audio** — realistic voiceover and sound design, with synced captions.
- **Smart prompt pipeline** — one master prompt becomes a scene breakdown, visual language, and render-ready composition.
- **Safe-zone by default** — captions and key content stay clear of TikTok, Reels, and Shorts interface overlays.
- **Cost-aware choices** — free or ultra-low-cost LLM providers, local rendering, and quick tweaks that reuse the existing voiceover instead of regenerating it.

## Credits

Zof Studio is built with care on:

- **[React](https://react.dev)** — interactive studio interface.
- **[Remotion](https://www.remotion.dev)** — programmatic video rendering.
- **[OpenCode](https://opencode.ai)** — autonomous scene-coding agent.
- **[ElevenLabs](https://elevenlabs.io)** — voiceover and sound design.

## Requirements

- Node.js `20.19+`, `22.13+`, or `24+`
- npm

## Quick Start

```bash
git clone https://github.com/ZOF478/zofstudio.git
cd zofstudio
npm run setup
npm start
```

`npm run setup` installs both the Remotion project dependencies and the dashboard dependencies, then links the `zofstudio` command. If `npm link` cannot write to the global npm prefix, it falls back to a user-local launcher under `~/.local/bin` (or `~/bin`) without failing setup. `npm start` launches the smart CLI and opens the dashboard when possible.

To link the command manually:

```bash
npm link
zofstudio
```

Configure your provider keys in either of two ways:

1. **Dashboard UI (recommended)** — open the **API Settings Drawer** in the dashboard, paste your keys, and click **Save & Sync**. Keys are saved locally in `~/.zof-studio/settings.json`.
2. **Environment files** — copy the example files and fill in your keys:

```bash
cp .env.example .env
cp dashboard/.env.example dashboard/.env
```

Then replace `your_api_key_here` with your own keys. Real `.env` files are git-ignored. Keys entered in the Dashboard UI are stored locally in `~/.zof-studio/settings.json` and take precedence over `.env` values.

## Supported AI & Voice Providers (API Setup)

Every provider is optional and independent. Open the dashboard, choose **API & Keys**, paste the key, and click **Save & Sync**. The same guide is available from the footer under **API setup guide**.

| Provider | Purpose | Get a key |
| --- | --- | --- |
| OpenCode Free Models | Free scene-writing models (via OpenCode) | <https://opencode.ai> |
| DeepSeek | Low-cost structured script generation | <https://platform.deepseek.com/api_keys> |
| ElevenLabs | Voiceover, sound effects, and V4 voices | <https://elevenlabs.io/app/settings/api-keys> |
| OpenRouter | Access to hundreds of models with one key | <https://openrouter.ai/keys> |
| Kie.ai | OpenAI-compatible chat completions | <https://kie.ai/api-key> |
| Custom provider | Any OpenAI-compatible endpoint (Groq, Together, Ollama, vLLM) | Your own endpoint |

> **Disclaimer:** **OpenCode Free Models** are provided by **OpenCode and its upstream partners** — they are **not owned or hosted by Zof Studio**. They are subject to third-party availability, rate limits, and may change at any time, without any guarantee from Zof Studio.

### 1. OpenCode Free Models

OpenCode free models are provided by **OpenCode and its upstream partners** — they are **not hosted or owned by Zof Studio**. They may have rate limits or change availability at any time. No Zof Studio account is required.

```bash
npm i -g opencode-ai
opencode auth login
```

Then select **OpenCode Free Models** in Zof Studio. Website: <https://opencode.ai>.

### 2. DeepSeek

1. Sign up at <https://platform.deepseek.com/api_keys>.
2. Create an API key (`sk-...`).
3. Top up a small balance — DeepSeek is ultra-low cost.
4. Paste the key into Zof Studio under **API & Keys**.

### 3. ElevenLabs

1. Open <https://elevenlabs.io/app/settings/api-keys>.
2. Generate an API key (`sk_...`).
3. Grant **Text-to-Speech** and **Sound Effects** permissions.
4. Paste the key into Zof Studio under **API & Keys**.

### 4. OpenRouter

1. Open <https://openrouter.ai/keys>.
2. Generate a key (`sk-or-v1-...`).
3. Optionally add credit, or use the `:free` model tiers.
4. Paste the key into Zof Studio under **API & Keys**.

### 5. Kie.ai

1. Open <https://kie.ai/api-key>.
2. Create an API key for OpenAI-compatible chat completions.
3. Paste the key into Zof Studio under **API & Keys**.

### 6. Custom Provider

Connect any OpenAI-compatible endpoint — Groq, Together, Ollama, self-hosted vLLM, or your own gateway:

1. Enter a provider name under **API & Keys**.
2. Enter the full **Base URL** ending in `/v1` (for example `https://api.example.com/v1`).
3. Add the API key if your endpoint requires one.
4. Type or select the model ID.

## Why ElevenLabs V4?

An honest founder note: ElevenLabs was selected after extensive real-world production experience because it delivers unmatched vocal realism — especially the **V4** model — at a fair price. The codebase stays fully open, so you can add other TTS providers later or customize your own copy freely.

## Security & Key Privacy

API keys are stored strictly locally in `~/.zof-studio/settings.json` and are never sent to Zof Studio servers. Usage and generated content are your responsibility. If you expose the app publicly, add authentication at your reverse proxy: the studio can spend API credits and run renders.

## CLI Options

| Flag | Default | Description |
| --- | --- | --- |
| `--port <number>` | `4789` | Dashboard port. If busy, the CLI scans `4789`–`4809` for the first free port. |
| `--host <addr>` | `127.0.0.1` | Bind address. The default keeps the studio local-only. |
| `--no-open` | off | Do not open a browser. Useful for VPS, containers, and headless machines. |
| `--open` | off | Force-open the browser even when `SSH_CONNECTION` is set (for SSH port-forwarding). |
| `--version`, `-v` | — | Print the installed version. |
| `--help`, `-h` | — | Print usage and examples. |

The CLI reuses an already-running Zof Studio instance on the target port instead of spawning a duplicate. Remotion Studio automatically uses the first free port in `3333`–`3353`. Browser auto-open is skipped when `SSH_CONNECTION` is present unless `--open` is passed.

The dashboard is served at `/`. Open `/studio/` on the dashboard to launch Remotion Studio; it starts the dedicated Studio process on its free port and redirects there. The same Studio is also reachable directly on that port (for example `http://localhost:3333`).

```bash
zofstudio
zofstudio --port 4800
zofstudio --host 0.0.0.0 --no-open
```

## Headless VPS / PM2

Use `--no-open` on servers without a desktop session:

```bash
npm install -g pm2
pm2 start ./bin/zofstudio.mjs --name zof-studio -- --port 4799 --host 0.0.0.0 --no-open
pm2 save
pm2 startup
```

Put a reverse proxy (Caddy, Nginx, or similar) in front of the dashboard, and set `APP_URL` in `.env` to the public URL.

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

Keys entered in the dashboard take precedence and are persisted locally in `~/.zof-studio/settings.json`.

## Project Layout

```text
zof-studio/
├── bin/zofstudio.mjs       Smart CLI launcher
├── dashboard/              Express + Vite studio UI and API
├── src/                    Remotion composition and generated scenes
├── public/                 SFX and generated audio (audio is git-ignored)
├── out/                    Rendered videos and caches (git-ignored)
└── build/                  Remotion bundle output (git-ignored)
```

## Development Checks

```bash
npm run lint
npm run build                    # root Remotion bundle
npm --prefix dashboard run build # dashboard production build
npx tsc --noEmit                 # root TypeScript check
```

## License

- **Zof Studio — MIT License.** Zof Studio is free and open-source software provided “as is”. Anyone can inspect, modify, and self-host it. See [LICENSE](./LICENSE).
- **Remotion License Notice.** **Remotion is free for individuals and for companies or teams of up to 3 people.** Organizations with **4 or more people** require a commercial Remotion license. Review <https://www.remotion.dev/license> before shipping commercially.
- **Third-Party Providers & Models.** OpenCode free models, DeepSeek, OpenRouter, Kie.ai, and ElevenLabs are independent third-party services governed by their own terms, pricing, and availability. Zof Studio does not own or guarantee third-party free models.
- **Local Key Privacy & User Responsibility.** API keys are stored strictly locally in `~/.zof-studio/settings.json` and never sent to Zof Studio servers. Users are responsible for their own API usage and generated content.

Built with care by the founder of **[zoedit.com](https://zoedit.com)** · **[studio.zoedit.com](https://studio.zoedit.com)**.
