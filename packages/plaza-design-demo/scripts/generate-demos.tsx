import { SCENES as registeredGameScenes } from '../src/ssg/game/scenes';
import { sceneRuleContract } from '../src/ssg/game/engine/scene-rule-contract';
import { gameSourceIdentity } from './scene-system/source-identity.mts';
/**
 * generate-demos.tsx
 *
 * Builds the cypherpunk.agency homepage from React components into
 * dist-homepage/ — exactly the tree that .github/workflows/deploy-homepage.yml
 * publishes:
 *
 *   index.html                small shell: meta + body rendered by src/ssg/render.tsx
 *   assets/home-<hash>.css    plaza.css + page styles, minified
 *   assets/home-<hash>.js     plaza.ts + game + init code, minified
 *   assets/*.{br,gz}          precompressed copies for Caddy's `precompressed`
 *   fonts/*.woff2             IBM Plex Mono, served same-origin
 *   og-image.png              social preview (repo root)
 *   health.txt                tiny file for uptime checks
 *
 * index.html is served no-cache and stays a few KB, so revalidations and uptime
 * probes are cheap. Everything under assets/ is content-hashed and immutable:
 * the server caches /assets/* for a year. Unhashed files keep their names.
 *
 * The page must load nothing cross-origin. The server CSP is default-src 'self'
 * with no font-src, so fonts can be neither Google Fonts nor data: URIs — they
 * ship as files under /fonts/.
 *
 * Run with: pnpm --filter plaza-design-demo generate-demos
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { build, transform } from 'esbuild';
import { renderStaticHTML, getDefaultMeta, demoStyles, initScript } from '../src/ssg/render';
import {
  BEACH,
  CAPSULE,
  DOWNTOWN,
  ENGINE,
  LAUNDROMAT,
  LOGIC,
  MOTH,
  NET,
  YARD,
} from '../src/ssg/game/data/index';
import { checkGame } from '../src/ssg/game/data/check';
import { contractOf } from '../src/ssg/game/engine/rules';
import { cityProblems } from '../src/ssg/game/world/city';
import { planProblems } from '../src/ssg/game/world/cityplan';
import { TRAIN } from '../src/ssg/game/data/index';
import { STACKS } from '../src/ssg/game/data/index';
import { LIBRARY } from '../src/ssg/game/data/index';
import { SANDBOX } from '../src/ssg/game/data/index';
import { buildPublicEditor } from './scene-system/build-public-editor.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DEMO_DIR, '../..');
const CORE_DIR = path.resolve(DEMO_DIR, '../plaza-design-core');
const OUT_DIR = path.join(DEMO_DIR, 'dist-homepage');
const ASSETS = 'assets';

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
    publicPath: '/',
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
  // publicPath makes font URLs root-absolute ("/fonts/..."), so they resolve
  // from the stylesheet under /assets/.
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
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

/**
 * Write one content-hashed asset plus .br and .gz copies; returns its URL path.
 */
function writeAsset(name: string, ext: string, content: string): string {
  const bytes = Buffer.from(content, 'utf-8');
  const file = `${name}-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.${ext}`;
  const dir = path.join(OUT_DIR, ASSETS);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), bytes);
  fs.writeFileSync(
    path.join(dir, file + '.br'),
    zlib.brotliCompressSync(bytes, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      },
    }),
  );
  fs.writeFileSync(path.join(dir, file + '.gz'), zlib.gzipSync(bytes, { level: 9 }));
  return `/${ASSETS}/${file}`;
}

function generateHTML(bodyContent: string, cssHref: string, jsSrc: string): string {
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

  <link rel="stylesheet" href="${cssHref}">
</head>
<body class="bg-black overflow-hidden">
  ${bodyContent}

  <script src="${jsSrc}"></script>
</body>
</html>
`;
}

/**
 * The game's scene data files and the city (city.ts) must make sense before they ship: every cable reaches
 * a real noun, every effect exists in code, every dialogue choice leads
 * somewhere (src/ssg/game/GAME-DATA.md). The type-check covers their shape.
 */
function checkGameData() {
  // one entry per scene with a data file: the file and its code (engine/rules.ts); net.json, logic.json and the keyring come along
  const problems = checkGame(
    Object.values(registeredGameScenes).flatMap((scene) => {
      if (!scene.data) return [];
      const rules = sceneRuleContract(scene);
      return [
        {
          data: scene.data,
          code: contractOf(
            rules,
            scene.gameplay?.native?.verbs,
            Object.keys(scene.gameplay?.queries ?? {}),
          ),
          extra: rules.check,
        },
      ];
    }),
    LOGIC,
    NET,
    ENGINE,
  );
  // the city's districts and places (city.ts): every place has its scenes, its entrance among them
  problems.push(...cityProblems().map((p) => 'city.ts › ' + p));
  // the street plan (cityplan.ts): every place, station and pad on land, in its own district
  problems.push(...planProblems().map((p) => 'cityplan.ts › ' + p));
  if (!problems.length) return;
  console.error(
    `Game data has ${problems.length} problem${problems.length > 1 ? 's' : ''} (src/ssg/game/data/):\n`,
  );
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
  const styles = (
    await transform(css + '\n' + demoStyles, { loader: 'css', minify: true, logLevel: 'warning' })
  ).code;
  const html = generateHTML(
    renderStaticHTML(),
    writeAsset('home', 'css', styles),
    writeAsset('home', 'js', js),
  ).replace(
    '<head>',
    `<head><meta name="game-source" content="${gameSourceIdentity(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/ssg/game'))}">`,
  );
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf-8');
  fs.copyFileSync(path.join(REPO_ROOT, 'og-image.png'), path.join(OUT_DIR, 'og-image.png'));
  fs.writeFileSync(path.join(OUT_DIR, 'health.txt'), 'ok\n');
  const editor = await buildPublicEditor(OUT_DIR);
  console.log(
    `  Public editor: ${editor.documentCount} documents, ${editor.sourceCount} source references`,
  );

  for (const f of fs.readdirSync(OUT_DIR, { recursive: true }) as string[]) {
    const p = path.join(OUT_DIR, f);
    if (fs.statSync(p).isFile())
      console.log(`  ${f.replace(/\\/g, '/')}  ${fs.statSync(p).size} B`);
  }
  console.log(`\nDone: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Error generating homepage:', err);
  process.exit(1);
});
