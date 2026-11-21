# Current game tests

Run from packages/plaza-design-demo:

```sh
pnpm test:game --list
pnpm test:game conversation
pnpm test:game scene-batch common-state-owner
pnpm test:game
```

Selectors match filenames; multiple selectors form a union. With no selectors, all current checks
run in separate processes with three workers. Imported prerequisite checks execute through their
integration check, so the default does not schedule them twice. Checks use isolated scratch source stores. Logs and
results are disposable under repository-root `.game-test-output/`. No captured older engine,
previous report, Git revision, acceptance hash or output from an earlier run is required.
Filesystem security tests need permission to create temporary junctions on Windows.

## Browser pixels

```sh
pnpm test:game:visuals              # headless compare, exits 1 on any difference
pnpm test:game:visuals --accept     # replace this platform's approved images
pnpm test:game:visuals --serve      # old manual mode: print a URL to open in your own browser
pnpm test:game:visuals --intro-only # intro raster lifecycle checks only
```

It starts its own headless Chrome (installed Chrome or Chromium; set `CHROME_PATH` if it is not
found), renders every registered scene composition plus four night/rain views and one
reduced-motion/hack view at 640x360 with the bundled IBM Plex Mono fonts, compares them with the
approved PNGs, and prints `COMPARE 60/60` (the 24 views plus 36 sky-group checks). A run takes
a few seconds. Failed views are listed with their differing pixel count and bounds, and their
rendered pixels are written to `.game-test-output/visuals/actual/` next to `results.json`.

Pixel equality is strict. Text and curve antialiasing differ between operating systems (the same
scene differs by a few thousand edge pixels between Windows and Linux), so approved images are
kept per platform under `fixtures/visuals/<platform>/` (`linux`, `win32`, `darwin`;
`GAME_VISUAL_PLATFORM` overrides). Headless rendering on one machine is deterministic.
`linux/` was accepted headless; `win32/` holds the older images accepted in a headed browser
and may need one `--accept` on Windows after confirming that any differences are antialiasing only.

For an intentional appearance change, inspect the change (`--serve`, or the `actual/` PNGs) and
run `--accept` on each platform you use, then review the image changes in Git. Do not accept a
failed image merely to make a check green. Expectations are current approved rendering, not an
executable older renderer.

Rendering command/order, lighting isolation, layers, animation and saved pending source are also
covered by contract checks. Pixel snapshots do not establish campaign playability or UX appeal.

## Coverage map

| Area | Current checks |
| --- | --- |
| Atomic commands, permissions, state and commerce | gameplay-foundation, device-operations, common-state-owner, persistent-commerce |
| Dialogue and context | conversation-structure, unified-conversations, world-conversations |
| Communication and acknowledgments | communication, device-acknowledgment, device-reply-routing |
| All-scene ordinary content and actors | scene-batch, actor-entities |
| All-scene device definitions and representative typed forms | general-device-sources, general-device-forms, general-device-save |
| Source service, bundles and recovery | authoring-save, public-document-bundle, source-removal, public-editor-build |
| Physical inputs, deadlines and source workflows | native-inputs, native-workflow-phases, parallel-deadlines, scene-domains-save and scene-specific workflow checks |
| World, transport and scene creation | scene-catalogue, all-scene-world-routes, train-ride, network-source-save |
| Rendering, animation and current pixels | all-scene-layers, scene-layers, animated-authoring, visuals |
| Private Play, lifecycle and storage | play-startup, play-storage, native-session-disposal, game-reopen-lifecycle |

These are current contracts, not completion certificates. Run the appropriate selection again
when behavior changes; use the browser fixture for raster changes and builds for packaging.
