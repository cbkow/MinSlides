import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = import.meta.dirname;

const includePlugin = () => ({
  name: 'html-include',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace(
        /<include\s+src="([^"]+)">\s*<\/include>/g,
        (_, src) => readFileSync(resolve(root, src), 'utf-8')
      );
    }
  }
});

export default defineConfig({
  plugins: [includePlugin()]
});
