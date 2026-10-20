# Source-bound player membership and Registry grants

`grant.controlled` and a player's `controlled` or `keyring` membership condition
accept the existing `ScalarRead` expression as an alternative to a literal
string. Keyring grant actions retain their existing literal key ID contract.
Both the freshness condition and the grant can reference one label query, so the
scene's existing `node.box` text stays authoritative.

The session resolves a grant against the same transaction draft and readonly
context used by other expressions. A preceding state assignment is visible to a
following grant, and reactions see newly controlled nodes. Missing or nonstring
reads make membership unknown even under `not`; an invalid grant refuses the
whole transaction without resource, event, history or reward notifications.
The runtime still requires the resolved target to belong to the actual canonical
Registry metadata.

Prospective cross-document validation inspects finite possible target strings
from literal reads, nonnullable enum declarations, label queries and finite
select branches. Every possible controlled target must exist in the prospective
network. Arbitrary string state and nonfinite query ranges cannot supply
controlled rewards. This inspection does not execute conditions or maintain a
second target registry. Label queries read the actual prospective scene text
owner; edited labels and deletions therefore validate together with commands.
Registered gameplay document IDs are associated through the existing scene
source identity. Dynamic references in unassociated standalone library documents
are rejected rather than bypassing metadata validation.

Typed controls retain the literal Registry picker and member text field, adding
literal/state/query source selection with string source filtering. Edits still
pass the same complete source validators.