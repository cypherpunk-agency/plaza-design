# Opening milestone workflows

Six existing cinematic milestones now dispatch ordinary system commands: home, street, flat,
slept, uplink and jacked. Their definitions and command references live in opening.json GAMEPLAY
and WORKFLOWS. They use GameplaySession and the same Game state port as scene commands; no story
flag store, save bridge, compatibility layer or second action evaluator was added.

The source commands own flags and uplink's keyring grant. The old standalone UPLINK_KEY field
and Game's direct milestone flag/reward writes are removed. The registered opening controller
retains camera/cinematic timing, acknowledgments, physical staging and its existing milestone
inputs. Its transient morning/cinematic counters are still controller state. The remaining everyday-chip/controller decisions are still separate audit work.

World → Opening → Workflows embeds the normal typed gameplay controls, plus finite selectors
for each cinematic milestone. A referenced command must exist and allow system only. Explicit
native device bindings, physical domain actions and native checkpoint policies are unavailable
in this global context. Current network vocabulary validates grants. Additional declared global
flags are available in private Play fixture controls.

Authored event handoffs use attachGameplayHandoffs. A delayed command uses the current scene's
existing pausable model scheduler at the time it is scheduled; leaving a scene retains that
scheduler's existing off-screen policy. Session disposal cancels pending callbacks. Delayed
commits persist through the normal Game Save path. New-game handover and Stop dispose the old
story session. Non-save story declarations are excluded from current Save serialization.

Opening phase-role flags now support a coherent typed rename rather than protecting their old
spelling as a saved-format identity. The shared source transaction updates declarations, commands,
phase predicates, resume rules, level flags, actual scene/companion/world refs and fixture flags.
It changes no player Save and introduces no alias/migration map. A role must still reference a
declared distinct flag. Native before-phase appearance is an authored boolean, and the two
original developer-level bookmark IDs are no longer an artificial minimum catalogue. Default
phase/timing comparisons remain unchanged. Additional global declared flags can also be selected
by the world-access and Play-fixture controls.
