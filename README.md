# Zof Studio

**AI-directed, custom-coded motion graphics studio built on React + Remotion.**

Zof Studio turns an idea or script into animated, rendered video: AI-generated scene code, voiceover, synced captions, and platform-aware framing. It is not a template carousel. Every scene is custom code, so the visual language can change with the story instead of repeating one look.

Live app: **https://studio.zoedit.com**

## Highlights

- **True creative variety** — AI writes real React/Remotion scene code instead of filling fixed templates.
- **2.5D depth and clean B-Roll modes** — cinematic parallax, layered depth, or crisp supporting footage.
- **TikTok / Reels / Shorts ready** — safe-zone preview and automatic framing for vertical, square, and landscape output.
- **ElevenLabs TTS** — natural voiceover with word-level and karaoke-style captions.
- **Automatic WCAG contrast** — text palettes are checked and corrected for readable contrast.
- **Smart port CLI** — one command starts the dashboard, finds free ports, and opens the browser when a display is available.

## Requirements

- Node.js `20.19+`, `22.13+`, or `24+`
- npm

## Quick Start

```bash
git clone https://github.com/ZOF478/zofstudio.git
cd zof-studio
npm run setup
npm start
```

`npm run setup` installs both the Remotion project dependencies and the dashboard dependencies, then links the `zofstudio` command. If `npm link` cannot write to the global npm prefix, it falls back to a user-local launcher under `~/.local/bin` (or `~/bin`) without failing setup. `npm start` launches the smart CLI and opens the dashboard when possible.

To link the command manually:

```bash
npm link
zofstudio
```

Add your provider keys by copying the example environment files:

```bash
cp .env.example .env
cp dashboard/.env.example dashboard/.env
```

Then replace `your_api_key_here` with your own keys. Real `.env` files are git-ignored.

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

Put a reverse proxy (Caddy, Nginx, or similar) in front of the dashboard, and set `APP_URL` in `.env` to the public URL. If the app is exposed publicly, add authentication at the proxy layer: the studio can spend API credits and run renders.

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

MIT — see [LICENSE](./LICENSE).

Remotion has its own licensing terms for some commercial use cases; review [Remotion's license](https://www.remotion.dev/license) before shipping commercially.

Built with care by the team behind **https://studio.zoedit.com**.
