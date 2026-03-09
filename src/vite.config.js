import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const slidesDir = path.resolve(import.meta.dirname, 'slides');

const includePlugin = () => {
  let lastReload = 0;
  let reloadTimer = null;

  return {
    name: 'html-include',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          /<include\s+src="([^"]+)">\s*<\/include>/g,
          (_, src) => fs.readFileSync(path.resolve(import.meta.dirname, src), 'utf-8')
        );
      }
    },
    handleHotUpdate({ file }) {
      // Suppress Vite's built-in per-file reloads for slide partials
      if (file.startsWith(slidesDir)) return [];
    },
    configureServer(server) {
      server.watcher.add(slidesDir);

      server.watcher.on('change', (file) => {
        const abs = path.resolve(file);
        if (abs.startsWith(slidesDir) && abs.endsWith('.html')) {
          // Ignore spurious change events caused by fs.readFileSync
          // during transformIndexHtml right after a reload
          if (Date.now() - lastReload < 2000) return;

          clearTimeout(reloadTimer);
          reloadTimer = setTimeout(() => {
            lastReload = Date.now();
            server.ws.send({ type: 'full-reload' });
          }, 200);
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [includePlugin()]
});
