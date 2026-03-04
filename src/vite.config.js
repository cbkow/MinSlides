import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const includePlugin = () => ({
  name: 'html-include',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace(
        /<include\s+src="([^"]+)">\s*<\/include>/g,
        (_, src) => fs.readFileSync(path.resolve(__dirname, src), 'utf-8')
      );
    }
  },
  configureServer(server) {
    server.watcher.add(path.resolve(__dirname, 'slides'));
    server.watcher.on('change', (file) => {
      if (file.includes('slides')) {
        server.ws.send({ type: 'full-reload' });
      }
    });
  }
});

export default defineConfig({
  plugins: [includePlugin()]
});
