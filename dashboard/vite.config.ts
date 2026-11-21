import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      dedupe: ['react', 'react-dom', 'remotion'],
      alias: [
        {find: /^@\//, replacement: `${path.resolve(__dirname, '.')}/`},
        // Keep every Remotion/React import on one physical copy. The dashboard
        // and the shared /src compositions otherwise resolve two package
        // instances, which leaves the <Player /> stuck on a black frame.
        {find: /^remotion$/, replacement: path.resolve(__dirname, 'node_modules/remotion')},
        {find: /^remotion\//, replacement: `${path.resolve(__dirname, 'node_modules/remotion')}/`},
        {
          find: /^@remotion\/player$/,
          replacement: path.resolve(__dirname, 'node_modules/@remotion/player'),
        },
        {find: /^react$/, replacement: path.resolve(__dirname, 'node_modules/react')},
        {find: /^react\//, replacement: `${path.resolve(__dirname, 'node_modules/react')}/`},
        {find: /^react-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-dom')},
        {find: /^react-dom\//, replacement: `${path.resolve(__dirname, 'node_modules/react-dom')}/`},
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
