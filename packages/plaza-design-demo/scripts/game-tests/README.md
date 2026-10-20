# Current game tests

Run from packages/plaza-design-demo:

```sh
pnpm test:game --list
pnpm test:game conversation
pnpm test:game scene-batch common-state-owner
pnpm test:game
```

Selectors match filenames; multiple selectors form a union. With no selectors, all current checks
run in separate processes with three workers. Checks use isolated scratch source stores. Logs and
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
