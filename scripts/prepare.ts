// generate stub index.html files for dev entry
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import { isDev, log, outputDir, port, r } from './utils.js';

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = ['sidepanel', 'options'];

  for (const view of views) {
    await fs.ensureDir(r(`${outputDir}/dist/${view}`));
    let data = await fs.readFile(r(`src/${view}/index.html`), 'utf-8');
    data = data
      .replace('"./main.ts"', `"http://localhost:${port}/${view}/main.ts"`)
      .replace('<div id="app"></div>', '<div id="app">Vite server did not start</div>');
    await fs.writeFile(r(`${outputDir}/dist/${view}/index.html`), data, 'utf-8');
    log('PRE', `stub ${view}`);
  }
}

function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' });
}

writeManifest();

if (isDev) {
  stubIndexHtml();
  chokidar.watch(r('src/**/*.html')).on('change', () => {
    stubIndexHtml();
  });
  chokidar.watch([r('scripts/manifest.ts'), r('package.json')]).on('change', () => {
    writeManifest();
  });
}
