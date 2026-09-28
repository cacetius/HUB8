import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('.', import.meta.url));
const legacyDirectory = path.resolve(projectDirectory, '../../apps/legacy');
const hubClientPath = path.resolve(projectDirectory, '../services/hub-client.js');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-shared-hub-client',
      configureServer(server) {
        server.middlewares.use('/frontend/services/hub-client.js', (_request, response, next) => {
          try {
            response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            response.end(fs.readFileSync(hubClientPath));
          } catch (error) {
            next(error);
          }
        });
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'frontend/services/hub-client.js',
          source: fs.readFileSync(hubClientPath),
        });
      },
    },
  ],
  publicDir: legacyDirectory,
});
