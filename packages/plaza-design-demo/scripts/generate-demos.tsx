/**
 * generate-demos.tsx
 *
 * Generates demo-modular.html and demo-single.html from React components.
 * Run with: npx tsx scripts/generate-demos.tsx
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { renderStaticHTML, getDefaultMeta, demoStyles, initScript } from '../src/ssg/render';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const DEMO_REACT_DIR = path.resolve(__dirname, '..');

/**
 * CSS files to concatenate for single-file version (in order)
 */
const CSS_FILES = [
  'plaza-core/tokens.css',
  'plaza-core/base.css',
  'plaza-core/utilities.css',
  'plaza-core/animations.css',
  'plaza-core/components/button.css',
  'plaza-core/components/window.css',
  'plaza-core/components/panel.css',
  'plaza-core/components/effects.css',
];

/**
 * Read and concatenate all CSS files, removing @import statements
 */
function readAllCSS(): string {
  let allCSS = '';

  for (const file of CSS_FILES) {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      // Remove @import statements
      content = content.replace(/@import\s+['"][^'"]+['"];?\s*/g, '');
      allCSS += `/* === ${file} === */\n${content}\n\n`;
    } else {
      console.warn(`Warning: CSS file not found: ${filePath}`);
    }
  }

  // Also include the responsive utilities from plaza.css
  const plazaMainCSS = fs.readFileSync(path.join(ROOT_DIR, 'plaza-core/plaza.css'), 'utf-8');
  // Extract only the non-import parts (responsive utilities, etc.)
  const responsivePart = plazaMainCSS.replace(/@import\s+['"][^'"]+['"];?\s*/g, '');
  allCSS += `/* === plaza-core/plaza.css (responsive) === */\n${responsivePart}\n`;

  return allCSS;
}

/**
 * Read plaza.js and convert from ES module to inline script
 */
function readPlazaJS(): string {
  const plazaJSPath = path.join(ROOT_DIR, 'plaza.js');
  let content = fs.readFileSync(plazaJSPath, 'utf-8');

  // Remove export statements
  content = content
    // Remove "export function" -> "function"
    .replace(/^export\s+function\s+/gm, 'function ')
    // Remove "export const" -> "const"
    .replace(/^export\s+const\s+/gm, 'const ')
    // Remove "export let" -> "let"
    .replace(/^export\s+let\s+/gm, 'let ');

  // Remove multiline "export { ... };" blocks
  content = content.replace(/export\s*\{[\s\S]*?\};?/g, '');

  // Remove multiline "export default { ... };" blocks
  content = content.replace(/export\s+default\s*\{[\s\S]*?\};?/g, '');

  return content;
}

/**
 * Generate demo-modular.html with external CSS/JS references
 */
function generateModularHTML(bodyContent: string): string {
  const meta = getDefaultMeta();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

  <link rel="stylesheet" href="plaza-core/plaza.css">
  <style>${demoStyles}
  </style>
</head>
<body class="bg-black overflow-hidden">
  ${bodyContent}

  <script type="module">
    import {
      initPlazaTheme,
      toggleTheme,
      startClock,
      initGridCanvas,
      createParticles,
      renderTelemetry,
      renderRoutes,
      renderKeys,
      renderNetLog,
      renderStatus,
      startHexScroll,
      updateNodeCount,
    } from './plaza.js';

${initScript}
  </script>
</body>
</html>`;
}

/**
 * Generate demo-single.html with all CSS/JS inlined
 */
function generateSingleHTML(bodyContent: string): string {
  const meta = getDefaultMeta();
  const allCSS = readAllCSS();
  const plazaJS = readPlazaJS();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
${allCSS}
${demoStyles}
  </style>
</head>
<body class="bg-black overflow-hidden">
  ${bodyContent}

  <script>
${plazaJS}

${initScript}
  </script>
</body>
</html>`;
}

/**
 * Main entry point
 */
async function main() {
  console.log('Generating demo HTML files from React components...\n');

  // Render React component to static HTML
  const bodyContent = renderStaticHTML();

  // Generate demo-modular.html
  const modularPath = path.join(ROOT_DIR, 'demo-modular.html');
  const modularHTML = generateModularHTML(bodyContent);
  fs.writeFileSync(modularPath, modularHTML, 'utf-8');
  console.log(`Generated: ${modularPath}`);

  // Generate demo-single.html
  const singlePath = path.join(ROOT_DIR, 'demo-single.html');
  const singleHTML = generateSingleHTML(bodyContent);
  fs.writeFileSync(singlePath, singleHTML, 'utf-8');
  console.log(`Generated: ${singlePath}`);

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error generating demos:', err);
  process.exit(1);
});
