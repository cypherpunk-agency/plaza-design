/**
 * generate-demos.tsx
 *
 * Builds the cypherpunk.agency homepage from React components into
 * dist-homepage/ — exactly the tree that .github/workflows/deploy-homepage.yml
 * publishes:
 *
 *   index.html     body rendered by src/ssg/render.tsx, all CSS + JS inlined
 *   fonts/*.woff2  IBM Plex Mono, served same-origin
 *   og-image.png   social preview (repo root)
 *
 * The page must load nothing cross-origin. The server CSP is default-src 'self'
 * with no font-src, so fonts can be neither Google Fonts nor data: URIs — they
 * ship as files next to index.html. Inline <style>/<script> is allowed.
 *
 * Run with: pnpm --filter plaza-design-demo generate-demos
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { renderStaticHTML, getDefaultMeta, demoStyles, initScript } from '../src/ssg/render';
import { CAPSULE, DOWNTOWN, ENGINE, LOGIC, MOTH, NET, YARD } from '../src/ssg/game/data';
import { CAPSULE_RULES } from '../src/ssg/game/capsule/rules';
import { MOTH_RULES } from '../src/ssg/game/moth/rules';
import { checkGame } from '../src/ssg/game/data/check';
import { YARD_RULES } from '../src/ssg/game/yard/effects';
import { DOWNTOWN_RULES_SHAPE } from '../src/ssg/game/downtown/rules';
import { contractOf } from '../src/ssg/game/zone/rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DEMO_DIR, '../..');
const CORE_DIR = path.resolve(DEMO_DIR, '../plaza-design-core');
const OUT_DIR = path.join(DEMO_DIR, 'dist-homepage');

/**
 * Bundle plaza.css (resolving every @import) and emit the fonts it references
 * into OUT_DIR/fonts/ under their original names.
 */
async function bundleCSS(): Promise<string> {
  const result = await build({
    entryPoints: [path.join(CORE_DIR, 'plaza.css')],
    bundle: true,
    write: false,
    outdir: OUT_DIR,
    loader: { '.woff2': 'file' },
    assetNames: 'fonts/[name]',
    logLevel: 'warning',
  });

  let css = '';
  for (const file of result.outputFiles) {
    if (file.path.endsWith('.css')) {
      css = file.text;
    } else {
      fs.mkdirSync(path.dirname(file.path), { recursive: true });
      fs.writeFileSync(file.path, file.contents);
    }
  }
  // Asset URLs come out relative to OUT_DIR ("./fonts/..."), i.e. the site
  // root once the CSS is inlined into index.html.
  return css;
}

/**
 * Bundle plaza.ts plus the page's init code into one classic script.
 */
async function bundleJS(): Promise<string> {
  const result = await build({
    stdin: {
      contents: `import {
  initPlazaTheme, toggleTheme, startClock, createParticles,
  renderTelemetry, renderRoutes, renderKeys, renderNetLog, renderStatus,
  startHexScroll, updateNodeCount,
} from './plaza.ts';
import { initCityScene } from ${JSON.stringify(path.join(DEMO_DIR, 'src/ssg/cityScene.ts').split(path.sep).join('/'))};
import { initAccessDenied, runBoot } from ${JSON.stringify(path.join(DEMO_DIR, 'src/ssg/game/index.ts').split(path.sep).join('/'))};
${initScript}`,
      resolveDir: CORE_DIR,
      sourcefile: 'homepage-init.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

function generateHTML(bodyContent: string, css: string, js: string): string {
  const meta = getDefaultMeta();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${meta.title}</title>

  <!-- SEO & Social -->
  <meta name="description" content="${meta.description}">
  <meta property="og:title" content="${meta.title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:image" content="${meta.ogImage}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${meta.ogUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title}">
  <meta name="twitter:description" content="${meta.description}">
  <meta name="twitter:image" content="${meta.ogImage}">

  <style>
${css}
${demoStyles}
  </style>
</head>
<body class="bg-black overflow-hidden">
  ${bodyContent}

  <script>
${js}
  </script>
</body>
</html>
`;
}

/**
 * The game's zone files must make sense before they ship: every cable reaches
 * a real noun, every effect exists in code, every dialogue choice leads
 * somewhere (src/ssg/game/GAME-DATA.md). The type-check covers their shape.
 */
function checkGameData() {
  // one entry per zone: its file and its code (zone/rules.ts); net.json, logic.json and the keyring come along
  const problems = checkGame([
    { data: YARD, code: contractOf(YARD_RULES), extra: YARD_RULES.check },
    { data: CAPSULE, code: contractOf(CAPSULE_RULES), extra: CAPSULE_RULES.check },
    { data: DOWNTOWN, code: contractOf(DOWNTOWN_RULES_SHAPE), extra: DOWNTOWN_RULES_SHAPE.check },
    { data: MOTH, code: contractOf(MOTH_RULES), extra: MOTH_RULES.check },
  ], LOGIC, NET, ENGINE);
  if (!problems.length) return;
  console.error(`Game data has ${problems.length} problem${problems.length > 1 ? 's' : ''} (src/ssg/game/data/):\n`);
  problems.forEach((p) => console.error('  ' + p));
  console.error('');
  process.exit(1);
}

async function main() {
  console.log('Generating homepage from React components...\n');
  checkGameData();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const [css, js] = await Promise.all([bundleCSS(), bundleJS()]);
  const html = generateHTML(renderStaticHTML(), css, js);
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf-8');
  fs.copyFileSync(path.join(REPO_ROOT, 'og-image.png'), path.join(OUT_DIR, 'og-image.png'));

  for (const f of fs.readdirSync(OUT_DIR, { recursive: true }) as string[]) {
    const p = path.join(OUT_DIR, f);
    if (fs.statSync(p).isFile()) console.log(`  ${f.replace(/\\/g, '/')}  ${fs.statSync(p).size} B`);
  }
  console.log(`\nDone: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Error generating homepage:', err);
  process.exit(1);
});
