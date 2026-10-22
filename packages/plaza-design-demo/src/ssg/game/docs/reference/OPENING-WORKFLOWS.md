# Opening milestone workflows

A milestone is a name in `WORKFLOWS` (story/opening.json) for a system command of the story's own `GAMEPLAY` document. The shipped ones are
`home` (a new game), `street`, `flat`, `slept`, `uplink` and `jacked`. They dispatch through GameplaySession and the same Game state port as
scene commands; there is no story flag store, save bridge, compatibility layer or second action evaluator. The commands own the flags and
uplink's keyring grant. `home` is required (a new game runs it); a second timeline adds its own milestones in Game opening › Workflows.

Cues name milestones. A gate, an acknowledgment, a card or a trigger lists cues (`milestone`, `say`, `print`, `sound`, `stage`, `counter`,
`advance`; see ENGINE-HANDBOOK "a story timeline"); `{milestone: "uplink"}` runs the command bound to `uplink`, persists and refreshes the HUD,
and a refused one ends the list. Cameras, cinematics and physical staging that the opening used to keep in a controller are now:

- the Train's `home` run: a phase `ride` on the Train scene (a path of the Train mover);
- the turnstile and the concierge: exit rules (`gate`, `acknowledge`) of the Downtown and metro scenes;
- the sleep and the morning: the `sleep` card (`CARDS`) started by the bed's story target; its `mid` cues run the `slept` milestone and
  restage the flat, its `end` cues speak the wake-up lines;
- Moth's message and uplink.so, and jacking in: `TRIGGERS` (counters, elapsed frames, quiet bubble and popup; the schematic open on the PC).

Counters (`morning.tries`, `morning.last`, ...) are numbers the source names; a chip or react-exit adds to them through `cues`. They belong to
the game loop and are cleared with the story's transitions (a new game, a restart); they are not saved.

World › Game opening › Workflows embeds the normal typed gameplay controls plus the milestone bindings. A referenced command must exist and
allow system only. Explicit native device bindings, physical domain actions and native checkpoint policies are unavailable in this global
context. Current network vocabulary validates grants.

Authored event handoffs use attachGameplayHandoffs. A delayed command uses the current scene's existing pausable model scheduler at the time it
is scheduled; leaving a scene retains that scheduler's existing off-screen policy. Session disposal cancels pending callbacks. Delayed commits
persist through the normal Game Save path. New-game handover and Stop dispose the old story session. Non-save story declarations are excluded
from current Save serialization.

Opening phase-role flags support a coherent typed rename. The shared source transaction updates declarations, commands, phase predicates,
resume rules, level flags, wash and arrival flag references, actual scene/companion/world refs and fixture flags. It changes no player Save and
introduces no alias/migration map. A role must still reference a declared distinct flag.
