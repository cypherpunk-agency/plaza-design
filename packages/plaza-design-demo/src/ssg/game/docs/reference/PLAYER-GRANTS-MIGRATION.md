# Shared player grants

Ordinary commands use the existing atomic transaction engine:

- `{ "grant": { "keyring": "glove.right" } }` adds a registered key once.
- `{ "grant": { "ability": "jump" } }` enables the existing jump ability once.
- `{ "grant": { "controlled": "0x2F" } }` adds the exact registered Registry label once.

The draft updates the existing `player` view; the single Game state port commits to `Save.keyring`, `Save.jump`, and `Save.controlled`. Handle, tokens, flags, items, and scalar blocks retain their existing ownership. Missing player fields or unknown grant metadata refuse the entire transaction. Read/quote/eligibility never grant anything. Existing player conditions observe new grants inside the same transaction and its reactions.

Registry labels come from the prospective network's `networks[].machines[].node`, including pending edits. Keyring metadata comes from the complete prospective network/scene keyring. Abilities currently contain only the existing engine ability `jump`; legs.so is not a network ProgramData entry. No saved shadow flags, aliases, or alternate reward store are introduced.

Committed grant records are distinct from authored events and are delivered in source action order after the whole transaction commits. Repeated grants create no additional grant record. Keyring grants retain their existing metadata caption. Jump and Registry control use explicit authored responses, preserving their original wording and causal feedback receipt without adding another automatic line.

## Migrated ordinary input

Downtown's `box/legs.so/install` STORE action now selects authored commands and replies. First use enables jump and emits the existing install goal. Repeats keep the existing dim response. Native sector access, lockouts, and signal eligibility remain authoritative. The replaced `legs.install` effect and its native on.install steps are removed.

## Remaining input contracts

The grant primitive does not itself migrate Registry acquisition:

1. Box and relay acquisition are called by successful GUARD `guard.do` steps. Shared native verb bindings currently support ACT/SENSE/STORE, so a generic guarded-success/shared-command input remains necessary. It must preserve authentication, guard.ok/control/unseal ordering and specify atomic refusal/retry behavior.
2. Billboard acquisition occurs inside its physical delayed trend callback. Its shared system-command input must preserve the feed check, first-acquisition guard, `tv.trend` then control response, and cancellation/timing ownership.
3. The old control response displays `42 + controlled.length`. Moving that response requires a shared draft-derived display value; this batch deliberately adds no unused player-stat or base-node state.

`node.control`, its delayed peer notice, and the billboard's physical callback remain explicit native work until those contracts are implemented. They are not claimed as migrated by the new grant actions.

## Verification

`check-player-grants.mts` exercises atomic grant/reaction/repeat/refusal behavior, actual Game root commits/current save reload, and 16 immutable original legs STORE histories over jump/access/lock/signal states. `check-player-grants-save.mts` covers the actual typed ability and pending Registry-label pickers, strict prospective references, bundle/history/source Save, fresh saved shipping imports, and byte-exact Undo.
