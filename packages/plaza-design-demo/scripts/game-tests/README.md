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
pnpm test:game:visuals
```

Open the printed loopback URL in a Chromium browser and wait for `COMPARE 24/24`. It renders
all 19 scene compositions plus four night/rain views and one reduced-motion/hack view using the
current native preview and bundled IBM Plex Mono fonts, at 640x360. Pixel equality is strict;
font rasterization/browser/platform differences may need investigation. The page reports differing
pixel counts and saves disposable results. It never updates expected images in compare mode.

For an intentional appearance change, inspect the change and run:

```sh
pnpm test:game:visuals --accept
```

That explicit mode writes PNG expectations under `fixtures/visuals/`; review those image changes
in Git. Stop the server with Ctrl+C, restart without `--accept`, and rerun comparison. Do not
accept a failed image merely to make a check green. Expectations are current approved rendering,
not an executable older renderer. Test inputs live alongside the current browser fixture.

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
