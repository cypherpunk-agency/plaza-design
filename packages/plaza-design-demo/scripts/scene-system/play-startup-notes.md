# Private Play startup observations

`authoring/play-workbench.ts` assigns the final runtime URL before inserting the opaque iframe. It records parent-observable startup phases through `authoring/play-startup.ts`, shown in **Debug -> Play startup**. The sandbox remains exactly `allow-scripts`; source-window checks remain in place.

Observed stages are fonts, requested navigation, iframe load, runtime ready, snapshot delivered and game running. After 15 seconds the status names the acknowledgement still missing. Waiting never replaces a frame or replays the snapshot. Stop/Reset/disposal invalidate old callbacks, cancel the timer and remove the old realm. Only the first ready message receives the starting snapshot.

An iframe `load` event is an observation, not proof that its HTML, external script or game initialized successfully. The parent cannot inspect opaque-origin DOM. A served HTML response with no game-script request lies before the current external script's error banner can report anything. The source-order change is preventative; it is not a demonstrated explanation for that browser symptom.

A tiny trusted head bootstrap now runs immediately after the CSP meta and before CSS or the external runtime. Its exact UTF-8 bytes receive one SHA-256 CSP allowance; scripts do not gain `unsafe-inline`, `unsafe-eval`, extra origins or sandbox permissions. It reports parser start, DOM parsing completion, external runtime evaluation/load, script resource failures, CSP violations and global errors/rejections. Script failures also use the existing error channel. The external bundle's complete initialization is guarded against duplicate inclusion, and its diagnostic fallback still reports when no head probe was observed.

The parent accepts observations only from the active frame window on the existing channel and validates known stage names/string details. Probe messages never deliver source state or start/retry a game. After parser start but before external execution, the wait names the runtime script; after execution but before ready, it names runtime readiness. Absence of a parser-start observation after a server HTML response still does not establish why the browser has not committed or parsed that response.

The bootstrap/CSP test builds an isolated native Play artifact, checks the exact generated hash/allowlist and full JavaScript syntax, then executes the probe/banner with controlled browser event boundaries. This proves the generated policy and diagnostic logic; browser CSP enforcement/navigation remain separate verification.

Run the focused test from `packages/plaza-design-demo`:

```sh
pnpm exec tsx scripts/scene-system/check-play-startup.mts
pnpm exec tsx scripts/scene-system/check-play-startup-bootstrap.mts
```

It executes the real workbench mount with controlled DOM, font and clock boundaries. It checks source assignment before insertion; one-shot ready/start; distinct document/ready/running/font waits; stale messages and callbacks; superseded starts; font/clone/navigation/runtime failures; and Stop/Reset/disposal cleanup without retries or source edits. It does not establish native browser navigation reliability. Repeated real opaque-frame Play/Stop verification remains required.
