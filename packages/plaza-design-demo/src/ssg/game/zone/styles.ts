/**
 * Styles for the zone engine's newer pieces, kept apart from render.tsx so
 * they merge on their own: the watchdog (sprite, badge, frozen devices),
 * fixed cables (conduits), the trace / lockout meter's words, the keyring's
 * place and its × on made fragments, card chips, and the lock toys' panels.
 * render.tsx inlines this string after the schematic's own styles.
 *
 * Colours follow ART-GUIDE.md §6: pink is the hacking layer, cyan what you
 * can use, green open, red denied and the Registry, warm white what you read.
 */

export const ZONE_STYLES = `
    /* The keyring: bottom right of the stage, clear of the devices (the palette sits bottom left) */
    .sch-keyring { top: auto; left: auto; right: var(--spacing-2); bottom: var(--spacing-2); max-width: 58%; justify-content: flex-end; }
    .sch-chip.card { border-radius: 2px; border-style: double; border-width: 3px; padding: 0 5px; color: rgb(255, 61, 242); border-color: rgb(255, 61, 242); background: #140414; }
    .sch-chip-x {
      margin-left: -6px;
      width: 15px;
      height: 15px;
      padding: 0;
      display: grid;
      place-items: center;
      background: #000;
      border: var(--border-thin) solid rgb(255, 210, 63);
      border-radius: 50%;
      color: rgb(255, 210, 63);
      font-size: 10px; line-height: 1; font-family: var(--font-mono);
      cursor: pointer;
      touch-action: manipulation;
    }
    .sch-chip-x:hover { background: var(--color-error); border-color: var(--color-error); color: #000; }

    /* Trace and lockouts: the meter says its number, a lockout is a red countdown */
    .sch-trace { position: relative; height: 12px; min-width: 76px; }
    .sch-trace i { position: absolute; left: 0; top: 0; bottom: 0; }
    .sch-trace b { position: relative; display: block; font-weight: 600; font-size: 8px; line-height: 10px; font-family: var(--font-mono); letter-spacing: 0.08em; text-align: center; color: var(--color-text-body); text-shadow: 0 0 3px #000, 0 0 2px #000; }
    .sch-trace.hot { animation: sch-hot 0.8s steps(2) infinite; }
    .sch-trace.lock { border-color: var(--color-error); }
    .sch-trace.lock i { background: repeating-linear-gradient(135deg, var(--color-error) 0 4px, #5a0a14 4px 8px); transition: width 0.25s linear; }
    .sch-trace.lock b { color: #fff; }
    @keyframes sch-hot { 50% { border-color: var(--color-error); box-shadow: 0 0 8px var(--color-error); } }
    .vis-outline .sch-trace { bottom: -16px; min-width: 76px; }
    .sch.locked .sch-core { box-shadow: 0 0 14px rgba(255, 64, 96, 0.35); background: repeating-linear-gradient(135deg, #1a0306 0 6px, #0d0603 6px 12px); }

    /* A noun with more than one event (the watchdog's arrives / leaves): its ports stack instead of piling up */
    .sch-noun > .port:nth-of-type(2) { top: 32px; }
    .sch-noun > .port:nth-of-type(3) { top: 46px; }
    .sch-noun > .port:nth-of-type(2) ~ .sch-verbs.down { top: 46px; }
    .sch-noun > .port:nth-of-type(3) ~ .sch-verbs.down { top: 60px; }
    #vision .sch-noun > .port:nth-of-type(2) { top: 23px; }
    #vision .sch-noun > .port:nth-of-type(3) { top: 34px; }

    /* Fixed cables: a solid conduit you cannot cut */
    .hack-wires .conduit { stroke: #3a2a1a; stroke-width: 9; stroke-linecap: round; }
    .hack-wires .cable.fixed { stroke: rgb(255, 176, 80); stroke-width: 2.5; stroke-dasharray: none; filter: none; }
    .hack-wires .hit:hover + .cable.fixed { stroke: rgb(255, 176, 80); filter: none; }

    /* The watchdog: a red dog on the device it freezes, the seconds until it moves */
    .wd-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
    .wd { position: absolute; transform: translate(-70%, -100%); display: grid; justify-items: center; transition: left 0.25s linear, top 0.25s linear; }
    #vision .wd { transform: translate(-50%, -100%); }
    .wd[hidden] { display: none; }
    .wd-dog { width: 26px; height: 17px; shape-rendering: crispEdges; filter: drop-shadow(0 0 4px rgba(255, 64, 96, 0.8)); }
    .wd.flip .wd-dog { transform: scaleX(-1); }
    .wd-dog .fur { fill: rgb(255, 64, 96); }
    .wd-dog .eye { fill: #fff; }
    .wd.walk .wd-dog { animation: wd-trot 0.3s steps(2) infinite; }
    .wd:not(.walk) .wd-dog { animation: wd-sniff 1.6s steps(2) infinite; }
    @keyframes wd-trot { 50% { transform: translateY(-2px); } }
    @keyframes wd-sniff { 50% { transform: translateX(1px); } }
    .wd.flip.walk .wd-dog { animation-name: wd-trot-flip; }
    @keyframes wd-trot-flip { 0%, 100% { transform: scaleX(-1); } 50% { transform: scaleX(-1) translateY(-2px); } }
    .wd-t { font-weight: 600; font-size: 8px; line-height: 1; font-family: var(--font-mono); color: rgb(255, 64, 96); background: #000; padding: 1px 3px; border: var(--border-thin) solid rgb(255, 64, 96); }
    .wd-badge {
      position: absolute;
      right: var(--spacing-2);
      top: var(--spacing-2);
      max-width: 60%;
      padding: 2px var(--spacing-2);
      background: #0d0306;
      border: var(--border-thin) solid rgb(255, 64, 96);
      font-size: 9px; line-height: 1.4; font-family: var(--font-mono);
      letter-spacing: 0.08em;
      color: rgb(255, 64, 96);
    }
    .sch.frozen .sch-core { border-color: rgb(255, 64, 96); border-style: dashed; box-shadow: 0 0 16px rgba(255, 64, 96, 0.35); }
    .sch.frozen .sch-st { color: rgb(255, 64, 96); }
    .sch.frozen .sch-label,
    .sch.frozen .sch-verb { opacity: 0.45; }
    #vision .sch.frozen .vis-outline { border-color: rgb(255, 64, 96); box-shadow: 0 0 12px rgba(255, 64, 96, 0.5), inset 0 0 14px rgba(255, 64, 96, 0.25); }

    /* Lock toys (zone/toys/): one full-screen panel per lock type */
    .hack-panel-body.toy { place-items: center; }
    .toy-wrap { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: var(--spacing-2); width: min(100%, 560px); height: 100%; max-height: 520px; padding: var(--spacing-2) var(--spacing-3); border: 2px solid rgb(255, 61, 242); background: #07020a; box-shadow: 0 0 22px rgba(255, 61, 242, 0.25); }
    .toy-head { display: flex; gap: var(--spacing-3); align-items: baseline; padding-right: 64px; }
    .toy-title { font-size: var(--text-xs); letter-spacing: 0.16em; color: rgb(255, 61, 242); }
    .toy-where { font-size: 10px; color: var(--color-text-faint); }
    .toy-area { position: relative; min-height: 150px; display: grid; grid-template-rows: minmax(0, 1fr); }
    .toy-canvas { width: 100%; height: 100%; min-height: 150px; display: block; touch-action: none; cursor: pointer; }
    .toy-status { min-height: 1.4em; font-size: var(--text-xs); color: var(--color-text-muted); }
    .toy-status.ok { color: var(--color-success); }
    .toy-status.err { color: var(--color-error); }
    .toy-controls { display: flex; flex-wrap: wrap; gap: var(--spacing-2); justify-content: center; }
    .toy-btn { min-width: 40px; min-height: 32px; color: var(--color-accent-400); border-color: #0d4a52; background: #031416; }
    .toy-btn.primary { border-color: var(--color-accent-400); font-weight: 600; letter-spacing: 0.1em; }
    .toy-btn.card { color: rgb(255, 61, 242); border-color: rgb(255, 61, 242); border-style: double; border-width: 3px; background: #140414; }
    .toy-btn:disabled { opacity: 0.35; cursor: default; }
    .toy-btn.tap { min-width: 88px; min-height: 44px; touch-action: none; }
    .toy-btn.tap.down { background: var(--color-accent-400); color: #000; }
    .toy-lens { position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%); max-width: 96%; padding: 3px var(--spacing-2); background: #000; border: var(--border-thin) solid rgb(255, 61, 242); font-size: var(--text-sm); letter-spacing: 0.12em; color: rgb(255, 236, 210); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .toy-lens.morse { font-size: var(--text-xs); color: var(--color-accent-400); }
    .toy-stamp { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-6deg); padding: 4px var(--spacing-3); border: 3px solid currentColor; font-size: var(--text-lg, 18px); font-weight: 700; letter-spacing: 0.3em; background: rgba(0, 0, 0, 0.8); }
    .toy-wrap.ok { border-color: var(--color-success); }
    .toy-wrap.ok .toy-stamp { color: var(--color-success); }
    .toy-wrap.err { border-color: var(--color-error); }
    .toy-wrap.err .toy-stamp { color: var(--color-error); }

    /* The cryptex: one column per ring, the middle letter is the one that counts */
    .cx { display: flex; gap: var(--spacing-2); justify-content: center; align-items: center; }
    .cx-ring { display: grid; justify-items: center; gap: 4px; }
    .cx-turn { width: 40px; height: 28px; padding: 0; background: #031416; color: var(--color-accent-400); border: var(--border-thin) solid #0d4a52; font-size: 11px; line-height: 1; font-family: var(--font-mono); cursor: pointer; touch-action: manipulation; }
    .cx-turn:hover { border-color: var(--color-accent-400); }
    .cx-win { display: grid; justify-items: center; width: 40px; padding: 2px 0; background: linear-gradient(#000, #1a1208 30%, #2a1d0d 50%, #1a1208 70%, #000); border: 2px solid rgb(255, 136, 0); cursor: ns-resize; touch-action: none; }
    .cx-near { font-size: 12px; line-height: 1.3; font-family: var(--font-mono); color: rgba(255, 236, 210, 0.3); }
    .cx-cur { font-weight: 700; font-size: 22px; line-height: 1.2; font-family: var(--font-mono); color: rgb(255, 236, 210); }
    .cx-ring.sel .cx-win { border-color: rgb(255, 61, 242); box-shadow: 0 0 10px rgba(255, 61, 242, 0.45); }
    @media (max-width: 480px) { .cx-turn, .cx-win { width: 32px; } .cx-cur { font-size: 18px; } }
`;
