# Shop ordinary source ownership

Shop has no native purchase algorithm or hardcoded purchase/state/item dependency.
Its drawing consumes actor and composition sources. The scene factory compiles
ordinary interactions through the same shared scene compiler as other scenes.

The former scene-specific guards pinned the four original goods, purchase and
cursor IDs, four commands, route order and unconditional rotation. Those guards
are removed. Current shared gameplay and scene validation own purchase references,
command invocation permissions, cursor schema, item references and ordered routes.
Source authors can rebind a Shop purchase, change its catalogue and price, choose
another cursor, replace commands and remove unused original content. Conditional
or nonrotating interactions use the existing shared contracts. No new evaluator,
state owner, native operation or source fallback is introduced.

The canonical scene/gameplay JSON is unchanged. The immutable original Shop engine
and current engine are compared across 48 histories of 12 attempts: four starting
cursors, three token counts, two initial inventory counts and both bought flags.
The comparison covers exact response pages, tokens, items, flags, cursor and a
mid-history serialization/reload. The existing metadata/geometry hash, twelve
cyclic purchases and thirty-six insufficient-funds attempts also remain covered.

`check-shop-source-owned.mts` uses actual gameplay and scene editor callbacks to
copy the purchase, create and bind a new cursor, replace the goods with tea/water,
set price three, create a replacement command, rebind routes and remove all original
commands, invoice, cursor, goods and bought flag. It exercises conditional ordered
routes through the normal rotation toggle. A second authored variant removes the
interaction and all replacement purchase content through actual controls.

The test proves current pending quote/charge, alternating goods, refusal without
mutation and persisted rotation after reload. Portable bundles, source history,
protected paired Save, invalid-reference atomic rejection, fresh shipping imports
of both replacement and deletion variants and exact byte Undo complete the proof.
Existing generated actor-chatter cursors remain separate source-derived content;
removing the purchase does not remove those conversations or actors.

Prices, goods, stock and modifiers remain defined by shared purchases. The same
purchase reference can supply the prompt quote and the route's charge. This slice
adds no Shop-only restriction on authored route choice and leaves generic runtime
source authorization in place.
