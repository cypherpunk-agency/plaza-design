import { renderToStaticMarkup } from 'react-dom/server';
import { StaticLandingPage } from './StaticLandingPage';
import { ZONE_STYLES } from './game/zone/styles';
import { POPUP_STYLES } from './game/zone/popup';

export interface MetaConfig {
  title: string;
  description: string;
  ogImage: string;
  ogUrl: string;
}

/**
 * Renders the static landing page to HTML string
 */
export function renderStaticHTML(): string {
  return renderToStaticMarkup(<StaticLandingPage />);
}

/**
 * Returns default meta configuration for the demos
 */
export function getDefaultMeta(): MetaConfig {
  return {
    title: '[cypherpunk.agency]',
    description: 'INITIATING CONNECTION... PROTOCOL ONLINE. Decentralized social evolution. Node 42 active. Access granted.',
    ogImage: 'https://cypherpunk.agency/og-image.png',
    ogUrl: 'https://cypherpunk.agency/',
  };
}

/**
 * Demo-specific CSS styles (inline in both modular and single)
 */
export const demoStyles = `
    /* Demo-specific styles */
    .demo-window {
      position: fixed;
      inset: 34px;
      display: flex;
      flex-direction: column;
    }

    .demo-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 0 300px;
    }

    .demo-center {
      text-align: center;
      z-index: 10;
      pointer-events: none;
    }

    .demo-center * {
      pointer-events: auto;
    }

    .demo-title {
      font-size: clamp(44px, 7vw, 96px);
      margin-bottom: 1rem;
      line-height: 1.05;
    }

    /* The city is decoration: keep it well behind the content */
    #city-canvas {
      opacity: 0.6;
    }

    /* Solid fill so the label stays readable where the sun rises behind it */
    .demo-center .plaza-btn {
      background: var(--color-bg-base);
    }

    .demo-center .plaza-btn:hover {
      background:
        linear-gradient(rgba(var(--color-primary-500-rgb), 0.1), rgba(var(--color-primary-500-rgb), 0.1)),
        var(--color-bg-base);
    }

    /* ENTER looks live; trying it shows [ACCESS DENIED] for at least 2s and
       while the pointer rests on it. Both labels share one grid cell so the
       button keeps its width. */
    #cta {
      display: inline-grid;
      place-items: center;
    }

    .cta-label {
      grid-area: 1 / 1;
    }

    .cta-denied,
    #cta.is-denied .cta-enter {
      visibility: hidden;
    }

    #cta.is-denied .cta-denied {
      visibility: visible;
    }

    .demo-center #cta.is-denied {
      background: var(--color-bg-primary);
      color: var(--color-text-faint);
      border-color: var(--color-text-faint);
      box-shadow: none;
      text-shadow: none;
      cursor: not-allowed;
    }

    #cta.is-denied::before {
      opacity: 0;
    }

    /* The Konami code: the one time the button lets you in */
    .cta-granted,
    #cta.is-granted .cta-enter,
    #cta.is-granted .cta-denied {
      visibility: hidden;
    }

    #cta.is-granted .cta-granted {
      visibility: visible;
    }

    .demo-center #cta.is-granted {
      color: var(--color-success);
      border-color: var(--color-success);
      box-shadow: 0 0 20px rgba(var(--color-success-rgb), 0.5);
      text-shadow: 0 0 10px rgba(var(--color-success-rgb), 0.8);
    }

    /* CRT boot (game/boot.ts). Fades out on its own after 6s as a failsafe. */
    #crt-boot {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background: #000;
      animation: crt-failsafe 0.4s linear 6s forwards;
    }

    #crt-boot .crt-screen {
      width: min(720px, 92vw);
      transform: scale(1, 0.004);
      opacity: 0.9;
      box-shadow: 0 0 24px 4px rgba(255, 220, 180, 0.9);
      transition: transform 0.35s ease-out, box-shadow 0.35s;
    }

    #crt-boot.crt-on .crt-screen {
      transform: scale(1, 1);
      box-shadow: 0 0 40px rgba(var(--color-primary-500-rgb), 0.15);
    }

    #crt-boot.crt-off {
      opacity: 0;
      transition: opacity 0.35s 0.15s;
    }

    #crt-boot.crt-off .crt-screen {
      transform: scale(1, 0.004);
      transition: transform 0.2s ease-in;
    }

    .crt-text {
      min-height: 9em;
      margin: 0;
      padding: var(--spacing-6);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--color-text-body);
      text-shadow: 0 0 6px rgba(var(--color-primary-500-rgb), 0.7);
      background: repeating-linear-gradient(0deg, rgba(var(--color-primary-500-rgb), 0.05) 0 1px, transparent 1px 3px), #000;
      border: var(--border-thin) solid var(--color-border-muted);
    }

    @keyframes crt-failsafe {
      to { opacity: 0; visibility: hidden; }
    }

    @media (prefers-reduced-motion: reduce) {
      #crt-boot { display: none; }
    }

    /* ACCESS DENIED, the game (game/*.ts): it takes over the window */
    html.game-mode .demo-content,
    html.game-mode #particles,
    html.game-mode #city-canvas,
    html.game-mode .footer-not-auth {
      visibility: hidden;
    }

    html.game-mode .footer-not-auth {
      display: none;
    }

    html.game-mode #cta .cta-label {
      visibility: hidden;
    }

    #game-canvas {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      width: 100%;
      height: calc(100% - var(--game-top, 40px) - var(--game-bottom, 40px));
      z-index: 5;
      background: #000;
      image-rendering: pixelated;
      outline: none;
    }

    #term {
      position: absolute;
      left: 0;
      right: 0;
      bottom: var(--game-bottom, 40px);
      max-height: 42%;
      overflow-y: auto;
      z-index: 6;
      padding: var(--spacing-3) var(--spacing-4);
      background: rgba(4, 2, 0, 0.94);
      border-top: var(--border-thin) solid var(--color-border-default);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .term-line { white-space: pre-wrap; color: var(--color-text-body); }
    .term-in { color: var(--color-accent-400); }
    .term-ok { color: var(--color-success); }
    .term-err { color: var(--color-error); }
    .term-dim { color: var(--color-text-faint); }
    .term-head { color: var(--color-primary-400); }

    #term-input {
      display: none;
      flex: 1;
      min-width: 0;
      padding: 0 var(--spacing-2);
      background: transparent;
      border: 0;
      outline: none;
      font: inherit;
      font-size: var(--text-xs);
      color: var(--color-accent-400);
      caret-color: var(--color-accent-400);
    }

    #term-input::placeholder { color: var(--color-text-faint); }

    html.game-mode #term-input { display: block; }

    /* A zone's schematic overlay and panels (game/zone/) */
    #hack,
    .hack-panel {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 7;
      display: grid;
      grid-template-rows: auto auto 1fr;
      background: rgba(4, 2, 0, 0.9);
      font-family: var(--font-mono);
      user-select: none;
      -webkit-user-select: none;
    }

    #hack[hidden],
    .hack-panel[hidden] { display: none; }

    .hack-panel { z-index: 8; grid-template-rows: 1fr; background: rgba(0, 0, 0, 0.96); }

    .hack-bar {
      display: flex;
      gap: var(--spacing-2);
      align-items: center;
      flex-wrap: wrap;
      padding: var(--spacing-1) var(--spacing-3);
      border-bottom: var(--border-thin) solid var(--color-border-muted);
    }

    .hack-hint { flex-basis: 100%; font-size: 10px; color: var(--color-text-faint); }

    .hack-title {
      flex: 1;
      font-size: var(--text-xs);
      letter-spacing: 0.12em;
      color: rgb(255, 61, 242);
    }

    .hack-btn {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      padding: 2px var(--spacing-2);
      background: transparent;
      color: var(--color-text-muted);
      border: var(--border-thin) solid var(--color-border-default);
      cursor: pointer;
      touch-action: manipulation;
    }

    .hack-btn:hover { color: var(--color-accent-400); border-color: var(--color-accent-400); }

    .hack-status {
      min-height: 1.5em;
      padding: 2px var(--spacing-3);
      font-size: var(--text-xs);
      color: var(--color-text-body);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hack-status.ok { color: var(--color-success); }
    .hack-status.err { color: var(--color-error); }
    .hack-status.dim { color: var(--color-text-faint); }

    .hack-stage { position: relative; min-height: 0; overflow: hidden; touch-action: none; }

    .hack-wires { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .hack-wires path { fill: none; }
    .hack-wires .branch { stroke: rgba(255, 136, 0, 0.35); stroke-width: 1.5; }
    .hack-wires .cable { stroke: rgb(255, 136, 0); stroke-width: 3; filter: drop-shadow(0 0 3px rgb(255, 136, 0)); }
    .hack-wires .cable.live { stroke: var(--color-success); filter: drop-shadow(0 0 6px var(--color-success)); }
    .hack-wires .hit { stroke: transparent; stroke-width: 16; pointer-events: stroke; cursor: pointer; }
    .hack-wires .hit:hover + .cable { stroke: var(--color-error); filter: drop-shadow(0 0 4px var(--color-error)); }
    .hack-wires .temp { stroke: var(--color-text-body); stroke-width: 2; stroke-dasharray: 4 4; }
    .hack-wires .verb { fill: var(--color-success); font: 10px var(--font-mono); paint-order: stroke; stroke: #000; stroke-width: 3px; }

    .sch { position: absolute; width: 0; height: 0; }

    .sch-core {
      position: absolute;
      transform: translate(-50%, -50%);
      display: grid;
      justify-items: center;
      gap: 2px;
      padding: var(--spacing-1) var(--spacing-3);
      background: #0d0603;
      border: 2px solid rgb(255, 136, 0);
      box-shadow: 0 0 14px rgba(255, 136, 0, 0.15);
      cursor: grab;
      touch-action: none;
      z-index: 2;
    }

    .sch.crafted .sch-core { border-color: rgb(255, 61, 242); box-shadow: 0 0 14px rgba(255, 61, 242, 0.2); }
    .sch-name { font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.06em; color: rgb(255, 136, 0); white-space: nowrap; }
    .sch.crafted .sch-name { color: rgb(255, 61, 242); }
    .sch-st { font-size: 9px; color: var(--color-text-muted); white-space: nowrap; }

    .sch-noun { position: absolute; width: 0; height: 0; z-index: 3; touch-action: none; }

    .sch-label {
      position: absolute;
      transform: translate(-50%, -50%);
      display: grid;
      justify-items: center;
      padding: 3px var(--spacing-2);
      background: #0d0603;
      border: var(--border-thin) solid #5a2a0a;
      color: var(--color-text-body);
      font-size: 11px;
      line-height: 1.15;
      white-space: nowrap;
      cursor: pointer;
    }

    .sch-label small { font-size: 8px; letter-spacing: 0.1em; color: var(--color-text-faint); }
    .sch-label:hover,
    .sch-noun.open .sch-label { border-color: var(--color-accent-400); color: var(--color-accent-400); box-shadow: 0 0 10px rgba(0, 255, 255, 0.25); }
    .sch-noun.target .sch-label { border-style: dashed; border-color: rgb(255, 61, 242); }
    .sch-noun.choosing .sch-label { border-color: rgb(255, 61, 242); color: rgb(255, 61, 242); box-shadow: 0 0 12px rgba(255, 61, 242, 0.4); }

    .sch-noun .port {
      position: absolute;
      left: 0;
      top: 18px;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 0;
      background: transparent;
      border: 0;
      font-family: var(--font-mono);
      font-size: 9px;
      color: rgb(255, 136, 0);
      white-space: nowrap;
      cursor: crosshair;
      touch-action: none;
    }

    .sch-noun .port i { display: block; width: 11px; height: 11px; border-radius: 50%; border: 2px solid rgb(255, 136, 0); background: #000; }
    .sch-noun .port.armed i { background: rgb(255, 136, 0); box-shadow: 0 0 8px rgb(255, 136, 0); }

    .sch-verbs { position: absolute; display: flex; gap: 3px; }
    .sch-verbs.right { left: 52px; top: 0; transform: translateY(-50%); flex-direction: column; align-items: flex-start; }
    .sch-verbs.left { right: 52px; top: 0; transform: translateY(-50%); flex-direction: column; align-items: flex-end; }
    .sch-verbs.up { bottom: 22px; left: 0; transform: translateX(-50%); }
    .sch-verbs.down { top: 22px; left: 0; transform: translateX(-50%); }
    .sch-noun .port ~ .sch-verbs.down { top: 32px; }

    .sch-verb {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 2px 6px;
      background: #031416;
      color: var(--color-accent-400);
      border: var(--border-thin) solid #0d4a52;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
    }

    .sch-verb:hover { border-color: var(--color-accent-400); }
    .sch-verb.cur { background: #04140a; color: var(--color-success); border-color: var(--color-success); }
    .sch-verbs.choosing .sch-verb { background: #160416; color: rgb(255, 61, 242); border-color: rgb(255, 61, 242); }
    .sch-when { align-self: center; font-size: 9px; color: rgb(255, 61, 242); white-space: nowrap; }

    /* Logic parts on the board: the palette, and × on each part's core */
    .sch-palette {
      position: absolute;
      left: var(--spacing-2);
      bottom: var(--spacing-2);
      z-index: 4;
      display: flex;
      gap: var(--spacing-2);
      align-items: center;
      padding: var(--spacing-1) var(--spacing-2);
      background: #0d0603;
      border: var(--border-thin) dashed rgb(255, 61, 242);
      font-size: 9px;
      letter-spacing: 0.14em;
      color: var(--color-text-faint);
    }

    .sch-palette[hidden] { display: none; }
    .sch-palette .hack-btn { color: rgb(255, 61, 242); border-color: rgb(255, 61, 242); }
    /* a module you have not found yet: a dashed, empty slot */
    .sch-palette .hack-btn.missing { border-style: dashed; opacity: 0.45; cursor: not-allowed; }

    .sch-x {
      position: absolute;
      right: -9px;
      top: -9px;
      width: 18px;
      height: 18px;
      padding: 0;
      display: grid;
      place-items: center;
      background: #000;
      border: var(--border-thin) solid rgb(255, 61, 242);
      border-radius: 50%;
      color: rgb(255, 61, 242);
      font: 12px/1 var(--font-mono);
      cursor: pointer;
      touch-action: manipulation;
    }

    .sch-x:hover { background: rgb(255, 61, 242); color: #000; }

    /* The hacking layer (game/zone/schematic.ts): sealed ??? nouns, the keyring, a login's keyboard, trace, net silhouettes */
    .sch-noun.sealed .sch-label { border-style: dashed; border-color: rgba(255, 136, 0, 0.5); color: var(--color-text-faint); background: rgba(13, 6, 3, 0.6); }
    .sch-noun.sealed .sch-label:hover { border-color: rgb(255, 136, 0); color: rgb(255, 136, 0); box-shadow: none; }
    .sch-noun.sealed.target .sch-label { border-color: rgb(255, 210, 63); }
    .hack-wires .branch.sealed { stroke-dasharray: 3 4; }
    .sch-noun.seal .sch-label { border-color: rgb(255, 210, 63); }

    .sch-keyring {
      position: absolute;
      left: var(--spacing-2);
      top: var(--spacing-2);
      z-index: 4;
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-1);
      align-items: center;
      max-width: 70%;
      padding: var(--spacing-1) var(--spacing-2);
      background: #0d0603;
      border: var(--border-thin) dashed rgb(255, 210, 63);
      font-size: 9px;
      letter-spacing: 0.14em;
      color: var(--color-text-faint);
    }

    .sch-keyring[hidden] { display: none; }

    .sch-chip {
      position: relative;
      z-index: 1;
      padding: 1px 6px;
      background: #141003;
      border: var(--border-thin) solid rgb(255, 210, 63);
      border-radius: 8px;
      color: rgb(255, 210, 63);
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0;
      white-space: nowrap;
      cursor: grab;
      touch-action: none;
    }

    .sch-chip.key { border-radius: 2px; color: var(--color-accent-400); border-color: var(--color-accent-400); background: #031416; }
    .sch-chip.armed,
    .sch-chip.dragging { z-index: 6; box-shadow: 0 0 10px rgba(255, 210, 63, 0.6); }
    .sch-verb.try { color: rgb(255, 210, 63); border-color: #5a4a0a; background: #141003; }

    .sch-guess input {
      width: 13em;
      padding: 2px 6px;
      background: #000;
      color: var(--color-text-body);
      border: var(--border-thin) solid rgb(255, 210, 63);
      font-family: var(--font-mono);
      font-size: 10px;
    }

    .sch-trace { width: 100%; min-width: 56px; height: 4px; border: var(--border-thin) solid #5a0a14; background: #000; }
    .sch-trace i { display: block; width: 0; height: 100%; background: rgb(255, 136, 0); transition: width 0.25s linear; }
    .sch-trace.hot i { background: var(--color-error); box-shadow: 0 0 6px var(--color-error); }
    .vis-outline .sch-trace { position: absolute; left: 0; bottom: -7px; min-width: 0; }
    .sch.locked .sch-core { border-color: var(--color-error); }
    .sch.locked .sch-st { color: var(--color-error); }

    .sch.ghost .sch-core { border-style: dashed; border-color: rgba(255, 136, 0, 0.45); background: rgba(13, 6, 3, 0.5); box-shadow: none; }
    .sch.ghost .sch-name { color: rgba(255, 136, 0, 0.6); }
    .sch.node .sch-core { border-color: var(--color-accent-400); box-shadow: 0 0 14px rgba(0, 255, 255, 0.15); }
    .sch.node .sch-name { color: var(--color-accent-400); }

    /*
     * Hack vision (H): the board, living in the world. The game mutes the world on the canvas;
     * over it each device on screen gets a pink frame, and its schematic (the board's own core,
     * nouns, branches, dots and cables) stands over it, tied to the frame by a leader (game/zone/schematic.ts)
     */
    #vision {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 5;
      overflow: hidden;
      pointer-events: none;
      font-family: var(--font-mono);
      user-select: none;
      -webkit-user-select: none;
      background: repeating-linear-gradient(to bottom, rgba(255, 61, 242, 0.04) 0 1px, transparent 1px 3px);
    }

    #vision[hidden] { display: none; }
    #vision .hack-stage { position: absolute; inset: 0; touch-action: auto; }
    #vision .sch-core,
    #vision .sch-label,
    #vision .port,
    #vision .sch-verb,
    #vision .sch-guess,
    #vision .sch-palette,
    #vision .vis-part { pointer-events: auto; }
    #vision .hack-wires .leader { stroke: rgba(255, 61, 242, 0.85); stroke-width: 1; stroke-dasharray: 3 3; }

    /* the frame round a device: the hacking layer's pink */
    .vis-outline {
      position: absolute;
      transform: translate(-50%, -50%);
      border: var(--border-thin) solid rgba(255, 61, 242, 0.85);
      box-shadow: 0 0 8px rgba(255, 61, 242, 0.35), inset 0 0 8px rgba(255, 61, 242, 0.12);
    }

    /* a logic part floating in the world: its body is this small module (drag it) */
    .vis-part {
      display: grid;
      place-items: center;
      background: rgba(22, 4, 22, 0.92);
      cursor: grab;
      touch-action: none;
    }

    .vis-glyph { font-size: 8px; font-weight: 600; letter-spacing: 0.08em; color: rgb(255, 61, 242); }
    .vis-part .sch-x { right: -8px; top: -8px; width: 15px; height: 15px; font-size: 10px; }

    /* the board's look, a size smaller: it stands in the world, next to the things it belongs to */
    #vision .sch-core { padding: 2px var(--spacing-2); }
    #vision .sch-name { font-size: 10px; }
    #vision .sch-st { font-size: 8px; }
    #vision .sch-label { padding: 2px 6px; font-size: 10px; }
    #vision .sch-label small { font-size: 7px; }
    #vision .sch-verb { padding: 1px 5px; font-size: 9px; }
    /* nouns stand close in the world: the one whose verbs are open sits over its neighbours */
    #vision .sch-noun.open { z-index: 5; }
    /* a folded device: just its core (tap it for its nouns) */
    .sch.vis.folded .sch-core { border-style: dashed; }
    /* hack it, from a thing's popup: its core flashes so the eye finds it */
    #vision .sch-core.focus { animation: vis-focus 0.45s ease-in-out 3; }
    @keyframes vis-focus { 50% { box-shadow: 0 0 16px rgb(255, 61, 242), 0 0 4px #fff; } }

    /* hack vision's tools: the logic palette and the unfold-all toggle, under HACK and BOARD */
    #vision .sch-palette { left: auto; bottom: auto; right: var(--spacing-3); top: calc(var(--spacing-2) + 30px); }
    #vision .vis-all { color: var(--color-text-muted); border-color: var(--color-border-default); }
    #vision .vis-all.on { color: #000; background: rgb(255, 61, 242); border-color: rgb(255, 61, 242); }

    #vision .hack-status {
      position: absolute;
      left: 50%;
      bottom: var(--spacing-2);
      transform: translateX(-50%);
      max-width: 92%;
      background: rgba(0, 0, 0, 0.78);
      border: var(--border-thin) solid rgba(255, 61, 242, 0.5);
    }

    html.touch #vision .hack-status { bottom: 56px; max-width: 70%; }

    /* HACK and BOARD over the canvas, in a zone on the hacking system (game/zone/host.ts) */
    /* The key bar: every key and what it does (game/keybar.ts); the zone's HACK/BOARD join it */
    #key-bar {
      position: absolute;
      top: calc(var(--game-top, 40px) + var(--spacing-2));
      left: var(--spacing-3);
      right: var(--spacing-3);
      z-index: 6;
      display: none;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-2);
      pointer-events: none;
      font-family: var(--font-mono);
    }

    html.game-mode #key-bar { display: flex; }
    html.game-mode.cutscene #key-bar,
    html.game-mode.game-menu #key-bar { display: none; }
    #key-bar .kb-moves,
    #key-bar .kb-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-2); align-items: center; }
    #key-bar .kb-actions { justify-content: flex-end; pointer-events: auto; }
    #key-bar .kb-hint { font-size: 10px; color: rgba(255, 217, 165, 0.75); background: rgba(0, 0, 0, 0.55); padding: 1px 5px; }
    #key-bar .kb-hint[hidden] { display: none; }
    #key-bar kbd { font: inherit; color: var(--color-accent-400); border: var(--border-thin) solid #0d4a52; padding: 0 3px; margin-right: 2px; }
    #key-bar .hack-btn { background: rgba(0, 0, 0, 0.65); }
    #key-bar .hack-btn.on { color: var(--color-success); border-color: var(--color-success); }
    #key-bar #zone-btns { position: static; }
    #key-bar #zone-btns .hack-btn.on { color: #000; background: rgb(255, 61, 242); border-color: rgb(255, 61, 242); }
    html.touch #key-bar .kb-moves { display: none; }

    #zone-btns {
      position: absolute;
      top: calc(var(--game-top, 40px) + var(--spacing-2));
      right: var(--spacing-3);
      z-index: 5;
      display: flex;
      gap: var(--spacing-2);
    }

    #zone-btns[hidden],
    html:not(.game-mode) #zone-btns { display: none; }
    #zone-btns .hack-btn { background: rgba(0, 0, 0, 0.65); }
    #zone-btns .hack-btn.on { color: #000; background: rgb(255, 61, 242); border-color: rgb(255, 61, 242); }
    #zone-btns .hack-btn:disabled { opacity: 0.4; cursor: default; color: var(--color-text-muted); border-color: var(--color-border-default); }
    html.touch #zone-btns .hack-btn { padding: var(--spacing-1) var(--spacing-3); }

    .hack-panel-body { position: relative; min-height: 0; padding: var(--spacing-3); display: grid; }
    .hack-panel-close { position: absolute; right: var(--spacing-2); top: var(--spacing-2); z-index: 2; }

    .hack-panel-body.cam { padding: 0; }
    .cam-feed { width: 100%; height: 100%; display: block; }
    .cam-btns { position: absolute; right: var(--spacing-2); top: 50%; transform: translateY(-50%); display: grid; gap: var(--spacing-2); }

    .hack-panel-body.dlg { align-content: end; }
    .dlg-box { display: grid; gap: var(--spacing-2); max-width: 640px; padding: var(--spacing-2) var(--spacing-3); background: #000; border: 2px solid #fff; }
    .dlg-name { font-size: var(--text-xs); letter-spacing: 0.12em; color: rgb(255, 136, 0); }
    .dlg-text { margin: 0; font-size: var(--text-sm); color: #fff; }
    .dlg-choices { display: grid; gap: 2px; }
    .dlg-choice { text-align: left; padding: 2px 0; background: transparent; border: 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-accent-400); cursor: pointer; }
    .dlg-choice::before { content: '> '; color: var(--color-text-faint); }
    .dlg-kb { color: var(--color-text-faint); }
    .dlg-input { width: 100%; padding: 3px 6px; background: #000; color: var(--color-text-body); border: var(--border-thin) solid var(--color-border-default); font-family: var(--font-mono); font-size: var(--text-xs); }

    /* The zone engine's newer pieces: watchdog, conduits, meters, keyring, lock toys (game/zone/styles.ts) */
${ZONE_STYLES}
${POPUP_STYLES}


    /* ACCESS DENIED pause menu (game/menu.ts): a black CRT panel over the paused game */
    #game-menu {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 8;
      display: grid;
      place-items: center;
      padding: var(--spacing-2);
      background: rgba(0, 0, 0, 0.55);
      font-family: var(--font-mono);
    }

    #game-menu[hidden],
    html:not(.game-mode) #game-menu { display: none; }
    html.game-menu #touch,
    html.game-menu #yard-btns { display: none; }

    #game-menu .gm-crt {
      position: relative;
      width: min(460px, 100%);
      max-height: 100%;
      overflow: auto;
      padding: var(--spacing-4) var(--spacing-5);
      background: #000;
      border: 2px solid rgba(255, 136, 0, 0.75);
      box-shadow: 0 0 0 4px #000, 0 0 0 5px rgba(255, 136, 0, 0.25), 0 0 32px rgba(255, 136, 0, 0.25), inset 0 0 40px rgba(255, 136, 0, 0.08);
    }

    /* Scanlines and a faint vignette over the whole panel */
    #game-menu .gm-crt::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 3px),
        radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55));
    }

    #game-menu.gm-on .gm-crt { animation: gm-power 0.28s ease-out; }

    @keyframes gm-power {
      0% { transform: scale(1, 0.01); filter: brightness(3); }
      60% { transform: scale(1, 1.02); filter: brightness(1.4); }
      100% { transform: scale(1, 1); filter: none; }
    }

    #game-menu .gm-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: rgb(255, 136, 0);
      text-shadow: 0 0 8px rgba(255, 136, 0, 0.8), 2px 0 0 rgba(255, 61, 61, 0.35);
    }

    #game-menu .gm-sub {
      margin: 2px 0 var(--spacing-3);
      font-size: 10px;
      letter-spacing: 0.14em;
      color: rgba(255, 217, 165, 0.6);
    }

    #game-menu .gm-sub.gm-ask { font-size: 11px; letter-spacing: 0.06em; }
    #game-menu .gm-sub.gm-bad { color: rgb(255, 90, 110); }
    #game-menu .gm-sub.gm-go { color: rgb(0, 255, 255); }
    #game-menu .gm-list { display: grid; gap: 2px; }

    #game-menu .gm-item {
      display: grid;
      grid-template-columns: 1.4em 1fr;
      align-items: baseline;
      width: 100%;
      padding: 3px var(--spacing-2) 3px 0;
      text-align: left;
      background: transparent;
      border: 0;
      outline: 0;
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(0, 255, 255, 0.72);
      cursor: pointer;
      touch-action: manipulation;
    }

    #game-menu .gm-item::before { content: ''; grid-row: 1 / span 2; text-align: center; }
    #game-menu .gm-item.sel { color: rgb(0, 255, 255); background: rgba(0, 255, 255, 0.1); text-shadow: 0 0 6px rgba(0, 255, 255, 0.7); }
    #game-menu .gm-item.sel::before { content: '>'; animation: gm-blink 1s steps(1) infinite; }

    #game-menu .gm-item.sel .gm-label::after {
      content: '';
      display: inline-block;
      width: 0.55em;
      height: 0.95em;
      margin-left: 6px;
      vertical-align: -2px;
      background: currentColor;
      animation: gm-blink 1s steps(1) infinite;
    }

    #game-menu .gm-meta {
      grid-column: 2;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: rgba(255, 217, 165, 0.65);
      text-shadow: none;
    }

    #game-menu .gm-item .gm-label + .gm-meta { margin-top: 1px; }
    #game-menu .gm-item.gm-bad { color: rgba(255, 90, 110, 0.75); }
    #game-menu .gm-item.gm-bad.sel { color: rgb(255, 90, 110); background: rgba(255, 90, 110, 0.12); text-shadow: 0 0 6px rgba(255, 90, 110, 0.7); }
    #game-menu .gm-item.gm-ok { color: rgba(34, 197, 94, 0.8); }
    #game-menu .gm-item.gm-ok.sel { color: rgb(34, 197, 94); background: rgba(34, 197, 94, 0.12); text-shadow: 0 0 6px rgba(34, 197, 94, 0.7); }
    #game-menu .gm-item.gm-dim { color: rgba(255, 217, 165, 0.35); }
    #game-menu .gm-item.gm-dim.sel { color: rgba(255, 217, 165, 0.55); background: rgba(255, 217, 165, 0.06); text-shadow: none; }

    #game-menu .gm-msg {
      min-height: 1.5em;
      margin: var(--spacing-3) 0 0;
      font-size: 11px;
      letter-spacing: 0.06em;
    }

    #game-menu .gm-msg.gm-ok { color: rgb(34, 197, 94); }
    #game-menu .gm-msg.gm-bad { color: rgb(255, 90, 110); }
    #game-menu .gm-msg.gm-go { color: rgb(0, 255, 255); }
    #game-menu .gm-msg.gm-dim { color: rgba(255, 217, 165, 0.6); }

    #game-menu .gm-keys {
      margin-top: var(--spacing-1);
      font-size: 9px;
      letter-spacing: 0.12em;
      color: rgba(255, 217, 165, 0.4);
    }

    @keyframes gm-blink { 50% { opacity: 0; } }

    /* Phones in landscape: a short screen, so a tighter panel */
    html.touch #game-menu .gm-crt { padding: var(--spacing-2) var(--spacing-4); }
    html.touch #game-menu .gm-title { font-size: 16px; }
    html.touch #game-menu .gm-sub { margin-bottom: var(--spacing-1); }
    html.touch #game-menu .gm-item { padding-top: 5px; padding-bottom: 5px; font-size: 13px; }

    @media (prefers-reduced-motion: reduce) {
      #game-menu.gm-on .gm-crt { animation: none; }
      #game-menu .gm-item.sel::before,
      #game-menu .gm-item.sel .gm-label::after { animation: none; }
    }

    /* Phones: basic support, landscape only (game/index.ts) */
    #touch {
      display: none;
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(var(--game-bottom, 40px) + var(--spacing-1));
      z-index: 7;
      justify-content: space-between;
      padding: 0 var(--spacing-3);
      pointer-events: none;
    }

    html.game-mode.touch #touch { display: flex; }
    html.game-mode.cutscene #touch { display: none; }

    /* On a phone the game gets the whole screen: no window inset, slim header and footer */
    html.game-mode.touch .demo-window { inset: 0; }
    html.game-mode.touch .plaza-corner-bracket { display: none; }
    html.game-mode.touch .plaza-window-header,
    html.game-mode.touch .plaza-window-footer { padding: var(--spacing-1) var(--spacing-3); min-height: 0; }
    html.game-mode.touch .plaza-window-header *,
    html.game-mode.touch .plaza-window-footer * { font-size: var(--text-xs); }
    html.game-mode.touch .footer-send-btn { padding: 2px var(--spacing-2); }
    html.game-mode.touch #term:not([hidden]) ~ #touch { display: none; }

    #touch .pad {
      display: flex;
      gap: var(--spacing-2);
      pointer-events: auto;
    }

    #touch button {
      width: 44px;
      height: 44px;
      padding: 0;
      border: var(--border-medium) solid var(--color-border-strong);
      background: rgba(var(--color-bg-overlay-rgb), 0.35);
      color: var(--color-primary-400);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 600;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    #touch button.small {
      width: 38px;
      border-width: var(--border-thin);
      color: var(--color-text-muted);
    }

    #touch button.down { background: rgba(var(--color-primary-500-rgb), 0.3); }

    #rotate {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9000;
      place-items: center;
      padding: var(--spacing-6);
      background: #000;
      text-align: center;
      font-family: var(--font-mono);
    }

    .rotate-title {
      font-size: var(--text-lg);
      letter-spacing: var(--letter-spacing-widest);
      color: var(--color-primary-400);
    }

    .rotate-note {
      margin-top: var(--spacing-2);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    @media (orientation: portrait) {
      html.game-mode.touch #rotate { display: grid; }
    }

    /* The handheld deck: the terminal on touch screens (game/terminal.ts) */
    #term[hidden],
    .deck-keys[hidden] { display: none; }

    #term.deck {
      top: var(--game-top, 40px);
      max-height: none;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
      overflow: hidden;
      padding: var(--spacing-2) var(--spacing-3);
      border-top: 0;
    }

    #term.deck .term-out {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    #term.deck.deck-typing .term-out { min-height: 2.6em; }
    #term.deck.deck-typing { gap: var(--spacing-1); }
    /* the deck sets display: flex, which would beat [hidden] and cover the game */
    #term.deck[hidden] { display: none; }

    .deck-line {
      min-height: 1.6em;
      padding-top: var(--spacing-1);
      border-top: var(--border-thin) solid var(--color-border-muted);
      white-space: pre;
      overflow-x: auto;
      font-size: var(--text-sm);
      color: var(--color-accent-400);
    }

    .deck-line::after {
      content: '\\2588';
      animation: deck-blink 1s steps(1) infinite;
    }

    @keyframes deck-blink { 50% { opacity: 0; } }

    /* One row: suggestions scroll sideways, the tools stay pinned on the right */
    .deck-chips {
      flex-shrink: 0;
      display: flex;
      gap: var(--spacing-2);
      align-items: center;
    }

    .deck-suggest {
      flex: 1;
      min-width: 0;
      display: flex;
      gap: var(--spacing-2);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .deck-tools {
      flex-shrink: 0;
      display: flex;
      gap: var(--spacing-2);
    }

    .deck-line { flex-shrink: 0; }

    .deck-chip,
    .deck-key {
      font-family: var(--font-mono);
      background: transparent;
      border: var(--border-thin) solid var(--color-border-default);
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }

    .deck-chip {
      flex-shrink: 0;
      padding: var(--spacing-1) var(--spacing-3);
      min-height: 28px;
      font-size: var(--text-xs);
      color: var(--color-accent-400);
    }

    .deck-run { color: var(--color-success); border-color: var(--color-success); }
    .deck-close { color: var(--color-text-muted); }

    .deck-keys {
      flex-shrink: 0;
      display: grid;
      gap: var(--spacing-1);
    }

    .deck-row {
      display: flex;
      gap: var(--spacing-1);
    }

    .deck-key {
      flex: 1;
      min-width: 0;
      height: clamp(22px, 6.5vh, 40px);
      padding: 0;
      font-size: var(--text-sm);
      color: var(--color-text-body);
      background: rgba(var(--color-bg-overlay-rgb), 0.6);
    }

    .deck-wide { flex: 1.6; font-size: var(--text-xs); }
    .deck-space { flex: 4; font-size: var(--text-xs); }
    .deck-shift.on { color: var(--color-accent-400); border-color: var(--color-accent-400); }
    .deck-key.deck-run { color: var(--color-success); border-color: var(--color-success); }

    .demo-subtitle {
      font-size: clamp(12px, 1.6vw, 18px);
      color: var(--color-accent-400);
      text-shadow:
        0 0 10px rgba(0, 255, 255, 0.6),
        0 0 20px rgba(0, 255, 255, 0.4);
    }

    @media (max-width: 980px) {
      .plaza-side-panel {
        display: none;
      }

      .demo-content {
        padding: 0 28px;
      }

      .demo-window {
        inset: 18px;
      }

      /* 19 characters must fit the window on a phone */
      .demo-title {
        font-size: calc(8vw - 8px);
      }
    }

    .header-online {
      margin-left: 10px;
    }

    @media (max-width: 640px) {
      .header-initiating {
        display: none;
      }

      .header-online {
        margin-left: 0;
      }

      .demo-center .plaza-btn {
        padding: var(--spacing-3) var(--spacing-5);
        letter-spacing: var(--letter-spacing-wider);
        white-space: nowrap;
      }
    }
`;

/**
 * JavaScript initialization code for the demos
 */
export const initScript = `
    // The CRT boot is the first thing every visitor sees.
    runBoot();

    const PROJECTS = [
      { label: '/frontier', href: 'https://frontier.cypherpunk.agency/' },
      { label: '/sol-economy', href: 'https://sol-economy.cypherpunk.agency/' },
      { label: '/orbis', href: 'https://orbis.cypherpunk.agency/' },
    ];
    // Initialize theme
    initPlazaTheme();

    // Start clock
    startClock('clock', 'full');

    // City scene: skyline, antenna, beacons, reflective floor
    const scene = initCityScene('city-canvas', {
      beacons: PROJECTS,
      anchor: '#cta',
      ceiling: '.plaza-window-header',
      mask: '.plaza-window-header, .plaza-window-footer, .plaza-side-panel__block, .plaza-hex-scroll, #title, .demo-subtitle, #cta',
    });
    scene.start();

    // ACCESS DENIED: the Konami code turns the window into the game.
    initAccessDenied({ scene });

    // Create particles (canonical count: 50)
    createParticles('particles', 50);

    // Render left side gimmicks
    renderTelemetry('telemetry');
    renderRoutes('routes', PROJECTS);
    // Hovering a route lights its beacon on the skyline
    document.querySelectorAll('#routes .route-link').forEach((a) => {
      a.addEventListener('mouseenter', () => scene.highlight(a.textContent));
      a.addEventListener('mouseleave', () => scene.highlight(null));
    });
    renderKeys('keys');

    // Render right side gimmicks
    renderNetLog('netlog');
    renderStatus('status');

    // Start hex scrolls
    startHexScroll('hex-left', 2500);
    startHexScroll('hex-right', 2500);

    // Update dynamic data periodically
    setInterval(() => renderTelemetry('telemetry'), 5000);
    setInterval(() => renderNetLog('netlog'), 3000);

    // Update node count with drift
    updateNodeCount('node-count');
    setInterval(() => { if (!document.documentElement.classList.contains('game-mode')) updateNodeCount('node-count'); }, 8000);

    // ENTER is a tease: trying it shows [ACCESS DENIED] for at least 2 seconds
    // and for as long as the pointer rests on the button.
    const cta = document.getElementById('cta');
    let deniedAt = 0, ctaHover = false, ctaTimer = 0;
    function setDenied(on) {
      cta.classList.toggle('is-denied', on);
      cta.querySelector('.cta-enter').setAttribute('aria-hidden', String(on));
      cta.querySelector('.cta-denied').setAttribute('aria-hidden', String(!on));
    }
    function releaseLater() {
      clearTimeout(ctaTimer);
      ctaTimer = setTimeout(() => { if (!ctaHover) setDenied(false); }, Math.max(0, 2000 - (Date.now() - deniedAt)));
    }
    function deny() { deniedAt = Date.now(); setDenied(true); releaseLater(); }
    cta.addEventListener('click', deny);
    cta.addEventListener('pointerenter', () => { ctaHover = true; });
    cta.addEventListener('pointerleave', () => { ctaHover = false; if (cta.classList.contains('is-denied')) releaseLater(); });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.documentElement.classList.contains('game-mode')) return;
      if (e.key === 'Enter') {
        handleEnter();
      } else if (e.key.toLowerCase() === 't') {
        toggleTheme();
      }
    });

    // Flash effect on enter
    function handleEnter() {
      if (document.activeElement !== cta) deny();
      const title = document.getElementById('title');
      title.style.transform = 'scale(1.02)';
      title.style.filter = 'brightness(1.3)';
      setTimeout(() => {
        title.style.transform = '';
        title.style.filter = '';
      }, 200);
      // Refresh telemetry for visual feedback
      renderTelemetry('telemetry');
      renderNetLog('netlog');
    }

    // Evolution text hover effect - glitch once then revert
    const evolutionEl = document.getElementById('evolution-word');
    let evolutionTimeout = null;
    evolutionEl.addEventListener('mouseenter', () => {
      if (evolutionTimeout) return; // Already glitching
      evolutionEl.classList.add('glitching');
      evolutionTimeout = setTimeout(() => {
        evolutionEl.classList.remove('glitching');
        evolutionTimeout = null;
      }, 400);
    });
`;
